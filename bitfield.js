/* ============================================================
   bitfield.js — interactive 0/1 background for the hero
   Drop into your site root and load with:
     <script src="bitfield.js" defer></script>
   Requires an element with id="bitField" in the page.
   ============================================================ */

(() => {
  'use strict';

  /* ---- your settings. change these, nothing else. ---- */
  const CONFIG = {
    // 'soft' | 'caret' | 'spinner' | 'pop'
    flipStyle: 'soft',

    cell: 30,          // px — grid cell size
    fontSize: 17,      // px
    ambientRate: 25,   // flips per second across the whole field
    animSpeed: 70,     // ms per frame for caret / spinner styles
    startOnesRatio: 0.12,  // fraction of cells that begin as 1

    // Colors and the settle duration live in styles.css as
    // --bit-off, --bit-lit and --bit-settle, so dark mode is handled there.
  };

  const field = document.getElementById('bitField');
  if (!field) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CHARS = ['0', '1'];
  const SPINNER = ['|', '/', '-', '\\'];
  const CARET = '\u258C';   // ▌

  let cols = 0, rows = 0;
  let cells = [], vals = [];
  let lastCell = -1;
  let ambientTimer = 0;
  let visible = false;

  /* ---------- build ---------- */

  function build() {
    const r = field.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;

    cols = Math.max(6, Math.floor(r.width / CONFIG.cell));
    rows = Math.max(4, Math.floor(r.height / CONFIG.cell));

    field.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    field.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';
    field.style.fontSize = CONFIG.fontSize + 'px';

    // tear down cleanly so repeated builds don't leak timers
    cells.forEach(clearCellTimers);
    field.textContent = '';
    cells = [];
    vals = [];

    const frag = document.createDocumentFragment();
    for (let i = 0; i < cols * rows; i++) {
      const el = document.createElement('b');
      const v = Math.random() < CONFIG.startOnesRatio ? 1 : 0;
      vals.push(v);
      el.textContent = CHARS[v];
      frag.appendChild(el);
      cells.push(el);
    }
    field.appendChild(frag);
    lastCell = -1;
  }

  function clearCellTimers(el) {
    if (!el) return;
    if (el._t) { clearTimeout(el._t); el._t = 0; }
    if (el._spin) { clearInterval(el._spin); el._spin = 0; }
  }

  /* ---------- cursor flip ---------- */

  function flipCell(i) {
    const el = cells[i];
    if (!el) return;

    vals[i] = vals[i] ? 0 : 1;      // genuinely flips — a 1 becomes a 0
    const final = CHARS[vals[i]];

    clearCellTimers(el);
    el.classList.remove('is-ambient', 'is-pop');

    switch (CONFIG.flipStyle) {
      case 'caret':
        el.textContent = CARET;
        el.classList.add('is-lit');
        el._t = setTimeout(() => {
          el.textContent = final;
          el.classList.remove('is-lit');
        }, CONFIG.animSpeed * 2);
        break;

      case 'spinner': {
        el.classList.add('is-lit');
        let f = 0;
        el.textContent = SPINNER[0];
        el._spin = setInterval(() => {
          f++;
          if (f >= SPINNER.length) {
            clearInterval(el._spin);
            el._spin = 0;
            el.textContent = final;
            el.classList.remove('is-lit');
            return;
          }
          el.textContent = SPINNER[f];
        }, CONFIG.animSpeed);
        break;
      }

      case 'pop':
        el.textContent = final;
        el.classList.add('is-lit', 'is-pop');
        el._t = setTimeout(() => el.classList.remove('is-lit', 'is-pop'), 120);
        break;

      case 'soft':
      default:
        el.textContent = final;
        el.classList.add('is-lit');
        el._t = setTimeout(() => el.classList.remove('is-lit'), 120);
        break;
    }
  }

  /* ---------- ambient churn ---------- */

  function ambientTick() {
    if (!cells.length) return;
    const n = Math.max(1, Math.round(CONFIG.ambientRate / 10));
    for (let k = 0; k < n; k++) {
      const i = (Math.random() * cells.length) | 0;
      const el = cells[i];
      if (!el || el.classList.contains('is-lit') || el._spin) continue;  // don't fight the cursor
      el.classList.add('is-ambient');
      el._t = setTimeout(() => {
        vals[i] = vals[i] ? 0 : 1;
        el.textContent = CHARS[vals[i]];
        el.classList.remove('is-ambient');
      }, 450);
    }
  }

  function startAmbient() {
    clearInterval(ambientTimer);
    if (CONFIG.ambientRate > 0 && !reduce && visible) {
      ambientTimer = setInterval(ambientTick, 100);
    }
  }

  function stopAmbient() {
    clearInterval(ambientTimer);
    ambientTimer = 0;
  }

  /* ---------- pointer ---------- */

  let queued = false, px = -1, py = -1;

  function onMove() {
    queued = false;
    const r = field.getBoundingClientRect();
    if (!cols || !rows) return;
    const cw = r.width / cols, ch = r.height / rows;
    const cx = Math.floor(px / cw), cy = Math.floor(py / ch);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    const idx = cy * cols + cx;
    if (idx !== lastCell) {
      lastCell = idx;
      flipCell(idx);
    }
  }

  /* listen on the document, since the field itself is pointer-events: none */
  document.addEventListener('pointermove', (e) => {
    const r = field.getBoundingClientRect();
    if (e.clientY > r.bottom || e.clientY < r.top) return;   // only while over the hero
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    if (!queued) { queued = true; requestAnimationFrame(onMove); }
  }, { passive: true });

  /* ---------- lifecycle ---------- */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visible = entry.isIntersecting;
        if (visible) startAmbient(); else stopAmbient();
      });
    }, { threshold: 0 }).observe(field);
  } else {
    visible = true;
    startAmbient();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAmbient(); else startAmbient();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); startAmbient(); }, 150);
  });

  build();
  startAmbient();
})();
