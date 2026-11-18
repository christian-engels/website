// Hero figure for the home page: a difference-in-differences picture, kept in motion.
// A ribbon of series shares one common trend. At the event line the treated series (green)
// fall away from the controls (grey); the gap that opens between them is lightly shaded.
// A mouse moved across the figure moves the event. Apart from that eased position,
// the picture is a function of time alone, so there is no state to keep in step.
(function () {
  var canvas = document.querySelector('canvas.hero-figure');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  var SERIES = 22;      // alternating control and treated
  var intro = document.querySelector('.intro'), profile = document.querySelector('.profile');
  var W = 0, H = 0, dpr = 1, raf = 0, seen = true, ink = {};
  var born = 0;                     // when the figure first drew
  var rest = 0.62;                  // where the event sits when left alone, as a share of the width
  var event = rest, aim = rest;     // eased event position, and where the pointer wants it

  // Repeatable pseudo-random numbers: the same picture on every visit.
  function noise(n, salt) {
    var x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function clamp(u, lo, hi) { return Math.max(lo, Math.min(hi, u)); }
  function smooth(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function clock() { return still.matches ? 40 : performance.now() / 1000; }

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (intro && profile && W) {
      // Side by side, the event rests in the gap between the introduction and the portrait;
      // stacked, just before the portrait.
      var text = intro.getBoundingClientRect(), photo = profile.getBoundingClientRect();
      var x = text.right < photo.left ? Math.max(text.right + 28, (text.right + photo.left) / 2) : photo.left - 16;
      aim = rest = x / W;
    }
    var style = getComputedStyle(canvas);
    ['muted', 'accent', 'sans'].forEach(function (name) {
      ink[name] = style.getPropertyValue('--' + name).trim();
    });
    draw(clock());
  }

  function draw(t) {
    if (!W || !H) return;
    if (!born) born = t;
    var open = still.matches ? 1 : smooth((t - born) / 2.4);   // the series are drawn in from the left
    if (!still.matches) event += (aim - event) * 0.06;
    var centre = (SERIES - 1) / 2;
    var gap = clamp(H / 84, 4.5, 8);      // space between neighbouring series
    var mid = H * 0.25;                   // middle of the ribbon before the event
    var drop = H * 0.43;                  // how far the treated series fall
    var swell = clamp(H / 44, 7, 15);     // height of the waves in the common trend
    var x0 = event * W, ramp = Math.max(110, W * 0.14), edge = W * open, x, i;

    function trend(x) {   // what every series shares
      return swell * (0.62 * Math.sin(x / 150 + t * 0.21) + 0.38 * Math.sin(x / 83 - t * 0.13 + 1.3));
    }
    function level(i, x) {
      var y = mid + (i - centre) * gap + trend(x) + 0.22 * swell * Math.sin(x / 61 + i * 1.7 + t * 0.17);
      if (i % 2) {   // each treated series leaves at its own moment and falls its own distance
        y += drop * (0.92 + 0.16 * i / SERIES) * smooth((x - x0 - (noise(i, 1) - 0.5) * 0.07 * W) / ramp);
      }
      return y;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;

    // The effect: the gap between the treated series and where they would have gone.
    if (edge > x0) {
      ctx.beginPath();
      for (x = x0; x <= edge; x += 8) ctx.lineTo(x, mid + trend(x));
      for (x = edge; x >= x0; x -= 8) ctx.lineTo(x, mid + trend(x) + drop * smooth((x - x0) / ramp));
      ctx.fillStyle = ink.accent;
      ctx.globalAlpha = 0.045;
      ctx.fill();
    }

    // The event.
    ctx.strokeStyle = ctx.fillStyle = ink.muted;
    ctx.globalAlpha = 0.55 * open;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(x0, mid - centre * gap - 30);
    ctx.lineTo(x0, mid + drop + centre * gap + 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '500 12px ' + ink.sans;
    ctx.fillText('t = 0', x0 + 9, mid - centre * gap - 21);

    for (i = 0; i < SERIES; i++) {
      ctx.strokeStyle = i % 2 ? ink.accent : ink.muted;
      ctx.globalAlpha = (i % 2 ? 0.85 : 0.42) * (1 - 0.55 * Math.abs(i - centre) / centre);   // the ribbon thins towards its edges
      ctx.beginPath();
      for (x = 0; x <= edge; x += 8) ctx.lineTo(x, level(i, x));
      ctx.stroke();
    }

    // Observations move along every series.
    for (i = 0; i < SERIES; i++) {
      for (var j = 0; j < 2; j++) {
        x = (noise(i, 2 + j) * (W + 60) + t * (24 + 30 * noise(i, 5))) % (W + 60) - 30;
        if (x > edge) continue;
        ctx.fillStyle = i % 2 ? ink.accent : ink.muted;
        ctx.globalAlpha = i % 2 ? 0.95 : 0.6;
        ctx.beginPath();
        ctx.arc(x, level(i, x), 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function tick() {
    raf = 0;
    draw(clock());
    if (seen && !still.matches) raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }

  canvas.hidden = false;
  new ResizeObserver(fit).observe(canvas);
  new IntersectionObserver(function (entries) {
    seen = entries[0].isIntersecting;
    if (seen) wake();
  }).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fit);
  still.addEventListener('change', wake);
  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var box = canvas.getBoundingClientRect();
    var over = e.clientY > box.top && e.clientY < box.bottom;
    aim = over ? clamp((e.clientX - box.left) / box.width, 0.36, 0.9) : rest;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { aim = rest; });
})();
