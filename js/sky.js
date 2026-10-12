/* 夜空背景：細小星點緩慢閃爍，偶爾一顆流星。減少動態時只畫靜態星點。 */
(function () {
  const cv = document.createElement('canvas');
  cv.className = 'sky';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rgb = (getComputedStyle(document.documentElement).getPropertyValue('--sky-star').trim() || '236 230 214').split(/\s+/).join(',');
  let W, H, dpr, stars = [], meteor = null, nextMeteor = performance.now() + 6000;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(W * H / 5200);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() < 0.08 ? 1.1 + Math.random() * 0.6 : 0.35 + Math.random() * 0.6,
      a: 0.25 + Math.random() * 0.6, s: 0.4 + Math.random() * 1.4, p: Math.random() * 6.28,
    }));
    if (still) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const a = still ? s.a : s.a * (0.55 + 0.45 * Math.sin(t / 1000 * s.s + s.p));
      ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      if (s.r > 1.1) { // 亮星加一點十字光
        ctx.fillStyle = `rgba(${rgb},${(a * 0.25).toFixed(3)})`;
        ctx.fillRect(s.x - s.r * 3, s.y - 0.25, s.r * 6, 0.5);
        ctx.fillRect(s.x - 0.25, s.y - s.r * 3, 0.5, s.r * 6);
      }
    }
    if (still) return;
    if (!meteor && t > nextMeteor) meteor = { x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.3, t0: t };
    if (meteor) {
      const k = (t - meteor.t0) / 900;
      if (k >= 1) { meteor = null; nextMeteor = t + 9000 + Math.random() * 12000; }
      else {
        const x = meteor.x - k * 260, y = meteor.y + k * 120;
        const g = ctx.createLinearGradient(x, y, x + 90, y - 42);
        g.addColorStop(0, `rgba(${rgb},${(0.8 * (1 - k)).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90, y - 42); ctx.stroke();
      }
    }
  }

  let raf;
  function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
  resize();
  addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
  if (!still) {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop); });
  }
})();
