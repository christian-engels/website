// Hero figure for the home page. Lenders, each with its households, circle a payment hub;
// transfers leave one lender, clear through the hub and settle at another.
// The picture is a function of time alone, so there is no state to keep in step.
(function () {
  var canvas = document.querySelector('canvas.flows');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  var TAU = Math.PI * 2;
  var RINGS = [0.2, 0.34, 0.48];      // orbit radii as shares of the canvas width
  var SPEED = [0.05, 0.032, 0.02];    // radians per second; inner orbits turn faster
  var GAP = 0.9, FLIGHT = 3.4, SETTLE = 1.1;   // seconds between transfers, in flight, settling

  // Repeatable pseudo-random numbers: the same picture on every visit.
  function noise(n, salt) {
    var x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  var clusters = [];
  [3, 4, 5].forEach(function (count, ring) {
    for (var i = 0; i < count; i++) {
      var id = clusters.length;
      clusters.push({
        ring: ring,
        angle: (i / count + noise(id, 1) * 0.1) * TAU + ring * 0.9,
        size: 0.75 + 0.5 * noise(id, 2),
        households: 16 + Math.floor(noise(id, 3) * 30)
      });
    }
  });

  var W = 0, H = 0, dpr = 1, raf = 0, seen = true, ink = {};

  function clock() { return still.matches ? 40 : performance.now() / 1000; }

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var style = getComputedStyle(canvas);
    ['rule', 'muted', 'accent'].forEach(function (name) {
      ink[name] = style.getPropertyValue('--' + name).trim();
    });
    draw(clock());
  }

  function disc(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ring(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke(); }
  function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

  // A leg is a shallow arc between two points: a quadratic curve whose control point is lifted.
  function crest(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 0.22 * Math.hypot(b.x - a.x, b.y - a.y) };
  }
  function along(a, b, u) {
    var c = crest(a, b), v = 1 - u;
    return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y };
  }

  function draw(t) {
    if (!W || !H) return;
    var cx = W / 2, cy = H / 2;
    var tilt = Math.min(0.5, (H * 0.4) / (W * RINGS[2]));   // how far the orbital plane leans away
    var unit = Math.max(0.62, Math.min(1.2, H / 250));      // marks scale with the band
    var hub = { x: cx, y: cy, k: unit };
    var at = clusters.map(function (c) {
      var a = c.angle + t * SPEED[c.ring], depth = (Math.sin(a) + 1) / 2;   // 0 far, 1 near
      return {
        x: cx + RINGS[c.ring] * W * Math.cos(a),
        y: cy + RINGS[c.ring] * W * tilt * Math.sin(a),
        depth: depth,
        k: unit * (0.64 + 0.56 * depth)
      };
    });

    function cluster(c, p) {
      var reach = 34 * c.size * p.k, turn = t * 0.1 * (c.ring % 2 ? -1 : 1);
      ctx.fillStyle = ink.muted;
      for (var j = 0; j < c.households; j++) {
        var far = Math.sqrt((j + 1) / c.households), a = j * 2.39996 + turn;   // sunflower packing
        ctx.globalAlpha = (0.42 + 0.58 * p.depth) * (1 - 0.5 * far);
        disc(p.x + reach * far * Math.cos(a), p.y + reach * far * Math.sin(a), (1.7 - 0.7 * far) * p.k);
      }
      ctx.globalAlpha = 0.45 + 0.55 * p.depth;
      ctx.fillStyle = ink.accent;
      disc(p.x, p.y, 3.4 * p.k);
    }

    function pulse(p, age) {
      ctx.globalAlpha = 0.55 * (1 - age);
      ctx.strokeStyle = ink.accent;
      ring(p.x, p.y, (5 + 22 * age) * p.k, (5 + 22 * age) * p.k);
    }

    function flight(from, to, u) {
      var legs = [[from, hub], [hub, to]];
      ctx.strokeStyle = ink.accent;
      ctx.globalAlpha = 0.3 * Math.sin(Math.PI * u);
      legs.forEach(function (leg) {
        var c = crest(leg[0], leg[1]);
        ctx.beginPath();
        ctx.moveTo(leg[0].x, leg[0].y);
        ctx.quadraticCurveTo(c.x, c.y, leg[1].x, leg[1].y);
        ctx.stroke();
      });
      if (u >= 0.5 && u < 0.8) pulse(hub, (u - 0.5) / 0.3);
      var leg = legs[u < 0.5 ? 0 : 1], e = ease(u < 0.5 ? u * 2 : u * 2 - 1);
      ctx.fillStyle = ink.accent;
      for (var i = 0; i < 9; i++) {
        var p = along(leg[0], leg[1], Math.max(0, e - i * 0.022));
        ctx.globalAlpha = 1 - i / 9;
        disc(p.x, p.y, 2.3 * unit * (1 - i / 14));
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;

    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink.rule;
    RINGS.forEach(function (r) { ring(cx, cy, r * W, r * W * tilt); });

    clusters.forEach(function (c, i) { if (at[i].depth < 0.5) cluster(c, at[i]); });

    ctx.globalAlpha = 1;
    ctx.fillStyle = ink.accent;
    disc(cx, cy, 4.6 * unit);
    ctx.strokeStyle = ink.accent;
    ring(cx, cy, 10.5 * unit, 10.5 * unit);

    clusters.forEach(function (c, i) { if (at[i].depth >= 0.5) cluster(c, at[i]); });

    for (var n = Math.floor((t - FLIGHT - SETTLE) / GAP); n <= Math.floor(t / GAP); n++) {
      var age = t - n * GAP;   // seconds since this transfer left
      var from = Math.floor(noise(n, 7) * clusters.length);
      var to = (from + 1 + Math.floor(noise(n, 8) * (clusters.length - 1))) % clusters.length;
      if (age < FLIGHT) flight(at[from], at[to], age / FLIGHT);
      else if (age < FLIGHT + SETTLE) pulse(at[to], (age - FLIGHT) / SETTLE);
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
})();
