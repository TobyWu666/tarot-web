/* 抽牌儀式：洗牌 → 切牌 → 展開扇形 → 選牌（飛到牌位）
   只負責畫面與動畫，真正的亂數洗牌在 app.js（crypto）。
   用法：
     const r = Ritual.mount(el, { total: 78, onCut(pile) {}, onFan() {}, onPick(index, cardEl) {} });
     r.take(cardEl)      已被抽走的牌淡出
     r.close()           選完後收起扇形
     Ritual.fly(fromEl, toEl) → Promise  一張牌從扇形飛到牌位
*/
(function () {
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ms = (name, fallback) => { const v = css(name); const n = parseFloat(v); return isNaN(n) ? fallback : (v.endsWith('ms') ? n : n * 1000); };
  const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
  const EASE_IO = 'cubic-bezier(0.6, 0, 0.3, 1)';
  const wait = (t) => new Promise((r) => setTimeout(r, t));
  const STACK = 24; // 洗牌時畫面上的牌數（視覺用，不影響結果）

  const backHtml = '<div class="tarot__inner"><div class="tarot__back"></div></div>';

  // 把元素從目前 transform 動畫到目標，結束後寫回 style
  function move(el, to, { duration = 400, delay = 0, easing = EASE_OUT, via } = {}) {
    const from = el.style.transform || 'none';
    el.style.transform = to;
    if (reduced() || duration === 0) return Promise.resolve();
    const frames = via ? [{ transform: from }, ...via.map((t) => (typeof t === 'string' ? { transform: t } : t)), { transform: to }] : [{ transform: from }, { transform: to }];
    const a = el.animate(frames, { duration, delay, easing, fill: 'backwards' });
    return a.finished.catch(() => {});
  }

  function mount(root, opts) {
    const total = opts.total || 78;
    root.innerHTML = `
      <div class="ritual__table"></div>
      <div class="ritual__bar">
        <p class="ritual__status" aria-live="polite"></p>
        <button class="btn btn--ghost btn--sm ritual__skip" type="button">略過動畫</button>
      </div>`;
    root.className = 'ritual';
    const table = root.querySelector('.ritual__table');
    const status = root.querySelector('.ritual__status');
    const skipBtn = root.querySelector('.ritual__skip');
    let skipping = reduced();
    let alive = true;
    skipBtn.onclick = () => { skipping = true; root.classList.add('is-skipping'); root.getAnimations({ subtree: true }).forEach((a) => a.finish()); };

    const say = (t) => { status.textContent = t; };
    const D = (name, fb) => (skipping ? 0 : ms(name, fb));

    // ---------- 幾何 ----------
    let G;
    function geometry() {
      const W = table.clientWidth;
      const cw = parseFloat(getComputedStyle(table).getPropertyValue('--fan-card')) || 72;
      const ch = cw * 12 / 7;
      const narrow = W < 640;
      const span = narrow ? 116 : 70; // 扇形總角度
      const half = span / 2 * Math.PI / 180;
      const R = Math.max(160, (W - cw - 16) / (2 * Math.sin(half)));
      const top = 28; // 留給 hover 上浮
      const H = Math.ceil(top + R * (1 - Math.cos(half)) + ch * Math.cos(half) + cw * Math.sin(half) / 2 + 16);
      const stackY = Math.max(0, (H - ch) / 2 - top);
      G = { W, cw, ch, span, R, top, H, stackY };
      table.style.height = H + 'px';
      return G;
    }
    geometry();

    const stackT = (k, dx = 0, dy = 0, rot = 0) => `translate(${dx}px, ${G.stackY - k * 0.45 + dy}px) rotate(${rot}deg)`;

    function makeCard(cls = '') {
      const c = document.createElement('div');
      c.className = 'tarot ritual__card ' + cls;
      c.innerHTML = backHtml;
      c.style.transformOrigin = '50% 50%';
      table.appendChild(c);
      return c;
    }

    // ---------- 1. 洗牌 ----------
    async function shuffleStage() {
      root.dataset.stage = 'shuffle';
      say('洗牌中。深呼吸，想著你的問題。');
      table.innerHTML = '';
      const cards = Array.from({ length: STACK }, (_, k) => { const c = makeCard(); c.style.zIndex = k; c.style.transform = stackT(k, 0, -40); c.style.opacity = '0'; return c; });
      // 牌堆落下
      await Promise.all(cards.map((c, k) => { c.style.opacity = ''; return move(c, stackT(k), { duration: D('--dur-slow', 420), delay: skipping ? 0 : k * 12, easing: EASE_OUT, via: [{ opacity: 0, offset: 0 }] }); }));

      for (let round = 0; round < 3 && alive; round++) {
        if (round < 2) await riffle(cards); else await overhand(cards);
      }
      return cards;
    }

    async function riffle(cards) {
      const dur = D('--dur-riffle', 900);
      const dx = G.cw * 0.78;
      // 分成左右兩半
      await Promise.all(cards.map((c, k) => {
        const left = k < STACK / 2;
        const j = left ? k : k - STACK / 2;
        return move(c, stackT(j, left ? -dx : dx, 0, left ? -7 : 7), { duration: dur * 0.35, easing: EASE_IO });
      }));
      // 兩半交錯落回：左右輪流，像鴿尾洗牌的劈啪聲
      const order = [];
      for (let j = 0; j < STACK / 2; j++) { order.push(j, j + STACK / 2); }
      await Promise.all(order.map((k, n) => {
        const c = cards[k];
        c.style.zIndex = n;
        const left = k < STACK / 2;
        return move(c, stackT(n), {
          duration: dur * 0.45, delay: skipping ? 0 : n * (dur * 0.5 / STACK), easing: EASE_OUT,
          via: [`translate(${left ? -dx * 0.35 : dx * 0.35}px, ${G.stackY - 18}px) rotate(${left ? -3 : 3}deg)`],
        });
      }));
      // 依新的疊放順序重排陣列
      const re = order.map((k) => cards[k]);
      re.forEach((c, i) => { cards[i] = c; });
      // 整理：輕敲一下
      await move(cards[STACK - 1], stackT(STACK - 1), { duration: D('--dur-fast', 140) });
    }

    async function overhand(cards) {
      const dur = D('--dur-riffle', 900);
      // 上方一疊抽起、放到下面，兩次
      for (let t = 0; t < 2; t++) {
        const n = 7 + t * 2;
        const chunk = cards.slice(STACK - n);
        await Promise.all(chunk.map((c, i) => move(c, stackT(STACK - n + i, 0, -G.ch * 0.55, t ? 4 : -4), { duration: dur * 0.3, easing: EASE_IO })));
        await Promise.all(chunk.map((c, i) => move(c, stackT(STACK - n + i, G.cw * (t ? -0.9 : 0.9), -G.ch * 0.3, t ? -6 : 6), { duration: dur * 0.2, easing: EASE_IO })));
        // 抽起的放到底部
        const rest = cards.slice(0, STACK - n);
        const next = chunk.concat(rest);
        next.forEach((c, i) => { cards[i] = c; c.style.zIndex = i; });
        await Promise.all(cards.map((c, i) => move(c, stackT(i), { duration: dur * 0.3, easing: EASE_OUT })));
      }
    }

    // ---------- 2. 切牌 ----------
    function cutStage(cards) {
      root.dataset.stage = 'cut';
      say('憑直覺點選一疊，完成切牌。');
      const gap = Math.min(G.cw * 1.6, G.W / 3.2);
      const piles = [[], [], []];
      cards.forEach((c, k) => piles[Math.min(2, Math.floor(k / (STACK / 3)))].push(c));
      return new Promise((resolve) => {
        const xs = [-gap, 0, gap];
        piles.forEach((pile, p) => pile.forEach((c, i) => {
          c.style.zIndex = i;
          c.dataset.pile = p;
          c.classList.add('is-pile');
          move(c, stackT(i, xs[p], 0, (p - 1) * 2), { duration: D('--dur-cut', 650), delay: skipping ? 0 : p * 60, easing: EASE_IO });
        }));
        const choose = async (p) => {
          table.removeEventListener('click', onClick);
          table.removeEventListener('keydown', onKey);
          cards.forEach((c) => c.classList.remove('is-pile', 'is-pile-hover'));
          opts.onCut && opts.onCut(p);
          const chosen = piles[p], others = piles.filter((_, i) => i !== p).flat();
          // 選中的那疊抬起，其他兩疊先合到中間，再把選中的放到最上面
          await Promise.all(chosen.map((c, i) => move(c, stackT(i, xs[p], -G.ch * 0.35), { duration: D('--dur-cut', 650) * 0.5, easing: EASE_IO })));
          await Promise.all(others.map((c, i) => { c.style.zIndex = i; return move(c, stackT(i), { duration: D('--dur-cut', 650) * 0.6, easing: EASE_IO }); }));
          await Promise.all(chosen.map((c, i) => { c.style.zIndex = others.length + i; return move(c, stackT(others.length + i), { duration: D('--dur-cut', 650) * 0.7, easing: EASE_OUT, via: [stackT(others.length + i, xs[p] * 0.4, -G.ch * 0.4)] }); }));
          resolve();
        };
        const pileOf = (e) => { const c = e.target.closest('.ritual__card'); return c ? +c.dataset.pile : null; };
        const onClick = (e) => { const p = pileOf(e); if (p != null) choose(p); };
        const onKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && pileOf(e) != null) { e.preventDefault(); choose(pileOf(e)); } };
        table.addEventListener('click', onClick);
        table.addEventListener('keydown', onKey);
        table.onmouseover = (e) => { const p = pileOf(e); cards.forEach((c) => c.classList.toggle('is-pile-hover', p != null && +c.dataset.pile === p)); };
        // 每疊最上面一張可用鍵盤選
        piles.forEach((pile, p) => { const top = pile[pile.length - 1]; top.tabIndex = 0; top.setAttribute('role', 'button'); top.setAttribute('aria-label', ['左', '中', '右'][p] + '邊那疊'); });
        if (skipping) choose(1);
      });
    }

    // ---------- 3. 展開扇形 ----------
    const fanT = (i, n) => `rotate(${-G.span / 2 + G.span * i / (n - 1)}deg)`;
    let fanCards = [];
    async function fanStage() {
      root.dataset.stage = 'fan';
      table.onmouseover = null;
      say(opts.fanText || '從扇形中選牌。');
      skipBtn.hidden = true;
      table.innerHTML = '';
      fanCards = Array.from({ length: total }, (_, i) => {
        const c = makeCard('is-interactive ritual__fan');
        c.style.transformOrigin = `50% ${G.R}px`;
        c.style.zIndex = i;
        c.style.transform = `translate(0px, ${G.stackY - i * 0.12}px) rotate(0deg)`;
        c.dataset.index = i;
        c.setAttribute('role', 'button');
        c.tabIndex = 0;
        c.setAttribute('aria-label', '第 ' + (i + 1) + ' 張');
        c.dataset.angle = String(-G.span / 2 + G.span * i / (total - 1));
        return c;
      });
      await Promise.all(fanCards.map((c, i) => {
        const from = Math.abs(i - (total - 1) / 2);
        return move(c, `translate(0px, 0px) ${fanT(i, total)}`, { duration: D('--dur-fan', 1100), delay: skipping ? 0 : from * 6, easing: EASE_OUT });
      }));
      root.dataset.stage = 'pick';
      const go = (c) => { if (!c.classList.contains('is-taken') && root.dataset.stage === 'pick') opts.onPick && opts.onPick(+c.dataset.index, c); };
      table.addEventListener('click', (e) => { const c = e.target.closest('.ritual__fan'); if (c) go(c); });
      table.addEventListener('keydown', (e) => { const c = e.target.closest('.ritual__fan'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(c); } });
      opts.onFan && opts.onFan();
    }

    function relayout() {
      if (!fanCards.length || root.dataset.stage !== 'pick') return;
      geometry();
      fanCards.forEach((c, i) => { c.style.transformOrigin = `50% ${G.R}px`; c.style.transform = `translate(0px, 0px) ${fanT(i, total)}`; c.dataset.angle = String(-G.span / 2 + G.span * i / (total - 1)); });
    }
    let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(relayout, 150); };
    window.addEventListener('resize', onResize);

    (async () => {
      const cards = await shuffleStage();
      if (!alive) return;
      await cutStage(cards);
      if (!alive) return;
      await fanStage();
    })();

    return {
      say,
      take(c) { c.classList.add('is-taken'); },
      async close() {
        root.dataset.stage = 'done';
        const rest = fanCards.filter((c) => !c.classList.contains('is-taken'));
        await Promise.all(rest.map((c, i) => move(c, `translate(0px, ${G.stackY}px) rotate(0deg)`, { duration: D('--dur-fan', 1100) * 0.6, delay: skipping ? 0 : i * 3, easing: EASE_IO })));
        root.classList.add('is-closed');
      },
      destroy() { alive = false; window.removeEventListener('resize', onResize); root.innerHTML = ''; root.className = 'ritual'; delete root.dataset.stage; },
    };
  }

  // 一張牌從 from 飛到 to（to 會先被隱藏，抵達後顯示）
  function fly(from, to) {
    to.classList.add('is-arriving');
    if (reduced()) { to.classList.remove('is-arriving'); return Promise.resolve(); }
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const s = from.offsetWidth / to.offsetWidth;
    const dx = (a.left + a.width / 2) - (b.left + b.width / 2);
    const dy = (a.top + a.height / 2) - (b.top + b.height / 2);
    const rot = parseFloat(from.dataset.angle || 0);
    const clone = document.createElement('div');
    clone.className = 'tarot ritual__fly';
    clone.innerHTML = backHtml;
    Object.assign(clone.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px' });
    document.body.appendChild(clone);
    from.style.visibility = 'hidden';
    const dur = ms('--dur-fly', 760);
    const anim = clone.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${s})` },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) rotate(${rot * 0.3 - 6}deg) scale(${(s + 1.25) / 2})`, offset: 0.45 },
      { transform: 'translate(0, -6px) rotate(0deg) scale(1.04)', offset: 0.85 },
      { transform: 'none' },
    ], { duration: dur, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' });
    return anim.finished.catch(() => {}).then(() => { clone.remove(); to.classList.remove('is-arriving'); to.classList.add('is-landed'); });
  }

  window.Ritual = { mount, fly };
})();
