(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { deck } = window.TAROT;
  const store = window.GEMINI.store;
  const ELEM_CLS = { 火: 'fire', 土: 'earth', 風: 'air', 水: 'water' };

  const SPREADS = {
    single: { short: '單張', name: '單張指引', en: 'Single Card', pos: ['指引'] },
    three: { short: '三張', name: '過去・現在・未來', en: 'Three-card Spread', pos: ['過去', '現在', '未來'] },
    mind: { short: '身心靈', name: '身・心・靈', en: 'Body Mind Spirit', pos: ['身體與現實', '心理與情緒', '靈性與方向'] },
    relation: { short: '關係', name: '關係牌陣', en: 'Relationship', pos: ['你的狀態', '對方的狀態', '關係現況', '阻礙', '未來走向'] },
    choice: { short: '二選一', name: '二選一', en: 'Two Paths', pos: ['目前處境', '選擇 A 的發展', '選擇 B 的發展', '選擇 A 的結果', '選擇 B 的結果'] },
    celtic: { short: '凱爾特', name: '凱爾特十字', en: 'Celtic Cross', pos: ['現況', '挑戰', '根源', '過去', '目標', '近未來', '自我', '環境', '希望與恐懼', '最終結果'] },
  };
  const COUNT_ZH = ['零', '一', '兩', '三', '四', '五', '六', '七', '八', '九', '十'];

  const loadJSON = (k, d) => { try { return JSON.parse(store(k)) ?? d; } catch (e) { return d; } };
  const saveJSON = (k, v) => store(k, JSON.stringify(v));

  // ---------- 共用元件 ----------
  function tarotHtml(card, { size = '', flipped = false, reversed = false, extra = '', i } = {}) {
    const cls = ['tarot', size && 'tarot--' + size, flipped && 'is-flipped', reversed && 'is-reversed', extra].filter(Boolean).join(' ');
    const face = card ? `<div class="tarot__face"><span class="tarot__numeral">${esc(card.numeral)}</span>
        <div class="tarot__art"><img src="${card.img}" alt="${esc(card.zh)}" loading="lazy"></div>
        <span class="tarot__name">${esc(card.face)}</span><span class="tarot__name-zh">${esc(card.zh)}</span></div>` : '';
    return `<div class="${cls}"${i != null ? ` style="--i:${i}"` : ''}><div class="tarot__inner"><div class="tarot__back"></div>${face}</div></div>`;
  }
  const chip = (text, mod = '', dot = false) => `<span class="chip${mod ? ' chip--' + mod : ''}">${dot ? '<span class="chip__dot"></span>' : ''}${esc(text)}</span>`;
  const orientChip = (rev) => rev ? chip('逆位') : chip('正位', 'accent');
  const elemChip = (card) => card.element ? chip(card.suit + '・' + card.element, ELEM_CLS[card.element], true) : chip('大阿爾克那');

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- 分頁 ----------
  $$('.tabs__tab').forEach((b) => b.addEventListener('click', () => showView(b.dataset.tab)));
  function showView(name) {
    $$('.tabs__tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + name));
    if (name === 'history') renderHistory();
    store('tarot_view', name);
    window.scrollTo({ top: 0 });
  }

  // ---------- 個人資料 ----------
  let profile = loadJSON('tarot_profile', {}) || {};
  let sky = null; // 今日星象
  let chart = null;
  const saveProfile = () => saveJSON('tarot_profile', profile);

  function parseTz(v) {
    v = String(v || '').trim();
    if (!v) return 'Asia/Taipei';
    if (/^[+-]?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
    return v;
  }

  function fillBirthForm() {
    $('#pName').value = profile.name || '';
    $('#pDate').value = profile.date || '';
    $('#pTime').value = profile.time || '';
    $('#pPlace').value = profile.place || '';
    $('#pLat').value = profile.lat ?? '';
    $('#pLon').value = profile.lon ?? '';
    $('#pTz').value = profile.tz || '';
    if (profile.blood) { const r = $('#b-' + profile.blood); if (r) r.checked = true; }
  }

  function setPlaceError(msg) {
    const e = $('#placeError');
    e.textContent = msg || ''; e.hidden = !msg;
    $('#placeField').classList.toggle('is-invalid', !!msg);
  }

  $('#placeSearch').addEventListener('click', searchPlace);
  $('#pPlace').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchPlace(); } });
  async function searchPlace() {
    const q = $('#pPlace').value.trim();
    const box = $('#placeResults');
    if (!q) return;
    setPlaceError('');
    const btn = $('#placeSearch');
    btn.classList.add('is-loading');
    box.innerHTML = '';
    try {
      const res = await window.ASTRO.geocode(q);
      if (!res.length) { setPlaceError('找不到這個地點。可以換英文名稱，或展開「經緯度與時區」自己填。'); return; }
      res.forEach((r) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip place-chip';
        b.textContent = r.label;
        b.onclick = () => {
          $('#pPlace').value = r.label; $('#pLat').value = r.lat.toFixed(4);
          $('#pLon').value = r.lon.toFixed(4); $('#pTz').value = r.tz || '';
          box.innerHTML = '';
          $('#coordBox').open = true;
        };
        box.appendChild(b);
      });
    } catch (e) {
      setPlaceError('查詢失敗（' + e.message + '）。請展開「經緯度與時區」自己填。');
      $('#coordBox').open = true;
    } finally {
      btn.classList.remove('is-loading');
    }
  }

  $('#birthForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const next = {
      ...profile,
      name: $('#pName').value.trim(), date: $('#pDate').value, time: $('#pTime').value,
      place: $('#pPlace').value.trim(),
      lat: $('#pLat').value === '' ? null : parseFloat($('#pLat').value),
      lon: $('#pLon').value === '' ? null : parseFloat($('#pLon').value),
      tz: $('#pTz').value.trim(),
    };
    if (!next.date) return;
    if (next.time && (next.lat == null || next.lon == null)) {
      setPlaceError('有出生時間時需要地點才能算上升星座。請先查詢地點，或填入經緯度。');
      return;
    }
    const tz = parseTz(next.tz);
    if (typeof tz === 'string') {
      try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (err) { setPlaceError('時區格式不正確，請填 Asia/Taipei 這種格式，或 +8 這樣的數字。'); $('#coordBox').open = true; return; }
    }
    setPlaceError('');
    profile = next; saveProfile();
    renderChart();
    updateProfileHint();
    toast('星盤已儲存');
  });

  function renderChart() {
    if (!profile.date) { chart = null; $('#chartArea').hidden = true; $('#chartEmpty').hidden = false; return; }
    chart = window.ASTRO.computeChart({
      date: profile.date, time: profile.time, lat: profile.lat ?? NaN, lon: profile.lon ?? NaN, tz: parseTz(profile.tz),
    });
    $('#chartArea').hidden = false; $('#chartEmpty').hidden = true;
    $('#chartWheel').innerHTML = window.ASTRO.chartSvg(chart);
    $('#chartCaption').textContent = chart.asc ? '整宮制。上升點在左側。' : '未提供出生時間，從牡羊座 0° 起算，沒有宮位。';
    const T = window.ASTRO.SIGN_TRAITS;
    const sun = chart.planets[0], moon = chart.planets[1];
    const item = (label, sign, text) => `<div class="panel big3__item"><span class="big3__label">${label}</span><span class="big3__sign">${sign}</span><span class="big3__text">${text}</span></div>`;
    $('#chartBig3').innerHTML = item('太陽 · 核心自我', sun.sign + '座', T[sun.index]) +
      item('月亮 · 內在需求', moon.sign + '座' + (chart.timeKnown ? '' : '（約）'), T[moon.index]) +
      (chart.asc ? item('上升 · 外在形象', chart.asc.sign + '座', T[chart.asc.index]) : '');
    let rows = '<thead><tr><th>行星</th><th>星座</th><th>度數</th><th>宮位</th></tr></thead><tbody>';
    if (chart.asc) {
      rows += `<tr><td>上升 ASC</td><td>${chart.asc.sign}</td><td class="mono">${chart.asc.deg}</td><td class="mono">1</td></tr>`;
      rows += `<tr><td>天頂 MC</td><td>${chart.mc.sign}</td><td class="mono">${chart.mc.deg}</td><td>—</td></tr>`;
    }
    for (const p of chart.planets) {
      rows += `<tr><td><span class="mono">${p.glyph}︎</span> ${p.zh}</td><td>${p.sign}</td><td class="mono">${p.deg}${p.retro ? '<span class="retro">R</span>' : ''}</td><td>${p.house ? `<span class="mono">${p.house}</span> <span class="text-muted">${window.ASTRO.HOUSE_THEMES[p.house - 1]}</span>` : '—'}</td></tr>`;
    }
    $('#planetTable').innerHTML = rows + '</tbody>';
    const total = Object.values(chart.elements).reduce((a, b) => a + b, 0) || 1;
    $('#elementBar').innerHTML = Object.entries(chart.elements).filter(([, v]) => v)
      .map(([k, v]) => `<span class="${ELEM_CLS[k]}" style="flex:${v / total}"></span>`).join('');
    $('#elementLegend').innerHTML = Object.entries(chart.elements)
      .map(([k, v]) => chip(`${k} ${v}`, ELEM_CLS[k], true)).join('') +
      `<span class="field__hint">以太陽到土星七顆行星計算</span>`;
    $('#aspectList').innerHTML = chart.aspects.length
      ? chart.aspects.slice(0, 12).map((a) => {
        const kind = a.angle === 0 ? 'neutral' : a.cls === 'soft' ? 'harmonious' : 'tense';
        return `<li><span><span class="aspect-mark aspect-mark--${kind}"></span>${a.a.zh} ${a.name} ${a.b.zh}</span><span class="mono text-muted">${a.orbVal.toFixed(1)}°</span></li>`;
      }).join('')
      : '<li>沒有緊密相位。</li>';
  }

  // ---------- 血型 ----------
  $$('#bloodGroup input').forEach((r) => r.addEventListener('change', () => {
    profile.blood = r.value; saveProfile(); renderBlood(); updateProfileHint();
  }));
  function renderBlood() {
    const bt = profile.blood && window.BLOOD[profile.blood];
    $('#bloodReading').hidden = !bt;
    if (!bt) return;
    $('#bloodTitle').textContent = bt.title;
    $('#bloodBody').innerHTML = `<p>${bt.traits}</p>
      <h3>優點</h3><p>${bt.strengths}</p>
      <h3>盲點</h3><p>${bt.blindspots}</p>
      <h3>感情</h3><p>${bt.love}</p>
      <blockquote>${bt.advice}</blockquote>`;
  }

  function updateToday() {
    try { sky = window.ASTRO.today(chart); } catch (e) { sky = null; console.error(e); return; }
    const sun = sky.planets[0], moon = sky.planets[1];
    let t = `今日星象：太陽${sun.sign}座、月亮${moon.sign}座，${sky.phase}`;
    if (sky.retro.length) t += `；${sky.retro.join('、')}逆行中`;
    $('#todayHint').textContent = t + '。';
  }

  function updateProfileHint() {
    updateToday();
    const h = $('#profileHint');
    const parts = [];
    if (chart) parts.push('太陽' + chart.planets[0].sign + (chart.asc ? '、上升' + chart.asc.sign : ''));
    if (profile.blood) parts.push(profile.blood + ' 型');
    if (parts.length) {
      h.textContent = '會一起參考：' + parts.join('、');
    } else {
      h.innerHTML = '還沒有星盤或血型資料。<a href="#" data-go="chart">去填寫</a>，解讀會更完整。';
      h.querySelector('[data-go]').onclick = (e) => { e.preventDefault(); showView('chart'); };
    }
  }

  // ---------- 抽牌 ----------
  let spreadKey = store('tarot_spread');
  if (!SPREADS[spreadKey]) spreadKey = 'three';
  $('#spreadGroup').innerHTML = Object.entries(SPREADS).map(([k, v]) =>
    `<input type="radio" name="spread" id="sp-${k}" value="${k}"${k === spreadKey ? ' checked' : ''}><label for="sp-${k}">${v.short}</label>`).join('');
  $$('#spreadGroup input').forEach((r) => r.addEventListener('change', () => { spreadKey = r.value; store('tarot_spread', spreadKey); updateSpreadHint(); }));
  function updateSpreadHint() {
    const sp = SPREADS[spreadKey];
    $('#spreadHint').textContent = `${sp.name}：${sp.pos.join('、')}`;
    $('#shuffleBtn').textContent = session ? '重新洗牌' : `洗牌，抽${COUNT_ZH[sp.pos.length]}張`;
  }

  let session = null;

  function rnd(n) { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % n; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  $('#shuffleBtn').addEventListener('click', startDraw);

  function startDraw() {
    session = {
      question: $('#question').value.trim(), spreadKey, allowRev: $('#allowReversed').checked,
      useProfile: $('#useProfile').checked, picks: [], shuffled: shuffle(deck), date: new Date().toISOString(), ai: [],
    };
    updateToday();
    $('#resultArea').hidden = true;
    $('#drawArea').hidden = false;
    $('#revealAll').hidden = false;
    setPrimary('draw');
    const sp = SPREADS[spreadKey];
    $('#spreadEyebrow').textContent = sp.en;
    $('#spreadTitle').textContent = sp.name;
    renderSlots();
    renderDeck();
    updateSpreadHint();
    $('#drawArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 一個畫面只有一顆主要按鈕：抽牌階段是「洗牌」，結果出來後換成「開始解讀」
  function setPrimary(stage) {
    const shuffleBtn = $('#shuffleBtn');
    shuffleBtn.classList.toggle('btn--primary', stage === 'setup');
    shuffleBtn.classList.toggle('btn--secondary', stage !== 'setup');
  }

  function renderDeck() {
    const el = $('#deck');
    el.className = 'deck';
    el.innerHTML = session.shuffled.map((c, i) => tarotHtml(null, { size: 'sm', extra: 'is-interactive', i })).join('');
    void el.offsetWidth;
    el.classList.add('is-shuffling');
    [...el.children].forEach((node, i) => {
      node.setAttribute('role', 'button'); node.tabIndex = 0;
      node.setAttribute('aria-label', '第 ' + (i + 1) + ' 張牌');
      const go = () => pick(i, node);
      node.addEventListener('click', go);
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  function pick(i, node) {
    const sp = SPREADS[session.spreadKey];
    if (session.picks.length >= sp.pos.length || node.classList.contains('is-taken')) return;
    node.classList.add('is-taken');
    session.picks.push({ card: session.shuffled[i], reversed: session.allowRev && rnd(100) < 30, revealed: false, fresh: true });
    renderSlots();
    if (session.picks.length === sp.pos.length) {
      $('#deck').classList.add('is-complete');
      $('#slots').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function renderSlots() {
    const sp = SPREADS[session.spreadKey];
    const left = sp.pos.length - session.picks.length;
    $('#drawInstruction').textContent = left > 0
      ? `想著你的問題，從下方牌堆選出${COUNT_ZH[left] || left}張牌。`
      : (session.picks.every((p) => p.revealed) ? '全部翻開了。' : '點牌翻開，或按「依序翻牌」。');
    const slots = $('#slots');
    slots.className = 'spread spread--' + session.spreadKey;
    slots.innerHTML = sp.pos.map((pos, idx) => {
      const p = session.picks[idx];
      const label = `<span class="spread__label"><b>${esc(pos)}</b>${p && p.revealed ? esc(p.card.zh) + (p.reversed ? '・逆位' : '') : String(idx + 1).padStart(2, '0')}</span>`;
      if (!p) return `<div class="spread__slot"><div class="spread__empty"></div>${label}</div>`;
      return `<div class="spread__slot" data-idx="${idx}">${tarotHtml(p.card, { flipped: p.revealed, reversed: p.reversed, extra: p.fresh ? 'is-dealing' : '' })}${label}</div>`;
    }).join('');
    session.picks.forEach((p) => { p.fresh = false; });
    slots.querySelectorAll('[data-idx]').forEach((el) => {
      const p = session.picks[+el.dataset.idx];
      const t = el.querySelector('.tarot');
      t.setAttribute('role', 'button'); t.tabIndex = 0;
      t.setAttribute('aria-label', p.revealed ? p.card.zh : '翻開' + sp.pos[+el.dataset.idx]);
      const go = () => { if (!p.revealed) flip(p, el); else openCard(p); };
      t.addEventListener('click', go);
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $('#revealAll').disabled = !(left === 0 && session.picks.some((p) => !p.revealed));
  }

  // 翻牌：先加 class 讓動畫跑完，再重畫標籤
  function flip(p, slotEl) {
    p.revealed = true;
    slotEl.querySelector('.tarot').classList.add('is-flipped');
    const lbl = slotEl.querySelector('.spread__label');
    lbl.innerHTML = `<b>${esc(lbl.querySelector('b').textContent)}</b>${esc(p.card.zh)}${p.reversed ? '・逆位' : ''}`;
    $('#revealAll').disabled = !session.picks.some((x) => !x.revealed);
    checkDone();
  }

  $('#revealAll').addEventListener('click', () => {
    const els = [...$('#slots').querySelectorAll('[data-idx]')];
    let k = 0;
    els.forEach((el) => {
      const p = session.picks[+el.dataset.idx];
      if (!p.revealed) setTimeout(() => flip(p, el), 300 * k++);
    });
  });

  function checkDone() {
    if (session.picks.every((p) => p.revealed) && session.picks.length === SPREADS[session.spreadKey].pos.length && !session.finished) {
      session.finished = true;
      $('#revealAll').hidden = true;
      $('#drawInstruction').textContent = '全部翻開了。';
      setTimeout(showResult, 500);
      saveHistory();
    }
  }

  function openCard(p) {
    const c = p.card;
    $('#cdCard').innerHTML = tarotHtml(c, { size: 'lg', flipped: true, reversed: p.reversed });
    $('#cdEyebrow').textContent = c.en;
    $('#cdTitle').textContent = c.zh;
    $('#cdChips').innerHTML = orientChip(p.reversed) + elemChip(c);
    $('#cdUp').textContent = c.up; $('#cdRev').textContent = c.rev;
    $('#cardDialog').showModal();
  }

  function showResult() {
    const sp = SPREADS[session.spreadKey];
    $('#resultArea').hidden = false;
    $('#meanings').innerHTML = session.picks.map((p, i) => `
      <li class="meaning" data-i="${i}">
        ${tarotHtml(p.card, { size: 'sm', flipped: true, reversed: p.reversed })}
        <div>
          <div class="meaning__pos mono">${String(i + 1).padStart(2, '0')} · ${esc(sp.pos[i])}</div>
          <div class="meaning__title"><h3>${esc(p.card.zh)}</h3>${orientChip(p.reversed)}${elemChip(p.card)}</div>
          <p class="meaning__text">${esc(p.reversed ? p.card.rev : p.card.up)}</p>
        </div>
      </li>`).join('');
    $$('#meanings .meaning').forEach((li) => li.querySelector('.tarot').addEventListener('click', () => openCard(session.picks[+li.dataset.i])));
    renderSources();
    $('#readingThread').innerHTML = '';
    $('#followForm').hidden = true;
    $('#readingBody').innerHTML = localReading();
    $('#readingMeta').textContent = formatTime(session.date) + ' · 基本解讀';
    $('#aiBtn').textContent = '開始 AI 解讀';
    $('#aiBtn').className = 'btn btn--primary btn--sm';
    $('#resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSources() {
    const sp = SPREADS[session.spreadKey];
    let s = chip('塔羅 · ' + sp.short, 'accent');
    if (session.useProfile && chart) s += chip('星盤 · 太陽' + chart.planets[0].sign);
    if (session.useProfile && profile.blood) s += chip('血型 ' + profile.blood);
    if (sky) s += chip('今日 · 月亮' + sky.planets[1].sign);
    $('#readingSources').innerHTML = s;
  }

  const formatTime = (iso) => {
    const d = new Date(iso), z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
  };

  // 不用 AI 的基本解讀
  function localReading() {
    const picks = session.picks;
    const majors = picks.filter((p) => p.card.arcana === '大阿爾克那').length;
    const revs = picks.filter((p) => p.reversed).length;
    const el = { 火: 0, 水: 0, 風: 0, 土: 0 };
    picks.forEach((p) => p.card.element && el[p.card.element]++);
    const out = ['<h3>牌面</h3>'];
    const para = [];
    if (picks.length >= 3) {
      para.push(majors / picks.length >= 0.5
        ? `大阿爾克那有 ${majors} 張，這件事牽涉比較重要的人生課題，外在變化的影響較大。`
        : `以小阿爾克那為主（大牌 ${majors} 張），事情多和日常選擇有關，主導權在你手上。`);
      if (revs) para.push(`${revs} 張逆位，表示有些地方卡住了，需要先停下來調整。`);
      const top = Object.entries(el).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      const names = { 火: '權杖（行動與熱情）', 水: '聖杯（情感與關係）', 風: '寶劍（思考與衝突）', 土: '錢幣（現實與金錢）' };
      if (top.length) para.push(`花色以${names[top[0][0]]}最多。`);
    } else {
      const p = picks[0];
      para.push(`${p.card.zh}${p.reversed ? '逆位' : '正位'}：${p.reversed ? p.card.rev : p.card.up}。`);
    }
    out.push(`<p>${para.join('')}</p>`);
    if (session.useProfile && (chart || profile.blood)) {
      out.push('<h3>你的底色</h3>');
      const T = window.ASTRO.SIGN_TRAITS;
      const lines = [];
      if (chart) {
        const sun = chart.planets[0], moon = chart.planets[1];
        lines.push(`太陽${sun.sign}座的你${T[sun.index].split('，')[0]}；月亮${moon.sign}座，內心需要${T[moon.index].split('、')[0]}的空間。`);
        const domEl = Object.entries(chart.elements).sort((a, b) => b[1] - a[1])[0][0];
        const cardEl = Object.entries(el).sort((a, b) => b[1] - a[1])[0];
        if (cardEl[1] > 0) {
          lines.push(cardEl[0] === domEl
            ? `牌面主元素和你星盤的主導元素都是${cardEl[0]}，這次的課題落在你擅長的領域。`
            : `牌面主元素是${cardEl[0]}，你的星盤以${domEl}為主，這次可能要練習不熟悉的做法。`);
        }
      }
      out.push(`<p>${lines.join('')}</p>`);
      const bt = profile.blood && window.BLOOD[profile.blood];
      if (bt) out.push(`<blockquote>${bt.advice}</blockquote>`);
    }
    out.push('<p class="text-muted">AI 解讀會把每張牌串成完整的故事，並對照你的星盤與血型。</p>');
    return out.join('');
  }

  // ---------- AI ----------
  const SYSTEM = `你是一位溫和、務實的塔羅占卜師，也熟悉西洋占星與血型性格。一律用台灣慣用的繁體中文。
語氣平實具體，不用 emoji，不用誇張或神祕的腔調，不做絕對的預言，保留對方的選擇權。
涉及健康、法律、重大財務決定時，提醒尋求專業意見。
格式規則（很重要）：
- 每個主題用「### 標題」開頭，底下寫段落；需要時可用「- 」條列。
- 不要使用 # 或 ## 標題，不要用表格。
- 全文最後一行用「> 」開頭寫一句總結。`;

  function buildPrompt() {
    const sp = SPREADS[session.spreadKey];
    let s = `今天日期：${new Date(session.date).toLocaleDateString('zh-TW')}\n`;
    s += `問題：${session.question || '（沒有指定問題，請給整體指引）'}\n`;
    s += `牌陣：${sp.name}\n抽到的牌：\n`;
    session.picks.forEach((p, i) => {
      s += `${i + 1}. 【${sp.pos[i]}】${p.card.zh}（${p.card.en}）${p.reversed ? '逆位' : '正位'}；關鍵字：${p.reversed ? p.card.rev : p.card.up}\n`;
    });
    const withChart = session.useProfile && chart, withBlood = session.useProfile && profile.blood;
    if (withChart) {
      s += `\n問卜者：${profile.name ? '稱呼「' + profile.name + '」，' : ''}出生 ${profile.date}${profile.time ? ' ' + profile.time : '（時間不詳）'}${profile.place ? '，' + profile.place : ''}\n`;
      s += '出生星盤：\n' + window.ASTRO.summaryText(chart) + '\n';
    }
    if (withBlood) s += `血型：${profile.blood} 型\n`;
    if (sky) s += '\n' + window.ASTRO.todayText(sky) + '\n';
    s += `\n請依序寫這幾段：### 整體能量、### 逐張解讀（每張牌一小段，標出位置與牌名）`;
    const theme = withChart && withBlood ? '星盤與血型' : withChart ? '星盤' : '血型';
    if (withChart || withBlood) s += `、### ${theme}的呼應（可順帶提到今日星象的影響）`;
    s += '、### 建議，最後一行用 > 寫一句總結。';
    if (!withBlood) s += '沒有提供血型資料，請不要提到血型。';
    return s;
  }

  let aiBusy = false;
  $('#aiBtn').addEventListener('click', async () => {
    if (aiBusy || !session) return;
    session.ai = [{ role: 'user', parts: [{ text: buildPrompt() }] }];
    session.followups = [];
    $('#readingThread').innerHTML = '';
    await runAi($('#readingBody'), false);
  });

  $('#followForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#followInput').value.trim();
    if (!q || aiBusy) return;
    $('#followInput').value = '';
    session.ai.push({ role: 'user', parts: [{ text: q }] });
    const qEl = document.createElement('div'); qEl.className = 'reading__q'; qEl.textContent = q;
    const aEl = document.createElement('div'); aEl.className = 'prose';
    $('#readingThread').append(qEl, aEl);
    session.pendingQ = q;
    await runAi(aEl, true);
  });

  const SKELETON = '<span class="skeleton" style="width:90%"></span><span class="skeleton" style="width:100%"></span><span class="skeleton" style="width:75%"></span>';

  async function runAi(target, isFollow) {
    aiBusy = true;
    const btn = $('#aiBtn');
    btn.disabled = true; btn.classList.add('is-loading');
    const reading = $('#reading');
    target.innerHTML = SKELETON;
    $('#readingMeta').textContent = '解讀中';
    try {
      const { text, model } = await window.GEMINI.stream({
        contents: session.ai, system: SYSTEM,
        onText: (t) => {
          // 串流游標掛在 .reading__body 最後一個元素；追問時暫時借用同一個效果
          reading.classList.toggle('is-streaming', !isFollow);
          target.innerHTML = md(t);
        },
      });
      session.ai.push({ role: 'model', parts: [{ text }] });
      target.innerHTML = md(text);
      if (!isFollow) session.aiText = text;
      else session.followups = (session.followups || []).concat({ q: session.pendingQ, a: text });
      session.model = model;
      $('#readingMeta').textContent = formatTime(new Date().toISOString()) + ' · ' + model;
      $('#followForm').hidden = false;
      btn.textContent = '重新解讀';
      btn.className = 'btn btn--ghost btn--sm';
      saveHistory();
    } catch (e) {
      target.innerHTML = `<div class="notice notice--danger"><span>${esc(e.message)}</span></div>`;
      if (e.code === 'nokey') openSettings('請先貼上 Gemini API Key。', 'warning');
      $('#readingMeta').textContent = '解讀失敗';
      if (isFollow) session.ai.pop();
    } finally {
      reading.classList.remove('is-streaming');
      aiBusy = false;
      btn.disabled = false; btn.classList.remove('is-loading');
    }
  }

  $('#copyBtn').addEventListener('click', async () => {
    if (!session) return;
    const sp = SPREADS[session.spreadKey];
    let t = `${formatTime(session.date)}　${sp.name}\n問題：${session.question || '整體指引'}\n`;
    t += session.picks.map((p, i) => `${sp.pos[i]}：${p.card.zh}${p.reversed ? '（逆位）' : ''}`).join('\n') + '\n\n';
    const plain = (m) => m.replace(/^#{1,6}\s+(.*)$/gm, '【$1】').replace(/^>\s?/gm, '').replace(/\*\*(.+?)\*\*/g, '$1');
    t += session.aiText ? plain(session.aiText) : $('#readingBody').innerText;
    for (const f of session.followups || []) t += `\n\n【追問】${f.q}\n${plain(f.a)}`;
    try {
      await navigator.clipboard.writeText(t);
    } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast('已複製解讀');
  });

  // 精簡 Markdown：### 標題、段落、條列、粗體、引言
  function md(src) {
    const lines = esc(src).split('\n');
    let html = '', list = null;
    const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trim();
      let m;
      if (!l) { close(); continue; }
      if ((m = l.match(/^#{1,6}\s+(.*)/))) { close(); html += `<h3>${inline(m[1].replace(/\*\*/g, ''))}</h3>`; }
      else if ((m = l.match(/^&gt;\s?(.*)/))) { close(); html += `<blockquote>${inline(m[1])}</blockquote>`; }
      else if ((m = l.match(/^[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
      else if (/^(-{3,}|\*{3,})$/.test(l)) { close(); }
      else { close(); html += `<p>${inline(l)}</p>`; }
    }
    close();
    return html;
  }

  // ---------- 紀錄 ----------
  function saveHistory() {
    const list = loadJSON('tarot_history', []);
    const rec = {
      id: session.date, date: session.date, question: session.question, spreadKey: session.spreadKey,
      cards: session.picks.map((p) => ({ id: p.card.id, reversed: p.reversed })),
      aiText: session.aiText || '', followups: session.followups || [], model: session.model || '',
    };
    const i = list.findIndex((r) => r.id === rec.id);
    if (i >= 0) list[i] = rec; else list.unshift(rec);
    saveJSON('tarot_history', list.slice(0, 100));
  }

  function renderHistory() {
    const list = loadJSON('tarot_history', []);
    const box = $('#historyList');
    $('#clearHistory').hidden = !list.length;
    if (!list.length) { box.innerHTML = '<div class="panel empty-state"><p class="text-secondary">還沒有紀錄。抽過的牌會自動存在這裡。</p></div>'; return; }
    box.innerHTML = list.map((r, i) => {
      const sp = SPREADS[r.spreadKey] || { short: r.spreadKey, pos: [] };
      const cards = r.cards.map((c) => deck.find((x) => x.id === c.id)).filter(Boolean);
      return `<details class="panel history-item">
        <summary><span class="mono text-muted">${formatTime(r.date)}</span><span class="history-item__q">${esc(r.question || '整體指引')}</span>${chip(sp.short)}</summary>
        <div class="history-item__cards">${r.cards.map((c, k) => cards[k] ? tarotHtml(cards[k], { size: 'sm', flipped: true, reversed: c.reversed }) : '').join('')}</div>
        <p class="text-secondary">${r.cards.map((c, k) => `${esc(sp.pos[k] || k + 1)}：${cards[k] ? cards[k].zh : c.id}${c.reversed ? '（逆位）' : ''}`).join('　')}</p>
        ${r.aiText ? `<div class="prose">${md(r.aiText)}</div>` : ''}
        ${(r.followups || []).map((f) => `<div class="prose"><h3>${esc(typeof f === 'string' ? '追問' : f.q)}</h3>${md(typeof f === 'string' ? f : f.a)}</div>`).join('')}
        <div class="history-item__foot"><button class="btn btn--ghost btn--sm" data-del="${i}">刪除這筆</button></div>
      </details>`;
    }).join('');
    box.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      const l = loadJSON('tarot_history', []); l.splice(+b.dataset.del, 1); saveJSON('tarot_history', l); renderHistory();
    });
  }
  // 清除需要按兩次（Artifact 裡不能用 confirm 對話框）
  let clearArmed = null;
  $('#clearHistory').addEventListener('click', () => {
    const b = $('#clearHistory');
    if (!clearArmed) {
      b.textContent = '再按一次確認清除';
      clearArmed = setTimeout(() => { clearArmed = null; b.textContent = '清除全部'; }, 4000);
      return;
    }
    clearTimeout(clearArmed); clearArmed = null; b.textContent = '清除全部';
    saveJSON('tarot_history', []); renderHistory(); toast('紀錄已清除');
  });

  // ---------- 設定 ----------
  const dlg = $('#settingsDialog');
  function setStatus(msg, kind) {
    const s = $('#sStatus');
    s.hidden = !msg;
    s.className = 'notice' + (kind ? ' notice--' + kind : '');
    s.innerHTML = msg ? `<span>${esc(msg)}</span>` : '';
  }
  function setModelOptions(models, current) {
    const sel = $('#sModel');
    const all = [...new Set([current, window.GEMINI.DEFAULT_MODEL, 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', ...models])].filter(Boolean);
    sel.innerHTML = '';
    all.forEach((m) => sel.add(new Option(m, m)));
    sel.value = current;
  }
  function openSettings(msg, kind) {
    $('#sKey').value = window.GEMINI.getKey();
    setModelOptions(loadJSON('gemini_models', []), window.GEMINI.getModel());
    setStatus(msg, kind);
    dlg.showModal();
  }
  $('#openSettings').addEventListener('click', () => openSettings());
  $('#sLoadModels').addEventListener('click', async () => {
    const key = $('#sKey').value.trim();
    if (!key) { setStatus('請先輸入 API Key。', 'warning'); return; }
    const b = $('#sLoadModels'); b.classList.add('is-loading');
    try {
      const models = await window.GEMINI.listModels(key);
      saveJSON('gemini_models', models);
      setModelOptions(models, $('#sModel').value);
      setStatus(`找到 ${models.length} 個可用模型。`, 'success');
    } catch (e) { setStatus('載入失敗：' + e.message, 'danger'); }
    finally { b.classList.remove('is-loading'); }
  });
  $('#sTest').addEventListener('click', async () => {
    const key = $('#sKey').value.trim();
    if (!key) { setStatus('請先輸入 API Key。', 'warning'); return; }
    const oldK = store('gemini_key'), oldM = store('gemini_model');
    store('gemini_key', key); store('gemini_model', $('#sModel').value);
    const b = $('#sTest'); b.classList.add('is-loading');
    try {
      const { model } = await window.GEMINI.stream({ contents: [{ role: 'user', parts: [{ text: '請只回覆「連線成功」四個字。' }] }] });
      setStatus('連線成功，使用 ' + model + '。', 'success');
    } catch (e) {
      setStatus(e.message, 'danger');
    } finally {
      b.classList.remove('is-loading');
      store('gemini_key', oldK || ''); store('gemini_model', oldM || window.GEMINI.DEFAULT_MODEL);
    }
  });
  $('#sSave').addEventListener('click', () => {
    store('gemini_key', $('#sKey').value.trim());
    store('gemini_model', $('#sModel').value);
    toast('設定已儲存');
  });

  // ---------- 初始化 ----------
  fillBirthForm();
  try { renderChart(); } catch (e) { console.error(e); }
  renderBlood();
  updateProfileHint();
  updateSpreadHint();
  const v = store('tarot_view');
  if (v && v !== 'tarot' && $('#view-' + v)) showView(v);
})();
