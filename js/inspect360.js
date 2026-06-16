/* Standalone 360° rotation viewer — vanilla port of the Carviz dashboard viewer.
   Drag to rotate; release with a flick to glide (velocity-matched ease-out). */
(function () {
  var FRAME_COUNT = 180;
  var BASE = 'assets/360/frame_';

  // --- tuning (ported from the production Vue viewer) ---
  var DRAG_RANGE = 0.5;             // full-width drag = 180° rotation
  var VELOCITY_SCALE = 0.6;         // fraction of release velocity carried into the glide
  var MAX_VELOCITY = 0.67;          // frames/ms cap
  var MIN_FLICK_VELOCITY = 0.015;   // below this, no glide
  var VELOCITY_WINDOW_MS = 120;     // samples newer than this define release velocity
  var GLIDE_MS_PER_VELOCITY = 5000; // glide duration scales with flick speed, clamped below
  var MIN_GLIDE_MS = 350;
  var MAX_GLIDE_MS = 1200;
  var TAIL_CUTOFF_VELOCITY = 0.01;  // stop the glide once slower than this (avoids stutter tail)
  var PLAYBACK_FPS = 30;

  function pad4(n) { return ('000' + n).slice(-4); }
  function frameURL(i) { return BASE + pad4(i) + '.jpg'; }

  var stage    = document.getElementById('v360-stage');
  var img      = document.getElementById('v360-img');
  var loader   = document.getElementById('v360-loader');
  var barFill  = document.getElementById('v360-bar-fill');
  var count    = document.getElementById('v360-count');
  var hint     = document.getElementById('v360-hint');
  var controls = document.getElementById('v360-controls');
  var playBtn  = document.getElementById('v360-play');
  var resetBtn = document.getElementById('v360-reset');
  var frameLbl = document.getElementById('v360-frame');
  if (!stage) return;

  var images = [];          // preloaded Image objects
  var loadedCount = 0;
  var ready = false;
  var currentIndex = 0;

  var isDragging = false;
  var dragStartX = 0;
  var dragStartIndex = 0;
  var samples = [];         // {x, t} during drag

  var inertiaRaf = null;
  var playTimer = null;
  var isPlaying = false;

  // --- preload ---
  for (var i = 0; i < FRAME_COUNT; i++) {
    (function (idx) {
      var im = new Image();
      im.onload = im.onerror = onFrameLoaded;
      im.src = frameURL(idx);
      images[idx] = im;
    })(i);
  }

  function onFrameLoaded() {
    loadedCount++;
    var pct = Math.round((loadedCount / FRAME_COUNT) * 100);
    if (barFill) barFill.style.width = pct + '%';
    if (count) count.textContent = loadedCount + ' / ' + FRAME_COUNT;
    if (loadedCount >= FRAME_COUNT && !ready) {
      ready = true;
      if (loader) loader.classList.add('hidden');
      setIndex(0);
      setTimeout(function () { if (hint) hint.classList.add('hidden'); }, 4000);
    }
  }

  function setIndex(idx) {
    var n = ((idx % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    currentIndex = n;
    img.src = images[n].src;
    if (frameLbl) frameLbl.textContent = (n + 1) + ' / ' + FRAME_COUNT;
  }

  // --- inertia: velocity-matched ease-out glide ---
  function startInertia(velocity) {
    cancelInertia();
    // easeOutCubic f(p)=1-(1-p)^3 has f'(0)=3, so distance = v*T/3 matches release speed
    var duration = Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, Math.abs(velocity) * GLIDE_MS_PER_VELOCITY));
    var distance = velocity * duration / 3;
    var startIndex = currentIndex;
    var startTime = performance.now();
    function tick() {
      var p = Math.min(1, (performance.now() - startTime) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      setIndex(Math.round(startIndex + distance * eased));
      var speed = Math.abs(distance) * 3 * Math.pow(1 - p, 2) / duration;
      if (p >= 1 || speed < TAIL_CUTOFF_VELOCITY) { inertiaRaf = null; return; }
      inertiaRaf = requestAnimationFrame(tick);
    }
    inertiaRaf = requestAnimationFrame(tick);
  }

  function cancelInertia() {
    if (inertiaRaf) { cancelAnimationFrame(inertiaRaf); inertiaRaf = null; }
  }

  // --- pointer ---
  function clientX(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  function onDown(e) {
    if (!ready) return;
    cancelInertia();
    stopPlay();
    samples = [];
    isDragging = true;
    dragStartX = clientX(e);
    dragStartIndex = currentIndex;
    if (hint) hint.classList.add('hidden');
    stage.classList.add('grabbing');
  }

  function onMove(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    var x = clientX(e);
    samples.push({ x: x, t: performance.now() });
    if (samples.length > 6) samples.shift();
    var width = stage.clientWidth || 1;
    var delta = ((x - dragStartX) / width) * FRAME_COUNT * DRAG_RANGE;
    setIndex(dragStartIndex + Math.round(delta));
  }

  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    stage.classList.remove('grabbing');
    if (samples.length >= 2) {
      var now = performance.now();
      var recent = samples.filter(function (s) { return s.t > now - VELOCITY_WINDOW_MS; });
      if (recent.length >= 2) {
        var first = recent[0], last = recent[recent.length - 1];
        var dt = last.t - first.t;
        if (dt > 0) {
          var width = stage.clientWidth || 1;
          var raw = ((last.x - first.x) / dt) * (FRAME_COUNT / width) * DRAG_RANGE * VELOCITY_SCALE;
          var v = Math.sign(raw) * Math.min(Math.abs(raw), MAX_VELOCITY);
          if (Math.abs(v) > MIN_FLICK_VELOCITY) startInertia(v);
        }
      }
    }
    samples = [];
  }

  stage.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  stage.addEventListener('touchstart', onDown, { passive: true });
  stage.addEventListener('touchmove', onMove, { passive: false });
  stage.addEventListener('touchend', onUp);
  stage.addEventListener('touchcancel', onUp);

  // floating cursor badge on desktop
  var cursor = document.getElementById('v360-cursor');
  if (cursor) {
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      cursor.style.left = (e.clientX - r.left) + 'px';
      cursor.style.top = (e.clientY - r.top) + 'px';
    });
    stage.addEventListener('mouseenter', function () { if (ready) cursor.classList.add('show'); });
    stage.addEventListener('mouseleave', function () { cursor.classList.remove('show'); onUp(); });
  }

  // --- playback ---
  function play() {
    stopPlay();
    cancelInertia();
    isPlaying = true;
    if (playBtn) playBtn.textContent = '❚❚';
    var interval = Math.max(16, Math.round(1000 / PLAYBACK_FPS));
    playTimer = setInterval(function () { setIndex(currentIndex + 1); }, interval);
  }
  function stopPlay() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    isPlaying = false;
    if (playBtn) playBtn.textContent = '▶';
  }
  if (playBtn) playBtn.addEventListener('click', function () { isPlaying ? stopPlay() : play(); });
  if (resetBtn) resetBtn.addEventListener('click', function () { stopPlay(); cancelInertia(); setIndex(0); });

  // --- keyboard ---
  window.addEventListener('keydown', function (e) {
    if (!ready) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); cancelInertia(); stopPlay(); setIndex(currentIndex - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); cancelInertia(); stopPlay(); setIndex(currentIndex + 1); }
    else if (e.key === ' ') { e.preventDefault(); isPlaying ? stopPlay() : play(); }
  });
})();
