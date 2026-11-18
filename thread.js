// The thread: in the rail beside a section, one series runs down the page with the reader.
// Subheads cross it as dashed ticks and each item sits on it as a dot. The series is green as
// far as the reader has scrolled, and a marker rides at that point. Apart from the marker's
// eased position, the picture is a function of scroll position and time.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // decorative, so left out entirely
  var TAU = Math.PI * 2;
  function clamp(u, lo, hi) { return Math.max(lo, Math.min(hi, u)); }

  document.querySelectorAll('canvas.thread').forEach(function (canvas) {
    var body = canvas.closest('section').querySelector('.body');
    if (!body || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, raf = 0, seen = false, ink = {}, marks = [], at = 0;

    // Where each subhead and item sits, as a share of the section's height.
    function measure() {
      var frame = body.getBoundingClientRect();
      // The thread is never taller than the window allows or than the section it accompanies.
      canvas.style.height = Math.max(0, Math.min(448, innerHeight - 144, frame.height - 76)) + 'px';
      marks = Array.prototype.map.call(body.querySelectorAll('h3, .paper, .awards li, .module'), function (el) {
        var box = el.getBoundingClientRect(), head = el.tagName === 'H3';
        return { at: (box.top + Math.min(box.height / 2, 60) - frame.top) / frame.height, label: head ? el.textContent : '' };
      });
    }

    function fit() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      var style = getComputedStyle(canvas);
      ['bg', 'text', 'muted', 'accent', 'serif'].forEach(function (name) {
        ink[name] = style.getPropertyValue('--' + name).trim();
      });
      measure();
    }

    function draw(t) {
      if (!W || !H) return;
      var frame = body.getBoundingClientRect();
      // The reader is taken to be a little above the middle of the window.
      at += (clamp((innerHeight * 0.45 - frame.top) / frame.height, 0, 1) - at) * 0.16;
      var top = 12, span = H - 24, here = top + span * at;
      var extra = W >= 180 ? 3 : 1;   // fainter companion series, fewer in a narrow rail
      var y, k;

      function sway(y, k) {   // where series k runs at height y; they share most of their movement
        return 14 + k * 9 + 5 * Math.sin(y / 46 + t * 0.5) + 2.5 * Math.sin(y / 21 - t * 0.33 + k * 1.3);
      }
      function trace(k, from, to) {
        ctx.beginPath();
        for (y = from; y < to; y += 6) ctx.lineTo(sway(y, k), y);
        ctx.lineTo(sway(to, k), to);
        ctx.stroke();
      }
      function disc(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.textBaseline = 'middle';
      ctx.font = 'italic 400 13px ' + ink.serif;

      ctx.lineWidth = 1;
      ctx.strokeStyle = ink.muted;
      for (k = 1; k <= extra; k++) {
        ctx.globalAlpha = 0.3 - k * 0.06;
        trace(k, top, top + span);
      }
      ctx.globalAlpha = 0.5;
      trace(0, here, top + span);   // still to come
      ctx.strokeStyle = ink.accent;
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 1.5;
      trace(0, top, here);          // already read
      ctx.lineWidth = 1;

      marks.forEach(function (mark) {
        var y = top + span * mark.at, x = sway(y, 0), past = at - mark.at;
        if (mark.label) {
          ctx.strokeStyle = ink.muted;
          ctx.globalAlpha = 0.6;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(x - 8, y);
          ctx.lineTo(x + extra * 9 + 10, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = past >= 0 ? ink.text : ink.muted;
          ctx.globalAlpha = past >= 0 ? 1 : 0.8;
          ctx.fillText(mark.label, 36 + extra * 9, y);
        } else {
          ctx.globalAlpha = 1;
          ctx.fillStyle = past >= 0 ? ink.accent : ink.bg;
          ctx.strokeStyle = past >= 0 ? ink.accent : ink.muted;
          disc(x, y, 2.6);
          ctx.fill();
          ctx.stroke();
          if (past >= 0 && past < 0.035) {   // a ring opens as the reader passes
            ctx.globalAlpha = 0.7 * (1 - past / 0.035);
            disc(x, y, 3 + 10 * past / 0.035);
            ctx.stroke();
          }
        }
      });

      // The reader.
      ctx.strokeStyle = ctx.fillStyle = ink.accent;
      ctx.globalAlpha = 0.3;
      disc(sway(here, 0), here, 8.5 + 1.5 * Math.sin(t * 2));
      ctx.stroke();
      ctx.globalAlpha = 1;
      disc(sway(here, 0), here, 4.2);
      ctx.fill();
    }

    function tick(ms) {
      raf = 0;
      draw(ms / 1000);
      if (seen) raf = requestAnimationFrame(tick);
    }

    canvas.hidden = false;
    new ResizeObserver(fit).observe(canvas);
    new ResizeObserver(measure).observe(body);   // an opened abstract moves everything below it
    addEventListener('resize', measure);
    new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      if (seen && !raf) raf = requestAnimationFrame(tick);
    }).observe(canvas);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fit);
  });
})();
