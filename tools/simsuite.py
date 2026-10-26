"""Run the Astral Expanse simulation suites from Python and dig through the results.

Wraps ``tools/simsuite.mjs`` (Node 18+). Standard library only; if pandas is
installed, ``Run.frame(...)`` returns DataFrames.

    import sys; sys.path.insert(0, "tools")   # from the repo root
    from simsuite import run, load

    r = run("trios", games=4)            # plays the suite, returns a Run
    r.summary["overall"]["winRate"]      # cumulative stats (summary.json)
    r.games[0]["checkpoints"]            # one dict per game (games.jsonl)
    r.buildings()                        # one row per building placed
    r.turns()                            # one row per turn played
    r.checkpoints()                      # one row per checkpoint
    r.cards()                            # per-card aggregates
    r.group_by("nClans")                 # win rate / influence by any game field
    r.frame("buildings")                 # pandas DataFrame (if pandas is installed)

    old = load("sim-out/trios-2026-10-26T10-00-00")   # reopen a saved run

Command line:

    python3 tools/simsuite.py trios --games 4
    python3 tools/simsuite.py solo --games 60 --out sim-out/solo-test
"""
import json
import os
import subprocess
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "tools", "simsuite.mjs")
SUITES = ("trios", "duos", "solo", "treaty", "boss", "tech", "custom")


class Run:
    """One simulation run: its games, cumulative summary and metadata."""

    def __init__(self, path):
        self.path = path
        with open(os.path.join(path, "summary.json")) as f:
            self.summary = json.load(f)
        with open(os.path.join(path, "meta.json")) as f:
            self.meta = json.load(f)
        self.games = []
        with open(os.path.join(path, "games.jsonl")) as f:
            for line in f:
                if line.strip():
                    self.games.append(json.loads(line))

    def __repr__(self):
        o = self.summary["overall"]
        return "<Run %s: %d games, win %.0f%%, median influence %s>" % (
            self.meta["suite"], len(self.games), 100 * o["winRate"], o["influence"]["p50"])

    # ---- flat row views (lists of dicts), handy for csv / pandas
    def _game_keys(self, g):
        return {"seed": g["seed"], "group": g["group"], "clans": "+".join(g["clans"]), "nClans": g["nClans"],
                "won": g["won"], "boss": g["boss"], "tech": g["tech"]}

    def game_rows(self):
        """One row per game with scalar fields and engine stats flattened (stat_*)."""
        rows = []
        for g in self.games:
            row = self._game_keys(g)
            row.update({"status": g["status"], "reason": g["reason"], "influence": g["influence"], "integrity": g["integrity"],
                        "masterwork": g["masterwork"], "integrate": g["integrate"], "diff": g["diff"], "turns": g["turns"],
                        "techs": "+".join(g["techs"]), "compacts": len(g["compacts"]),
                        "compactsBuilt": sum(1 for b in g["buildings"] if b["compact"])})
            for k, v in g["stats"].items():
                row["stat_" + k] = v
            for i, c in enumerate(g["checkpoints"]):
                row["cp%d_need" % i] = c["need"]
                row["cp%d_at" % i] = c["at"]
                row["cp%d_met" % i] = c["met"]
            rows.append(row)
        return rows

    def buildings(self):
        """One row per building on the final board, tagged with its game."""
        rows = []
        for g in self.games:
            keys = self._game_keys(g)
            for b in g["buildings"]:
                row = dict(keys)
                row.update(b)
                rows.append(row)
        return rows

    def turns(self):
        """One row per turn (needs a run made without --no-turns)."""
        rows = []
        for g in self.games:
            keys = self._game_keys(g)
            for t in g.get("turnLog") or []:
                row = dict(keys)
                row.update(t)
                row["handCards"] = "+".join(t["handCards"])
                rows.append(row)
        return rows

    def checkpoints(self):
        rows = []
        for g in self.games:
            keys = self._game_keys(g)
            for i, c in enumerate(g["checkpoints"]):
                row = dict(keys)
                row.update(c)
                row["index"] = i
                rows.append(row)
        return rows

    def cards(self):
        """Per-card aggregates from summary.json, one row per card id."""
        return [dict(id=k, **v) for k, v in self.summary["cards"].items()]

    # ---- quick aggregates without pandas
    def group_by(self, key, games=None):
        """Win rate and influence grouped by a game field, or by a function of the game."""
        groups = defaultdict(list)
        for g in games if games is not None else self.games:
            k = key(g) if callable(key) else g[key]
            for kk in (k if isinstance(k, list) else [k]):
                groups[kk].append(g)
        out = {}
        for k, gs in sorted(groups.items(), key=lambda kv: str(kv[0])):
            inf = sorted(g["influence"] for g in gs)
            out[k] = {"games": len(gs), "winRate": round(sum(g["won"] for g in gs) / len(gs), 3),
                      "influenceMean": round(sum(inf) / len(inf), 1), "influenceP10": inf[int(len(inf) * 0.1)],
                      "influenceP50": inf[len(inf) // 2]}
        return out

    def frame(self, view="games"):
        """A pandas DataFrame of games | buildings | turns | checkpoints | cards."""
        import pandas as pd  # optional dependency
        rows = {"games": self.game_rows, "buildings": self.buildings, "turns": self.turns,
                "checkpoints": self.checkpoints, "cards": self.cards}[view]()
        return pd.DataFrame(rows)

    def to_csv(self, view, path):
        """Write a flat view to CSV with the standard library."""
        import csv
        rows = {"games": self.game_rows, "buildings": self.buildings, "turns": self.turns,
                "checkpoints": self.checkpoints, "cards": self.cards}[view]()
        fields = []
        for r in rows:
            for k in r:
                if k not in fields:
                    fields.append(k)
        with open(path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for r in rows:
                w.writerow({k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in r.items()})
        return path


def run(suite, out=None, quiet=True, **options):
    """Play a suite and return its Run. Options map to CLI flags:
    games, diff, turns, seed, look, hexes, techs, workers, clans (list),
    extra_events (bool), no_turns (bool)."""
    if suite not in SUITES:
        raise ValueError("suite must be one of %s" % (SUITES,))
    args = ["node", SCRIPT, suite]
    for k, v in options.items():
        flag = "--" + k.replace("_", "-")
        if isinstance(v, bool):
            if v:
                args.append(flag)
        elif v is not None:
            args += [flag, ",".join(v) if isinstance(v, (list, tuple)) else str(v)]
    if out is None:
        out = os.path.join(ROOT, "sim-out", "%s-py-%d" % (suite, os.getpid()))
    args += ["--out", out]
    if quiet:
        args.append("--quiet")
    proc = subprocess.run(args, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
    if proc.returncode != 0:
        raise RuntimeError("simsuite failed:\n" + proc.stderr)
    if not quiet:
        print(proc.stdout, end="")
    return load(out)


def load(path):
    """Reopen a saved run directory."""
    return Run(path)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in SUITES:
        print(__doc__)
        sys.exit(2)
    proc = subprocess.run(["node", SCRIPT] + sys.argv[1:], cwd=ROOT)
    sys.exit(proc.returncode)
