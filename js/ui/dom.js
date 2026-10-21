// Tiny DOM helpers: element builder, bottom sheets and toasts.
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('--')) el.style.setProperty(k, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs, ...kids) {
  const el = document.createElementNS(NS, tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

let sheetStack = [];
export function sheet({ title, body, actions = [], onClose, dismissable = true }) {
  const root = document.getElementById('sheet-root');
  const close = () => {
    ov.remove();
    sheetStack = sheetStack.filter((x) => x !== ov);
    if (onClose) onClose();
  };
  const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov && dismissable) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': typeof title === 'string' ? title : 'Dialog' },
      h('div', { class: 'sh-head' }, h('h3', null, title), dismissable ? h('button', { class: 'x', 'aria-label': 'Close', onclick: close }, '✕') : null),
      h('div', { class: 'sh-body' }, body),
      actions.length ? h('div', { class: 'sh-actions' }, actions.map((a) => h('button', {
        class: 'btn ' + (a.cls || ''), disabled: a.disabled, onclick: () => { if (a.keep) return a.on && a.on(close); close(); if (a.on) a.on(); },
      }, a.label))) : null));
  root.append(ov);
  sheetStack.push(ov);
  return close;
}
export function closeSheets() {
  for (const s of sheetStack) s.remove();
  sheetStack = [];
}

export function toast(msg) {
  const root = document.getElementById('toast-root');
  while (root.children.length >= 2) root.firstChild.remove();
  const t = h('div', { class: 'toast' }, msg);
  root.append(t);
  setTimeout(() => t.remove(), 2700);
}

export function confirmSheet(title, text, yes, onYes) {
  sheet({ title, body: h('p', null, text), actions: [{ label: 'Cancel' }, { label: yes, cls: 'danger', on: onYes }] });
}
