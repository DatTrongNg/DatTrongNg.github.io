/* Turnable 360° preview for the project card on the home page.
   A compact port of the full inspect360 viewer: drag to spin, flick to glide,
   with a floating cursor that attaches on press and keeps following the pointer
   even when dragged outside the frame. A plain click still opens the demo.
   Loads a sparse subset of frames so the home page stays light. */
(function () {
  var el = document.getElementById('proj-360');
  if (!el) return;
  var img    = document.getElementById('proj-360-img');
  var cursor = document.getElementById('proj-360-cursor');

  var FRAME_COUNT = parseInt(el.getAttribute('data-frames'), 10) || 180;
  var BASE = el.getAttribute('data-base') || 'assets/360/frame_';
  var STEP = 2;                     // preload every 2nd frame (~90 images) — light but smooth

  // --- tuning (matched to the full viewer) ---
  var DRAG_RANGE = 0.5;             // full-width drag = 180° rotation
  var VELOCITY_SCALE = 0.6;
  var MAX_VELOCITY = 0.67;          // frames/ms cap
  var MIN_FLICK_VELOCITY = 0.015;
  var VELOCITY_WINDOW_MS = 120;
  var GLIDE_MS_PER_VELOCITY = 5000;
  var MIN_GLIDE_MS = 350;
  var MAX_GLIDE_MS = 1200;
  var TAIL_CUTOFF_VELOCITY = 0.01;
  var MOVE_THRESHOLD = 4;           // px before a press counts as a drag (not a click)

  function pad4(n) { return ('000' + n).slice(-4); }

  // preload the sparse frame set
  var loaded = {};
  for (var i = 0; i < FRAME_COUNT; i += STEP) {
    (function (idx) {
      var im = new Image();
      im.src = BASE + pad4(idx) + '.jpg';
      loaded[idx] = im;
    })(i);
  }

  var currentIndex = 0;
  function setIndex(idx) {
    var n = ((idx % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    currentIndex = n;
    var snapped = (Math.round(n / STEP) * STEP) % FRAME_COUNT;
    if (loaded[snapped]) img.src = loaded[snapped].src;
  }

  // --- inertia: velocity-matched ease-out glide ---
  var inertiaRaf = null;
  function startInertia(velocity) {
    cancelInertia();
    var duration = Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, Math.abs(velocity) * GLIDE_MS_PER_VELOCITY));
    var distance = velocity * duration / 3;   // easeOutCubic f'(0)=3 → matches release speed
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
  var dragging = false, hovering = false, moved = false;
  var startX = 0, startIndex = 0, samples = [];

  function clientX(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  function placeCursor(e) {
    if (!cursor) return;
    var r = el.getBoundingClientRect();
    var x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    var y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
  }
  function showCursor() { if (cursor) cursor.classList.add('show'); }
  function hideCursor() { if (cursor) cursor.classList.remove('show'); }

  function down(e) {
    cancelInertia();
    dragging = true; moved = false; samples = [];
    startX = clientX(e); startIndex = currentIndex;
    el.classList.add('grabbing');
    showCursor();           // attach the cursor on press
  }
  function move(e) {
    if (cursor && (hovering || dragging)) placeCursor(e);
    if (!dragging) return;
    var dx = clientX(e) - startX;
    if (Math.abs(dx) > MOVE_THRESHOLD) {
      moved = true;
      el.classList.add('spun');
      if (e.cancelable) e.preventDefault();
    }
    samples.push({ x: clientX(e), t: performance.now() });
    if (samples.length > 6) samples.shift();
    var width = el.clientWidth || 1;
    var delta = (dx / width) * FRAME_COUNT * DRAG_RANGE;
    setIndex(startIndex + Math.round(delta));
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('grabbing');
    if (!hovering) hideCursor();    // keep it visible only while still over the frame
    // flick → glide
    if (samples.length >= 2) {
      var now = performance.now();
      var recent = samples.filter(function (s) { return s.t > now - VELOCITY_WINDOW_MS; });
      if (recent.length >= 2) {
        var first = recent[0], last = recent[recent.length - 1];
        var dt = last.t - first.t;
        if (dt > 0) {
          var width = el.clientWidth || 1;
          var raw = ((last.x - first.x) / dt) * (FRAME_COUNT / width) * DRAG_RANGE * VELOCITY_SCALE;
          var v = Math.sign(raw) * Math.min(Math.abs(raw), MAX_VELOCITY);
          if (Math.abs(v) > MIN_FLICK_VELOCITY) startInertia(v);
        }
      }
    }
    samples = [];
  }

  el.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  el.addEventListener('touchstart', down, { passive: true });
  el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', up);
  el.addEventListener('touchcancel', up);

  // hover state for the floating cursor
  el.addEventListener('mouseenter', function (e) { hovering = true; showCursor(); placeCursor(e); });
  el.addEventListener('mouseleave', function () { hovering = false; if (!dragging) hideCursor(); });

  // never let the browser start a native link/image drag — that's what felt buggy
  el.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // a drag should not navigate the card link; a plain click still does
  el.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
})();
