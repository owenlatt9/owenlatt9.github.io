/* ============================================================
   music-station.js — Last.fm "music station"

   Two independent halves in one section:
     - now playing / last played   (polls, stays live)
     - weekly top albums           (fetched once, cached for hours)

   Each half hides itself on failure. The whole section hides
   only when both are empty, so one dead call never leaves an
   empty box on the page.

   Load with:  <script src="music-station.js" defer></script>
   Needs:      <section id="musicStation" hidden> ... </section>
               with #npSlot and #albumSlot inside.

   The API key here is read-only. It cannot write to the
   account and cannot read anything private.
   The SHARED SECRET must never appear in this file.
   ============================================================ */

(() => {
  'use strict';

  const CONFIG = {
    user: 'OwenLatt',
    apiKey: '5baa9ced3e08e15f57f843c01ab6dea9',

    albumCount: 6,
    albumPeriod: '1month',  // overall | 7day | 1month | 3month | 6month | 12month

    nowPollMs: 45000,       // "live" needs frequent checks
    nowCacheMs: 30000,
    albumCacheMs: 6 * 60 * 60 * 1000,   // weekly charts barely move; 6h is plenty

    timeoutMs: 8000
  };

  const ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';
  const CACHE_NOW = 'np:lastfm';
  /* Key includes period + count so editing CONFIG invalidates old cached
     data instead of serving it until it expires. */
  const CACHE_ALB = 'np:lastfm:albums:' + CONFIG.albumPeriod + ':' + CONFIG.albumCount;

  const section = document.getElementById('musicStation');
  const npSlot = document.getElementById('npSlot');
  const albumSlot = document.getElementById('albumSlot');
  if (!section || !npSlot || !albumSlot) return;

  let nowTimer = 0;
  let backoff = 1;
  let stopped = false;
  let lastGoodNow = null;
  let lastGoodAlbums = null;

  /* ---------------- utilities ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function initials(name) {
    return (name || '?').split(/\s+/).slice(0, 2)
      .map((w) => w[0] || '').join('').toUpperCase() || '?';
  }

  /* Keeps the label honest if albumPeriod is ever changed. */
  function periodLabel() {
    const map = {
      '7day': 'Top albums this week',
      '1month': 'Top albums this month',
      '3month': 'Top albums, 3 months',
      '6month': 'Top albums, 6 months',
      '12month': 'Top albums this year',
      'overall': 'Top albums of all time'
    };
    return map[CONFIG.albumPeriod] || 'Top albums';
  }

  function pickArt(item) {
    const imgs = item.image || [];
    const url = (imgs[3] && imgs[3]['#text']) || (imgs[2] && imgs[2]['#text']) || '';
    if (!url || url.indexOf(PLACEHOLDER) !== -1) return null;
    return url;
  }

  /* Swap a broken <img> for an initials tile. Covers dead CDN links,
     hotlink blocking, and image-blocking extensions. */
  function guardImages(scope, labelAttr) {
    scope.querySelectorAll('img[data-guard]').forEach((img) => {
      img.addEventListener('error', () => {
        const div = document.createElement('div');
        div.className = 'np-fallback';
        div.setAttribute('aria-hidden', 'true');
        div.textContent = initials(img.getAttribute(labelAttr) || '');
        if (img.parentNode) img.parentNode.replaceChild(div, img);
      }, { once: true });
    });
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const p = JSON.parse(raw);
      return (p && p.ts && p.data) ? p : null;
    } catch (e) { return null; }
  }

  function writeCache(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: data })); }
    catch (e) { /* caching is an optimisation, not a requirement */ }
  }

  /* Section visibility is derived, never set directly by either half. */
  function syncSection() {
    const hasNow = npSlot.childElementCount > 0;
    const hasAlbums = albumSlot.childElementCount > 0;
    section.hidden = !hasNow && !hasAlbums;
    section.classList.toggle('has-albums', hasAlbums);
  }

  /* ---------------- now playing ---------------- */

  function renderNow(track) {
    if (!track) { npSlot.innerHTML = ''; syncSection(); return; }

    const live = !!(track['@attr'] && track['@attr'].nowplaying === 'true');
    const art = pickArt(track);
    const name = track.name || 'Unknown track';
    const artist = (track.artist && track.artist['#text']) || '';
    const url = track.url || ('https://www.last.fm/user/' + CONFIG.user);
    /* No timestamp when idle — the state is the message, not the clock. */
    const when = live ? 'Listening now' : 'Last played';

    const inner = art
      ? '<img class="np-art" data-guard src="' + esc(art) + '" alt="" data-artist="' + esc(artist) + '" referrerpolicy="no-referrer">'
      : '<div class="np-fallback" aria-hidden="true">' + esc(initials(artist)) + '</div>';

    npSlot.innerHTML =
      '<a class="np-record' + (live ? ' is-live' : '') + '" href="' + esc(url) + '"' +
        ' target="_blank" rel="noopener"' +
        ' aria-label="' + esc((live ? 'Now playing: ' : 'Last played: ') + name + ' by ' + artist) + '">' +
        '<span class="np-disc">' + inner + '</span>' +
        '<span class="np-meta">' +
          '<span class="np-badge"><span class="np-dot" aria-hidden="true"></span>' + esc(when) + '</span>' +
          '<span class="np-track">' + esc(name) + '</span>' +
          '<span class="np-artist">' + esc(artist) + '</span>' +
        '</span>' +
      '</a>';

    guardImages(npSlot, 'data-artist');
    syncSection();
  }

  async function fetchNow() {
    const data = await call({
      method: 'user.getrecenttracks', user: CONFIG.user, limit: '1'
    });
    if (data === 'STOP') return;

    if (!data) { if (!lastGoodNow) { npSlot.innerHTML = ''; syncSection(); } return; }

    const list = data.recenttracks && data.recenttracks.track;
    const track = Array.isArray(list) ? list[0] : list;
    if (!track) { if (!lastGoodNow) { npSlot.innerHTML = ''; syncSection(); } return; }

    lastGoodNow = track;
    writeCache(CACHE_NOW, track);
    renderNow(track);
  }

  /* ---------------- weekly albums ---------------- */

  function renderAlbums(albums) {
    if (!albums || !albums.length) { albumSlot.innerHTML = ''; syncSection(); return; }

    const items = albums.slice(0, CONFIG.albumCount).map((al) => {
      const art = pickArt(al);
      const title = al.name || '';
      const artist = (al.artist && (al.artist.name || al.artist['#text'])) || '';
      const plays = Number(al.playcount || 0);
      const url = al.url || '#';
      const label = title + ' by ' + artist + (plays ? ', ' + plays + ' plays' : '');

      const inner = art
        ? '<img data-guard src="' + esc(art) + '" alt="" data-album="' + esc(artist) + '" referrerpolicy="no-referrer">'
        : '<div class="np-fallback" aria-hidden="true">' + esc(initials(artist)) + '</div>';

      return '<li class="ms-album">' +
        '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + esc(label) + '">' +
          '<span class="ms-cover">' + inner + '</span>' +
          '<span class="ms-plays">' + (plays || '–') + '</span>' +
        '</a>' +
        '<span class="ms-tip" aria-hidden="true"><b>' + esc(title) + '</b>' + esc(artist) + '</span>' +
      '</li>';
    }).join('');

    albumSlot.innerHTML =
      '<p class="ms-albums-label">' + esc(periodLabel()) + '</p>' +
      '<ul class="ms-albums">' + items + '</ul>';
    guardImages(albumSlot, 'data-album');
    syncSection();
  }

  async function fetchAlbums() {
    const data = await call({
      method: 'user.gettopalbums',
      user: CONFIG.user,
      period: CONFIG.albumPeriod,
      limit: String(CONFIG.albumCount)
    });
    if (data === 'STOP') return;

    if (!data) { if (!lastGoodAlbums) { albumSlot.innerHTML = ''; syncSection(); } return; }

    let list = data.topalbums && data.topalbums.album;
    if (!list) { if (!lastGoodAlbums) { albumSlot.innerHTML = ''; syncSection(); } return; }
    if (!Array.isArray(list)) list = [list];   // Last.fm returns a bare object for a single result

    lastGoodAlbums = list;
    writeCache(CACHE_ALB, list);
    renderAlbums(list);
  }

  /* ---------------- shared request ---------------- */

  async function call(params) {
    if (stopped) return 'STOP';

    const qs = new URLSearchParams(
      Object.assign({ api_key: CONFIG.apiKey, format: 'json' }, params)
    );

    const controller = new AbortController();
    const killer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

    try {
      const res = await fetch(ENDPOINT + '?' + qs.toString(), { signal: controller.signal });
      clearTimeout(killer);
      const data = await res.json();

      if (data && data.error) {
        const n = Number(data.error);
        if (n === 29) {                        // rate limited: slow down, keep display
          backoff = Math.min(backoff * 2, 16);
          schedule();
          return null;
        }
        if (n === 10 || n === 26 || n === 6) { // key or user is wrong: give up entirely
          stopped = true;
          clearInterval(nowTimer);
          console.warn('[music-station] Last.fm error ' + n + ' — check the API key and username.');
          return 'STOP';
        }
        return null;                           // transient; retry next tick
      }

      backoff = 1;
      return data;

    } catch (err) {
      clearTimeout(killer);
      return null;      // offline, timeout, blocked — keep whatever is on screen
    }
  }

  /* ---------------- scheduling ---------------- */

  function schedule() {
    clearInterval(nowTimer);
    if (stopped) return;
    nowTimer = setInterval(() => {
      if (!document.hidden) fetchNow();
    }, CONFIG.nowPollMs * backoff);
  }

  function start() {
    if (!CONFIG.apiKey || CONFIG.apiKey === 'PASTE_YOUR_API_KEY_HERE') {
      section.hidden = true;
      console.warn('[music-station] No API key set in music-station.js.');
      return;
    }

    /* Paint from cache first so the section is never empty on load. */
    const cNow = readCache(CACHE_NOW);
    if (cNow) { lastGoodNow = cNow.data; renderNow(cNow.data); }

    const cAlb = readCache(CACHE_ALB);
    if (cAlb) { lastGoodAlbums = cAlb.data; renderAlbums(cAlb.data); }

    syncSection();

    /* Then refresh each half on its own cadence. */
    if (!cNow || Date.now() - cNow.ts >= CONFIG.nowCacheMs) fetchNow();
    if (!cAlb || Date.now() - cAlb.ts >= CONFIG.albumCacheMs) fetchAlbums();

    schedule();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(nowTimer);
    } else if (!stopped) {
      fetchNow();
      schedule();
    }
  });

  start();
})();