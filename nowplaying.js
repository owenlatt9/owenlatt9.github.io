/* ============================================================
   nowplaying.js — Last.fm "what I'm listening to" widget

   Load with:  <script src="nowplaying.js" defer></script>
   Requires an element with id="nowPlaying" in the page.

   The API key below is read-only. It cannot write to the
   account, cannot read anything private, and costs nothing.
   The SHARED SECRET must never appear in this file.
   ============================================================ */

(() => {
  'use strict';

  const CONFIG = {
    user: 'OwenLatt',
    apiKey: '5baa9ced3e08e15f57f843c01ab6dea9',

    variant: 'record',      // 'record' | 'strip'

    pollMs: 45000,          // how often to re-check while the tab is open
    cacheMs: 30000,         // serve from cache if fresher than this
    timeoutMs: 8000         // give up on a hung request
  };

  const ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';
  /* every Last.fm "no album art" URL contains this hash */
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';
  const CACHE_KEY = 'np:lastfm';

  const root = document.getElementById('nowPlaying');
  if (!root) return;

  let timer = 0;
  let backoff = 1;        // multiplied on rate-limit errors
  let stopped = false;    // set on unrecoverable errors (bad / suspended key)
  let lastGood = null;    // keeps the widget populated through a failed refresh

  /* ---------------- utilities ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function initials(artist) {
    return (artist || '?')
      .split(/\s+/).slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase() || '?';
  }

  function ago(uts) {
    const secs = Math.floor(Date.now() / 1000) - Number(uts);
    if (!isFinite(secs) || secs < 0) return '';
    if (secs < 90) return 'just now';
    const mins = Math.round(secs / 60);
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs === 1 ? 'an hour ago' : hrs + ' hours ago';
    const days = Math.round(hrs / 24);
    return days === 1 ? 'yesterday' : days + ' days ago';
  }

  /* Album art has three ways to fail, and all three are handled:
     1. field missing entirely          -> null here
     2. Last.fm placeholder image       -> null here
     3. URL exists but won't load       -> img onerror, see mountArt() */
  function pickArt(track) {
    const imgs = track.image || [];
    const url = (imgs[3] && imgs[3]['#text']) ||
                (imgs[2] && imgs[2]['#text']) || '';
    if (!url || url.indexOf(PLACEHOLDER) !== -1) return null;
    return url;
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || !parsed.track) return null;
      return parsed;
    } catch (e) {
      return null;   // corrupt or unavailable storage is not an error worth surfacing
    }
  }

  function writeCache(track) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), track: track }));
    } catch (e) { /* quota or private mode — caching is an optimisation, not a requirement */ }
  }

  /* ---------------- rendering ---------------- */

  function fallbackMarkup(artist) {
    return '<div class="np-fallback" aria-hidden="true">' + esc(initials(artist)) + '</div>';
  }

  /* Swap a broken <img> for the initials block. Covers dead CDN URLs,
     blocked hotlinks, and anyone running an image-blocking extension. */
  function mountArt(artist) {
    const img = root.querySelector('.np-art');
    if (!img) return;
    img.addEventListener('error', () => {
      const holder = document.createElement('div');
      holder.className = 'np-fallback';
      holder.setAttribute('aria-hidden', 'true');
      holder.textContent = initials(artist);
      if (img.parentNode) img.parentNode.replaceChild(holder, img);
    }, { once: true });
  }

  function render(track) {
    if (!track) { hide(); return; }

    const live = !!(track['@attr'] && track['@attr'].nowplaying === 'true');
    const art = pickArt(track);
    const name = track.name || 'Unknown track';
    const artist = (track.artist && track.artist['#text']) || '';
    const album = (track.album && track.album['#text']) || '';
    const url = track.url || ('https://www.last.fm/user/' + CONFIG.user);
    const when = live
      ? 'Listening now'
      : (track.date && track.date.uts ? 'Last played ' + ago(track.date.uts) : 'Recently played');

    const artMarkup = art
      ? '<img class="np-art" src="' + esc(art) + '" alt="" referrerpolicy="no-referrer">'
      : fallbackMarkup(artist);

    const label = (live ? 'Now playing: ' : 'Last played: ') + name + ' by ' + artist;

    if (CONFIG.variant === 'strip') {
      root.innerHTML =
        '<a class="np-strip' + (live ? ' is-live' : '') + '" href="' + esc(url) +
          '" target="_blank" rel="noopener" aria-label="' + esc(label) + '">' +
          artMarkup +
          '<span class="np-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
          '<span class="np-text">' +
            '<b>' + esc(name) + '</b>' +
            '<span>' + esc(artist) + (live ? '' : ' · ' + esc(when.toLowerCase())) + '</span>' +
          '</span>' +
        '</a>';
    } else {
      root.innerHTML =
        '<a class="np-record' + (live ? ' is-live' : '') + '" href="' + esc(url) +
          '" target="_blank" rel="noopener" aria-label="' + esc(label) + '">' +
          '<span class="np-disc">' + artMarkup + '</span>' +
          '<span class="np-meta">' +
            '<span class="np-badge"><span class="np-dot" aria-hidden="true"></span>' + esc(when) + '</span>' +
            '<span class="np-track">' + esc(name) + '</span>' +
            '<span class="np-artist">' + esc(artist) + '</span>' +
            (album ? '<span class="np-album">' + esc(album) + '</span>' : '') +
          '</span>' +
        '</a>';
    }

    if (art) mountArt(artist);
    root.hidden = false;
  }

  /* No data and nothing cached: show nothing at all rather than an
     error or an empty box. A missing widget reads as "not a feature";
     a broken one reads as "this site is broken". */
  function hide() {
    root.hidden = true;
    root.innerHTML = '';
  }

  /* ---------------- fetching ---------------- */

  async function fetchNowPlaying() {
    const params = new URLSearchParams({
      method: 'user.getrecenttracks',
      user: CONFIG.user,
      api_key: CONFIG.apiKey,
      format: 'json',
      limit: '1'
    });

    const controller = new AbortController();
    const killer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

    try {
      const res = await fetch(ENDPOINT + '?' + params.toString(), { signal: controller.signal });
      clearTimeout(killer);

      const data = await res.json();

      if (data && data.error) {
        handleApiError(data.error);
        return;
      }

      const track = data &&
                    data.recenttracks &&
                    data.recenttracks.track &&
                    (Array.isArray(data.recenttracks.track)
                      ? data.recenttracks.track[0]
                      : data.recenttracks.track);

      if (!track) { if (!lastGood) hide(); return; }

      backoff = 1;
      lastGood = track;
      writeCache(track);
      render(track);

    } catch (err) {
      clearTimeout(killer);
      /* Network blip, timeout, offline, blocked request. Keep whatever is
         already on screen — a stale track beats a disappearing widget. */
      if (!lastGood) hide();
    }
  }

  function handleApiError(code) {
    const n = Number(code);

    if (n === 29) {                 // rate limited
      backoff = Math.min(backoff * 2, 16);
      return;                       // keep current render, slow down
    }
    if (n === 10 || n === 26) {     // invalid key / suspended key
      stopped = true;
      clearInterval(timer);
      if (!lastGood) hide();
      console.warn('[nowplaying] Last.fm key rejected (error ' + n + '). Generate a new one at last.fm/api/accounts.');
      return;
    }
    if (n === 6) {                  // user not found
      stopped = true;
      clearInterval(timer);
      hide();
      console.warn('[nowplaying] Last.fm user "' + CONFIG.user + '" not found.');
      return;
    }
    if (!lastGood) hide();          // 8, 11, 16 etc: transient, try again next tick
  }

  /* ---------------- scheduling ---------------- */

  function tick() {
    if (stopped || document.hidden) return;
    fetchNowPlaying();
  }

  function schedule() {
    clearInterval(timer);
    if (stopped) return;
    timer = setInterval(tick, CONFIG.pollMs * backoff);
  }

  function start() {
    if (!CONFIG.apiKey || CONFIG.apiKey === 'PASTE_YOUR_API_KEY_HERE') {
      hide();
      console.warn('[nowplaying] No API key set in nowplaying.js.');
      return;
    }

    /* Paint from cache immediately so the widget is never empty on load,
       then refresh in the background if the cache is stale. */
    const cached = readCache();
    if (cached) {
      lastGood = cached.track;
      render(cached.track);
      if (Date.now() - cached.ts < CONFIG.cacheMs) {
        schedule();
        return;
      }
    } else {
      hide();
    }

    fetchNowPlaying();
    schedule();
  }

  /* Stop polling in a background tab; refresh on return. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(timer);
    } else if (!stopped) {
      fetchNowPlaying();
      schedule();
    }
  });

  start();
})();
