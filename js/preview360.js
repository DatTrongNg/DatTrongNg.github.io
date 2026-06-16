/* Turnable 360° preview for the project card on the home page.
   Drag horizontally to spin the vehicle; a plain click still opens the demo.
   Loads a sparse subset of frames so the home page stays light. */
(function () {
  var el = document.getElementById('proj-360');
  if (!el) return;
  var img = document.getElementById('proj-360-img');

  var FRAME_COUNT = parseInt(el.getAttribute('data-frames'), 10) || 180;
  var BASE = el.getAttribute('data-base') || 'assets/360/frame_';
  var STEP = 5;            // preload every 5th frame (~36 images) to keep the page light
  var DRAG_RANGE = 0.5;    // full-width drag ≈ half a turn

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

  var index = 0;
  function setIndex(idx) {
    var n = ((idx % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    index = n;
    var snapped = (Math.round(n / STEP) * STEP) % FRAME_COUNT;
    if (loaded[snapped]) img.src = loaded[snapped].src;
  }

  var dragging = false, startX = 0, startIndex = 0, moved = false;

  function clientX(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  function down(e) {
    dragging = true; moved = false;
    startX = clientX(e); startIndex = index;
    el.classList.add('grabbing');
  }
  function move(e) {
    if (!dragging) return;
    var dx = clientX(e) - startX;
    if (Math.abs(dx) > 4) {
      moved = true;
      el.classList.add('spun');
      if (e.cancelable) e.preventDefault();
    }
    var width = el.clientWidth || 1;
    var delta = (dx / width) * FRAME_COUNT * DRAG_RANGE;
    setIndex(startIndex + Math.round(delta));
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('grabbing');
  }

  el.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  el.addEventListener('touchstart', down, { passive: true });
  el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', up);
  el.addEventListener('touchcancel', up);

  // a drag should not navigate the card link; a plain click still does
  el.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
})();
