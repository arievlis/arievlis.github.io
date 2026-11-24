/* Marcador de leitura do Arquivo de Estudos.
   Guarda, neste navegador, o parágrafo onde a leitura parou em cada página.
   Uso: <script src="/assets/marcador.js" defer></script> antes de </body>.
   Na página inicial, um elemento com id="continuar" recebe a lista de leituras em andamento. */
(function () {
  'use strict';
  var PREFIX = 'marcador:';
  var INDEX = 'marcadores';

  function load(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function save(key, val) { try { if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function fmt(t) {
    var d = new Date(t);
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return z(d.getDate()) + '/' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  }
  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  var css = [
    '.mk-bar{position:fixed;left:16px;bottom:16px;z-index:30;display:flex;gap:6px;align-items:center;font-family:"Spectral SC",Georgia,serif;font-size:.9rem;letter-spacing:.03em}',
    '.mk-bar button{font:inherit;display:inline-flex;align-items:center;gap:6px;color:#1f3f7a;background:#fbfaf7;border:1px solid #d8d2c4;border-radius:999px;padding:7px 14px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12)}',
    '.mk-bar button.mk-prim{background:#1f3f7a;color:#fff;border-color:#1f3f7a}',
    '.mk-bar svg{width:14px;height:14px;fill:currentColor}',
    '.mk-bar button[hidden]{display:none}',
    '@media (max-width:600px){.mk-bar .mk-lab{display:none}.mk-bar button{padding:9px 11px}.mk-bar{bottom:70px;left:12px;flex-direction:column}.mk-toast{bottom:16px}}',
    '.mk-alvo{position:relative;box-shadow:-6px 0 0 #b08a3e;background:rgba(176,138,62,.08);scroll-margin-top:90px}',
    '.mk-tag{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;font-family:"Spectral SC",Georgia,serif;font-size:.8rem;letter-spacing:.04em;color:#8a6a2a;margin:0 0 4px}',
    '.mk-tag button{font:inherit;color:#8a6a2a;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}',
    '.mk-toast{position:fixed;left:16px;bottom:64px;z-index:31;max-width:min(360px,calc(100vw - 32px));background:#fbfaf7;border:1px solid #d8d2c4;border-left:4px solid #b08a3e;border-radius:4px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,.15);font-family:Spectral,Georgia,serif;font-size:.95rem;line-height:1.4;color:#222}',
    '.mk-toast b{font-family:"Spectral SC",Georgia,serif;font-weight:600;color:#1f3f7a}',
    '.mk-toast .mk-acts{display:flex;gap:8px;margin-top:8px}',
    '.mk-toast button{font-family:"Spectral SC",Georgia,serif;font-size:.85rem;color:#1f3f7a;background:none;border:1px solid #d8d2c4;border-radius:999px;padding:4px 12px;cursor:pointer}',
    '.mk-toast button.mk-prim{background:#1f3f7a;color:#fff;border-color:#1f3f7a}',
    '@media (prefers-color-scheme:dark){.mk-bar button,.mk-toast{background:#1d1f24;color:#e8e4da;border-color:#3a3d45}.mk-bar button{color:#9db6e6}.mk-toast b,.mk-toast button{color:#9db6e6}}',
    '@media print{.mk-bar,.mk-toast,.mk-tag{display:none!important}.mk-alvo{box-shadow:none;background:none}}',
    '#continuar .mk-item{display:block;padding:10px 0;border-top:1px solid #e2ddd2;text-decoration:none;color:inherit}',
    '#continuar .mk-item:first-of-type{border-top:0}',
    '#continuar .mk-tit{font-weight:600}',
    '#continuar .mk-sub{display:block;font-size:.9em;opacity:.75}'
  ].join('\n');

  function injectCss() {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- página inicial: lista "Continuar leitura" ---------- */
  function renderHome(box) {
    var idx = load(INDEX) || {};
    var items = Object.keys(idx).map(function (k) { return idx[k]; })
      .filter(function (m) { return m && m.path && m.path !== location.pathname; })
      .sort(function (a, b) { return b.t - a.t; });
    if (!items.length) { box.hidden = true; return; }
    box.hidden = false;
    var list = box.querySelector('.mk-lista') || box;
    list.innerHTML = '';
    items.forEach(function (m) {
      var a = document.createElement('a');
      a.className = 'mk-item';
      a.href = m.path + '#marcador';
      var t = document.createElement('span'); t.className = 'mk-tit'; t.textContent = m.title || m.path;
      var s = document.createElement('span'); s.className = 'mk-sub';
      s.textContent = (m.section ? m.section + ' · ' : '') + 'marcado em ' + fmt(m.t);
      a.appendChild(t); a.appendChild(s);
      list.appendChild(a);
    });
  }

  /* ---------- páginas de texto ---------- */
  function setup() {
    var root = document.querySelector('main') || document.body;
    var SEL = 'p, li, blockquote, figure, h2, h3, h4, tr, .step';
    var key = PREFIX + location.pathname;

    function candidates() {
      return Array.prototype.filter.call(root.querySelectorAll(SEL), function (el) {
        if (el.closest('.mk-bar, .mk-toast, .mk-tag, nav, summary, .ne-bar')) return false;
        if (el.matches('.step')) return false; /* marca-se o parágrafo dentro do passo */
        if (el.querySelector('p, li, blockquote, figure, tr')) return false; /* só folhas */
        return norm(el.textContent).length > 0 && el.offsetParent !== null;
      });
    }
    function sectionOf(el) {
      var hs = root.querySelectorAll('h2, h3'), best = null;
      for (var i = 0; i < hs.length; i++) {
        if (hs[i] === el || (hs[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) best = hs[i]; else break;
      }
      return best ? norm(best.textContent).slice(0, 80) : '';
    }
    function current() {
      var list = candidates();
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.bottom > 90) return { el: list[i], i: i };
      }
      return list.length ? { el: list[list.length - 1], i: list.length - 1 } : null;
    }
    function find(m) {
      var list = candidates();
      if (m.snip) {
        for (var i = 0; i < list.length; i++) if (norm(list[i].textContent).slice(0, 60) === m.snip) return list[i];
      }
      return list[Math.min(m.i || 0, list.length - 1)] || null;
    }
    function clearVisual() {
      Array.prototype.forEach.call(document.querySelectorAll('.mk-alvo'), function (e) { e.classList.remove('mk-alvo'); });
      Array.prototype.forEach.call(document.querySelectorAll('.mk-tag'), function (e) { e.remove(); });
    }
    function show(el, m) {
      clearVisual();
      if (!el) return;
      el.classList.add('mk-alvo');
      var tag = document.createElement('div');
      tag.className = 'mk-tag';
      var lab = document.createElement('span'); lab.textContent = 'Parei aqui · ' + fmt(m.t);
      var rm = document.createElement('button'); rm.type = 'button'; rm.textContent = 'remover marcador';
      rm.onclick = function () { remove(); };
      tag.appendChild(lab); tag.appendChild(rm);
      if (el.tagName === 'TR') { var td = el.querySelector('td, th'); if (td) td.insertBefore(tag, td.firstChild); }
      else el.insertBefore(tag, el.firstChild);
    }
    function go(el) {
      if (!el) return;
      var y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
    function mark() {
      var c = current(); if (!c) return;
      var m = {
        path: location.pathname,
        title: norm(document.title).slice(0, 90),
        section: sectionOf(c.el),
        snip: norm(c.el.textContent).slice(0, 60),
        i: c.i,
        t: Date.now()
      };
      if (!save(key, m)) { alertBox('Este navegador não permite guardar o marcador (modo privado ou armazenamento bloqueado).'); return; }
      var idx = load(INDEX) || {}; idx[location.pathname] = m; save(INDEX, idx);
      show(c.el, m); refreshBar();
    }
    function remove() {
      save(key, null);
      var idx = load(INDEX) || {}; delete idx[location.pathname]; save(INDEX, idx);
      clearVisual(); refreshBar();
    }
    var toast;
    function alertBox(msg) {
      if (toast) toast.remove();
      toast = document.createElement('div'); toast.className = 'mk-toast'; toast.setAttribute('role', 'status');
      toast.textContent = msg; document.body.appendChild(toast);
      setTimeout(function () { if (toast) { toast.remove(); toast = null; } }, 5000);
    }
    function offerResume(m) {
      if (toast) toast.remove();
      toast = document.createElement('div'); toast.className = 'mk-toast'; toast.setAttribute('role', 'status');
      var p = document.createElement('div');
      var b = document.createElement('b'); b.textContent = 'Continuar de onde parou?';
      p.appendChild(b);
      p.appendChild(document.createTextNode(' ' + (m.section ? m.section + ' · ' : '') + 'marcado em ' + fmt(m.t)));
      var acts = document.createElement('div'); acts.className = 'mk-acts';
      var y = document.createElement('button'); y.type = 'button'; y.className = 'mk-prim'; y.textContent = 'ir ao marcador';
      y.onclick = function () { go(find(m)); toast.remove(); toast = null; };
      var n = document.createElement('button'); n.type = 'button'; n.textContent = 'agora não';
      n.onclick = function () { toast.remove(); toast = null; };
      acts.appendChild(y); acts.appendChild(n);
      toast.appendChild(p); toast.appendChild(acts);
      document.body.appendChild(toast);
      setTimeout(function () { if (toast) { toast.remove(); toast = null; } }, 12000);
    }

    var bar = document.createElement('div');
    bar.className = 'mk-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Marcador de leitura');
    var icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z"/></svg>';
    var bMark = document.createElement('button'); bMark.type = 'button'; bMark.className = 'mk-prim';
    bMark.innerHTML = icon + '<span class="mk-lab">Marcar aqui</span>';
    bMark.setAttribute('aria-label', 'Marcar aqui');
    bMark.title = 'Marca o parágrafo no alto da tela como o ponto onde parou';
    bMark.onclick = mark;
    var bGo = document.createElement('button'); bGo.type = 'button';
    bGo.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l1.4 1.4L8.8 10H20v2H8.8l4.6 4.6L12 18l-7-7z" transform="rotate(-90 12 12)"/></svg><span class="mk-lab">Ir ao marcador</span>';
    bGo.setAttribute('aria-label', 'Ir ao marcador');
    bGo.onclick = function () { var m = load(key); if (m) go(find(m)); };
    bar.appendChild(bMark); bar.appendChild(bGo);
    document.body.appendChild(bar);
    function refreshBar() { bGo.hidden = !load(key); var lab = load(key) ? 'Mover marcador' : 'Marcar aqui'; bMark.querySelector('.mk-lab').textContent = lab; bMark.setAttribute('aria-label', lab); }
    refreshBar();

    var saved = load(key);
    if (saved) {
      var el = find(saved);
      show(el, saved);
      setTimeout(function () {
        if (location.hash === '#marcador') { go(el); return; }
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) offerResume(saved);
      }, 400);
    }
  }

  function init() {
    injectCss();
    var box = document.getElementById('continuar');
    if (box) { renderHome(box); return; }
    setup();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
