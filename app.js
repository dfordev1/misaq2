/* Shared behaviour: language state, data loading, SVG inlining, grid, lightbox.
   Urdu SVGs must be inlined into the DOM rather than used as <img src>, because
   Chrome blocks the external @font-face inside an <img>-referenced SVG. */
const CT = (function () {
  let _data = null, _intro = null;
  const svgCache = new Map();

  // ?lang=ur wins over the stored preference and persists it, so a link can
  // open the site straight into Urdu.
  const _q = new URLSearchParams(location.search).get('lang');
  if (_q === 'ur' || _q === 'en') {
    try { localStorage.setItem('ct-lang', _q); } catch (e) {}
  }
  function lang() {
    if (_q === 'ur' || _q === 'en') return _q;
    try { return localStorage.getItem('ct-lang') === 'ur' ? 'ur' : 'en'; }
    catch (e) { return 'en'; }
  }
  function setLang(v) {
    try { localStorage.setItem('ct-lang', v); } catch (e) {}
    // Drop any ?lang= from the URL, or it would override the new choice.
    const u = new URL(location.href);
    u.searchParams.delete('lang');
    location.replace(u.toString());
  }

  async function data() {
    if (!_data) _data = await (await fetch('data/diagrams.json')).json();
    return _data;
  }
  async function intro() {
    if (!_intro) _intro = await (await fetch('data/intro.json')).json();
    return _intro;
  }

  // Which language's asset exists for this item, honouring the current toggle.
  function variant(item) {
    const l = lang();
    if (l === 'ur' && item.ur !== false) return 'ur';
    if (item.en === false) return 'ur';
    return 'en';
  }

  async function svg(id, v) {
    const key = v + '/' + id;
    if (!svgCache.has(key)) {
      svgCache.set(key, fetch('svg/' + key + '.svg').then(r => r.ok ? r.text() : ''));
    }
    return svgCache.get(key);
  }

  async function inject(host, id, v) {
    const txt = await svg(id, v);
    if (!txt) { host.textContent = ''; return; }
    host.innerHTML = txt;
    const el = host.querySelector('svg');
    if (el) { el.removeAttribute('width'); el.removeAttribute('height'); }
  }

  function title(item) {
    return (lang() === 'ur' ? item.title_ur : item.title_en) ||
           item.title_en || item.title_ur || item.id;
  }
  function domain(item) {
    return (lang() === 'ur' ? item.domain_ur : item.domain_en) || '';
  }
  function caption(item) {
    return (lang() === 'ur' ? item.caption_ur : item.caption_en) ||
           item.caption_en || item.caption_ur || '';
  }

  // Lazily inline each card's SVG only as it scrolls into view — 316 inline
  // SVGs at once is a lot of DOM.
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const t = e.target;
      inject(t, t.dataset.id, t.dataset.v);
    });
  }, { rootMargin: '400px' });

  let _list = [];
  function renderGrid(host, items) {
    _list = items;
    host.innerHTML = '';
    if (!items.length) {
      host.innerHTML = '<p class="empty">Nothing matches that search.</p>';
      return;
    }
    items.forEach((it, i) => {
      const v = variant(it);
      const card = document.createElement('article');
      card.className = 'card';
      card.tabIndex = 0;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.dataset.id = it.id;
      thumb.dataset.v = v;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const dom = document.createElement('span');
      dom.className = 'dom';
      dom.textContent = domain(it);
      const h = document.createElement('h3');
      h.textContent = title(it);
      meta.append(dom, h);
      if (it.citation) {
        const c = document.createElement('div');
        c.className = 'cite';
        c.textContent = it.citation;
        meta.appendChild(c);
      }
      if (v === 'ur') { h.classList.add('ur'); dom.classList.add('ur'); }
      card.append(thumb, meta);
      const open = () => lightbox(i);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
      host.appendChild(card);
      io.observe(thumb);
    });
  }

  let lbEl = null, lbIdx = 0;
  function ensureLb() {
    if (lbEl) return lbEl;
    lbEl = document.createElement('div');
    lbEl.className = 'lb';
    lbEl.innerHTML =
      '<div class="lbbox"><button class="lbclose" aria-label="Close">&times;</button>' +
      '<div class="fig"></div><div class="lbnav"><button data-p>&larr; Prev</button>' +
      '<span data-i></span><button data-n>Next &rarr;</button></div></div>';
    document.body.appendChild(lbEl);
    lbEl.addEventListener('click', e => { if (e.target === lbEl) close(); });
    lbEl.querySelector('.lbclose').addEventListener('click', close);
    lbEl.querySelector('[data-p]').addEventListener('click', () => lightbox(lbIdx - 1));
    lbEl.querySelector('[data-n]').addEventListener('click', () => lightbox(lbIdx + 1));
    document.addEventListener('keydown', e => {
      if (!lbEl.classList.contains('on')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') lightbox(lbIdx - 1);
      if (e.key === 'ArrowRight') lightbox(lbIdx + 1);
    });
    return lbEl;
  }
  function close() { lbEl.classList.remove('on'); document.body.style.overflow = ''; }

  function lightbox(i) {
    if (i < 0 || i >= _list.length) return;
    lbIdx = i;
    const el = ensureLb();
    const it = _list[i];
    el.classList.add('on');
    document.body.style.overflow = 'hidden';
    inject(el.querySelector('.fig'), it.id, variant(it));
    el.querySelector('[data-i]').textContent = (i + 1) + ' / ' + _list.length;
    el.querySelector('[data-p]').disabled = i === 0;
    el.querySelector('[data-n]').disabled = i === _list.length - 1;
  }

  // Urdu strings for the interface chrome. Keyed by the English text so pages
  // stay readable with no markup ceremony.
  const UI = {
    'Home': 'سرورق', 'Diagrams': 'خاکے', 'Method': 'منہج', 'Tafsīr': 'تفسیر',
    'Quiz': 'آزمائش', 'Study': 'مطالعہ', 'Downloads': 'ڈاؤن لوڈ',
    'Lexicon': 'لغت', 'Hadith': 'حدیث',
    'All domains': 'تمام میدان', 'All axes': 'تمام محور',
    'Introduction diagrams': 'تعارفی خاکے',
    'Search titles, captions, citations…': 'عنوان، وضاحت یا حوالہ تلاش کریں…',
    'Allah & humanity (Alast)': 'اللہ و انسانیت (الست)',
    'Allah & prophets': 'اللہ و انبیاء',
    'Scripture communities': 'اہلِ کتاب',
    'Political & communal': 'سیاسی و اجتماعی',
    'Interpersonal': 'باہمی معاملات',
    'Eschatological': 'اخروی جواب دہی',
  };
  function t(s) { return lang() === 'ur' ? (UI[s] || s) : s; }
  function plural(n) {
    return lang() === 'ur' ? n + ' خاکے'
                           : n + (n === 1 ? ' diagram' : ' diagrams');
  }

  function localizeChrome() {
    if (lang() !== 'ur') return;
    document.querySelectorAll('nav.main a').forEach(a => { a.textContent = t(a.textContent.trim()); });
    document.querySelectorAll('select option').forEach(o => { o.textContent = t(o.textContent.trim()); });
    const q = document.getElementById('q');
    if (q) { q.placeholder = t(q.placeholder); q.style.direction = 'rtl'; q.classList.add('ur'); }
    document.querySelectorAll('select').forEach(s => s.classList.add('ur'));
  }

  // Header language toggle, injected on every page.
  function mountToggle() {
    const nav = document.querySelector('nav.main');
    if (!nav) return;
    const box = document.createElement('div');
    box.className = 'langtog';
    box.innerHTML = '<button data-l="en">EN</button><button data-l="ur">اردو</button>';
    box.querySelectorAll('button').forEach(b => {
      if (b.dataset.l === lang()) b.classList.add('on');
      b.addEventListener('click', () => { if (b.dataset.l !== lang()) setLang(b.dataset.l); });
    });
    nav.after(box);
  }
  document.addEventListener('DOMContentLoaded', () => { mountToggle(); localizeChrome(); });

  return { lang, setLang, data, intro, renderGrid, inject, title, domain, caption,
           variant, lightbox, t, plural, localizeChrome };
})();
