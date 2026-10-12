// 星盤計算：使用 astronomy-engine（MIT）計算地心黃道經度，整宮制分宮
(function () {
  const A = window.Astronomy;
  const SIGNS = ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '摩羯', '水瓶', '雙魚'];
  const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const SIGN_ELEMENT = ['火', '土', '風', '水', '火', '土', '風', '水', '火', '土', '風', '水'];
  const SIGN_MODE = ['開創', '固定', '變動', '開創', '固定', '變動', '開創', '固定', '變動', '開創', '固定', '變動'];
  const SIGN_TRAITS = [
    '直接、熱情、勇於開創，行動快但容易急躁',
    '穩定、務實、重視安全感與美感，固執但可靠',
    '好奇、機智、善於溝通，興趣廣泛但容易分心',
    '感性、顧家、重視情感連結，保護欲強也容易敏感',
    '自信、慷慨、渴望被看見，有領袖氣質但愛面子',
    '細心、分析力強、追求完美，樂於助人但容易焦慮',
    '優雅、重視平衡與關係，善於協調但容易猶豫',
    '深刻、專注、洞察力強，愛恨分明且重視忠誠',
    '樂觀、自由、追求意義與遠方，直率但不愛受拘束',
    '踏實、有野心、重視責任與成就，自律但偏壓抑',
    '獨立、理性、重視理想與群體，創新但有距離感',
    '浪漫、富同理心、想像力豐富，溫柔但容易逃避現實',
  ];
  const PLANETS = [
    { key: 'Sun', zh: '太陽', glyph: '☉', meaning: '核心自我、意志' },
    { key: 'Moon', zh: '月亮', glyph: '☽', meaning: '情緒、內在需求' },
    { key: 'Mercury', zh: '水星', glyph: '☿', meaning: '思考、溝通' },
    { key: 'Venus', zh: '金星', glyph: '♀', meaning: '愛情、價值觀、美感' },
    { key: 'Mars', zh: '火星', glyph: '♂', meaning: '行動力、慾望' },
    { key: 'Jupiter', zh: '木星', glyph: '♃', meaning: '擴張、幸運' },
    { key: 'Saturn', zh: '土星', glyph: '♄', meaning: '責任、課題' },
    { key: 'Uranus', zh: '天王星', glyph: '♅', meaning: '變革、獨特' },
    { key: 'Neptune', zh: '海王星', glyph: '♆', meaning: '夢想、靈性' },
    { key: 'Pluto', zh: '冥王星', glyph: '♇', meaning: '轉化、深層力量' },
  ];
  const ASPECTS = [
    { name: '合相', angle: 0, orb: 8, cls: 'conj' },
    { name: '六分相', angle: 60, orb: 5, cls: 'soft' },
    { name: '四分相', angle: 90, orb: 7, cls: 'hard' },
    { name: '三分相', angle: 120, orb: 7, cls: 'soft' },
    { name: '對分相', angle: 180, orb: 8, cls: 'hard' },
  ];
  const HOUSE_THEMES = ['自我形象', '金錢資源', '溝通學習', '家庭根源', '戀愛創作', '工作健康',
    '伴侶合作', '深層連結', '遠行信念', '事業名聲', '朋友群體', '潛意識'];

  const norm = (x) => ((x % 360) + 360) % 360;
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;

  // 某 IANA 時區在某 UTC 時刻的偏移（分鐘）
  function tzOffsetMinutes(tz, utcMs) {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p = {};
    for (const { type, value } of f.formatToParts(new Date(utcMs))) p[type] = value;
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUtc - utcMs) / 60000);
  }

  // 出生地當地時間 → UTC Date。tz 可為 IANA 名稱或數字（小時偏移）
  function localToUtc(dateStr, timeStr, tz) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    if (typeof tz === 'number' && isFinite(tz)) return new Date(guess - tz * 3600000);
    let off = tzOffsetMinutes(tz, guess);
    let utc = guess - off * 60000;
    const off2 = tzOffsetMinutes(tz, utc);
    if (off2 !== off) utc = guess - off2 * 60000;
    return new Date(utc);
  }

  function longitudeOf(key, date) {
    if (key === 'Moon') return norm(A.EclipticGeoMoon(date).lon);
    if (key === 'Sun') return norm(A.Ecliptic(A.GeoVector(A.Body.Sun, date, true)).elon);
    return norm(A.Ecliptic(A.GeoVector(A.Body[key], date, true)).elon);
  }

  function signOf(lon) {
    const i = Math.floor(norm(lon) / 30);
    const d = norm(lon) - i * 30;
    return { index: i, sign: SIGNS[i], glyph: SIGN_GLYPHS[i], degree: d,
      deg: Math.floor(d) + '°' + String(Math.floor((d % 1) * 60)).padStart(2, '0') + '′',
      text: SIGNS[i] + '座 ' + Math.floor(d) + '°' + String(Math.floor((d % 1) * 60)).padStart(2, '0') + '′' };
  }

  // 上升與天頂
  function angles(date, lat, lon) {
    const gast = A.SiderealTime(date); // 小時
    const lst = norm(gast * 15 + lon);
    const T = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
    const eps = rad(23.439291 - 0.0130042 * T);
    const th = rad(lst);
    const phi = rad(lat);
    const mc = norm(deg(Math.atan2(Math.sin(th), Math.cos(th) * Math.cos(eps))));
    let asc = norm(deg(Math.atan2(Math.cos(th), -(Math.sin(th) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)))));
    if (norm(asc - mc) > 180) asc = norm(asc + 180); // 上升必在天頂東方
    return { asc, mc };
  }

  /**
   * @param {object} o { date:'YYYY-MM-DD', time:'HH:MM'|'' , lat, lon, tz }
   */
  function computeChart(o) {
    const timeKnown = !!o.time;
    const utc = localToUtc(o.date, o.time || '12:00', o.tz);
    const later = new Date(utc.getTime() + 86400000);
    const planets = PLANETS.map((p) => {
      const lon = longitudeOf(p.key, utc);
      const lon2 = longitudeOf(p.key, later);
      const speed = ((lon2 - lon + 540) % 360) - 180;
      return { ...p, lon, retro: p.key !== 'Sun' && p.key !== 'Moon' && speed < 0, ...signOf(lon) };
    });
    let ang = null;
    const hasPlace = isFinite(o.lat) && isFinite(o.lon);
    if (timeKnown && hasPlace) {
      ang = angles(utc, o.lat, o.lon);
      const ascSign = Math.floor(ang.asc / 30);
      for (const p of planets) p.house = ((p.index - ascSign + 12) % 12) + 1;
    }
    const aspects = [];
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        let diff = Math.abs(planets[i].lon - planets[j].lon);
        if (diff > 180) diff = 360 - diff;
        for (const a of ASPECTS) {
          const orb = Math.abs(diff - a.angle);
          if (orb <= a.orb) aspects.push({ a: planets[i], b: planets[j], ...a, orbVal: orb });
        }
      }
    }
    aspects.sort((x, y) => x.orbVal - y.orbVal);
    const elements = { 火: 0, 土: 0, 風: 0, 水: 0 };
    const modes = { 開創: 0, 固定: 0, 變動: 0 };
    planets.slice(0, 7).forEach((p) => { elements[SIGN_ELEMENT[p.index]]++; modes[SIGN_MODE[p.index]]++; });
    return {
      utc, timeKnown, planets, aspects, elements, modes,
      asc: ang ? { lon: ang.asc, ...signOf(ang.asc) } : null,
      mc: ang ? { lon: ang.mc, ...signOf(ang.mc) } : null,
    };
  }

  function chartSvg(chart) {
    const size = 400, c = size / 2, rOut = 190, rSign = 160, rIn = 132, rPl = 110, rAsp = 84;
    const base = chart.asc ? chart.asc.lon : 0;
    const pt = (lon, r) => {
      const a = rad(180 + (lon - base));
      return [+(c + r * Math.cos(a)).toFixed(2), +(c - r * Math.sin(a)).toFixed(2)];
    };
    const elemCls = { 火: 'fire', 土: 'earth', 風: 'air', 水: 'water' };
    const line = (p1, p2, cls) => `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="${cls}"/>`;
    let s = `<svg viewBox="0 0 ${size} ${size}" class="chart__wheel" role="img" aria-label="出生星盤">`;
    s += `<circle cx="${c}" cy="${c}" r="${rOut}" class="chart__ring chart__ring--zodiac"/>`;
    s += `<circle cx="${c}" cy="${c}" r="${rIn}" class="chart__ring"/>`;
    s += `<circle cx="${c}" cy="${c}" r="${rAsp}" class="chart__ring"/>`;
    for (let i = 0; i < 12; i++) {
      s += line(pt(i * 30, rIn), pt(i * 30, rOut), 'chart__house');
      const [tx, ty] = pt(i * 30 + 15, rSign + 15);
      s += `<text x="${tx}" y="${ty}" class="chart__sign chart__sign--${elemCls[SIGN_ELEMENT[i]]}">${SIGN_GLYPHS[i]}\uFE0E</text>`;
    }
    if (chart.asc) {
      // 整宮制：第 1 宮從上升星座 0° 開始
      const start = Math.floor(chart.asc.lon / 30) * 30;
      for (let h = 0; h < 12; h++) {
        s += line(pt(start + h * 30, rAsp), pt(start + h * 30, rIn), 'chart__house');
        const [hx, hy] = pt(start + h * 30 + 15, rAsp + 9);
        s += `<text x="${hx}" y="${hy}" class="chart__house-num">${h + 1}</text>`;
      }
    }
    for (const asp of chart.aspects) {
      if (asp.angle === 0) continue;
      const kind = asp.cls === 'soft' ? 'harmonious' : 'tense';
      s += line(pt(asp.a.lon, rAsp), pt(asp.b.lon, rAsp), 'chart__aspect chart__aspect--' + kind);
    }
    if (chart.asc) {
      for (const [lon, label] of [[chart.asc.lon, 'ASC'], [chart.mc.lon, 'MC']]) {
        s += line(pt(lon, rAsp), pt(lon, rOut), 'chart__axis');
        const [tx, ty] = pt(lon, rOut + 12);
        s += `<text x="${tx}" y="${ty}" class="chart__axis-label">${label}</text>`;
      }
    }
    // 行星避免重疊
    const placed = [...chart.planets].sort((a, b) => a.lon - b.lon).map((p) => ({ p, disp: p.lon }));
    for (let k = 0; k < 3; k++) {
      for (let i = 1; i < placed.length; i++) {
        if (placed[i].disp - placed[i - 1].disp < 9) placed[i].disp = placed[i - 1].disp + 9;
      }
    }
    for (const { p, disp } of placed) {
      const [dx, dy] = pt(p.lon, rIn - 4);
      const [x, y] = pt(disp, rPl);
      s += `<circle cx="${dx}" cy="${dy}" r="2" class="chart__planet-dot"/>`;
      s += `<text x="${x}" y="${y}" class="chart__planet"><title>${p.zh} ${p.text}</title>${p.glyph}\uFE0E</text>`;
    }
    s += '</svg>';
    return s;
  }

  // 內建城市：不用網路也查得到常見出生地
  const CITIES = [
    ['台北', '臺北 Taipei', 25.0330, 121.5654, 'Asia/Taipei'], ['新北', '板橋 New Taipei', 25.0120, 121.4650, 'Asia/Taipei'],
    ['基隆', 'Keelung', 25.1276, 121.7392, 'Asia/Taipei'], ['桃園', 'Taoyuan', 24.9936, 121.3010, 'Asia/Taipei'],
    ['新竹', 'Hsinchu', 24.8138, 120.9675, 'Asia/Taipei'], ['苗栗', 'Miaoli', 24.5602, 120.8214, 'Asia/Taipei'],
    ['台中', '臺中 Taichung', 24.1477, 120.6736, 'Asia/Taipei'], ['彰化', 'Changhua', 24.0518, 120.5161, 'Asia/Taipei'],
    ['南投', 'Nantou', 23.9157, 120.6869, 'Asia/Taipei'], ['雲林', '斗六 Yunlin', 23.7092, 120.4313, 'Asia/Taipei'],
    ['嘉義', 'Chiayi', 23.4801, 120.4491, 'Asia/Taipei'], ['台南', '臺南 Tainan', 22.9999, 120.2270, 'Asia/Taipei'],
    ['高雄', 'Kaohsiung', 22.6273, 120.3014, 'Asia/Taipei'], ['屏東', 'Pingtung', 22.6690, 120.4862, 'Asia/Taipei'],
    ['宜蘭', 'Yilan', 24.7570, 121.7533, 'Asia/Taipei'], ['花蓮', 'Hualien', 23.9872, 121.6015, 'Asia/Taipei'],
    ['台東', '臺東 Taitung', 22.7583, 121.1444, 'Asia/Taipei'], ['澎湖', '馬公 Penghu', 23.5655, 119.5793, 'Asia/Taipei'],
    ['金門', 'Kinmen', 24.4325, 118.3171, 'Asia/Taipei'], ['馬祖', '南竿 Matsu', 26.1597, 119.9499, 'Asia/Taipei'],
    ['香港', 'Hong Kong', 22.3193, 114.1694, 'Asia/Hong_Kong'], ['澳門', 'Macau', 22.1987, 113.5439, 'Asia/Macau'],
    ['北京', 'Beijing', 39.9042, 116.4074, 'Asia/Shanghai'], ['上海', 'Shanghai', 31.2304, 121.4737, 'Asia/Shanghai'],
    ['廣州', 'Guangzhou', 23.1291, 113.2644, 'Asia/Shanghai'], ['深圳', 'Shenzhen', 22.5431, 114.0579, 'Asia/Shanghai'],
    ['廈門', 'Xiamen', 24.4798, 118.0894, 'Asia/Shanghai'], ['東京', 'Tokyo', 35.6762, 139.6503, 'Asia/Tokyo'],
    ['大阪', 'Osaka', 34.6937, 135.5023, 'Asia/Tokyo'], ['首爾', 'Seoul', 37.5665, 126.9780, 'Asia/Seoul'],
    ['新加坡', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore'], ['吉隆坡', 'Kuala Lumpur', 3.1390, 101.6869, 'Asia/Kuala_Lumpur'],
    ['曼谷', 'Bangkok', 13.7563, 100.5018, 'Asia/Bangkok'], ['雪梨', 'Sydney', -33.8688, 151.2093, 'Australia/Sydney'],
    ['墨爾本', 'Melbourne', -37.8136, 144.9631, 'Australia/Melbourne'], ['倫敦', 'London', 51.5074, -0.1278, 'Europe/London'],
    ['巴黎', 'Paris', 48.8566, 2.3522, 'Europe/Paris'], ['紐約', 'New York', 40.7128, -74.0060, 'America/New_York'],
    ['洛杉磯', 'Los Angeles', 34.0522, -118.2437, 'America/Los_Angeles'], ['舊金山', 'San Francisco', 37.7749, -122.4194, 'America/Los_Angeles'],
    ['西雅圖', 'Seattle', 47.6062, -122.3321, 'America/Los_Angeles'], ['溫哥華', 'Vancouver', 49.2827, -123.1207, 'America/Vancouver'],
    ['多倫多', 'Toronto', 43.6532, -79.3832, 'America/Toronto'],
  ];
  const normName = (t) => String(t).toLowerCase().replace(/臺/g, '台').replace(/[市縣\s]/g, '');

  function localPlaces(name) {
    const q = normName(name);
    if (!q) return [];
    return CITIES.filter(([zh, alias]) => normName(zh + alias).includes(q) || q.includes(normName(zh)))
      .map(([zh, alias, lat, lon, tz]) => ({ label: zh + '（' + alias.replace(/^[^A-Za-z]*/, '') + '）', lat, lon, tz }));
  }

  // 先查內建清單，再查 Open-Meteo；網路失敗但內建有結果時不算錯
  async function geocode(name) {
    const local = localPlaces(name);
    try {
      const url = 'https://geocoding-api.open-meteo.com/v1/search?count=6&language=zh&format=json&name=' + encodeURIComponent(name);
      const r = await fetch(url);
      if (!r.ok) throw new Error('地點查詢失敗 (' + r.status + ')');
      const j = await r.json();
      const online = (j.results || []).map((x) => ({
        label: [x.name, x.admin1, x.country].filter(Boolean).join('，'),
        lat: x.latitude, lon: x.longitude, tz: x.timezone,
      })).filter((o) => !local.some((l) => Math.abs(l.lat - o.lat) < 0.2 && Math.abs(l.lon - o.lon) < 0.2));
      return local.concat(online).slice(0, 8);
    } catch (e) {
      if (local.length) return local;
      throw e;
    }
  }

  // 今日星象：現在的行星位置、月相，以及對本命太陽／月亮／上升的主要行運相位
  const MOON_PHASES = ['新月', '眉月', '上弦月', '盈凸月', '滿月', '虧凸月', '下弦月', '殘月'];
  function today(natal, now = new Date()) {
    const later = new Date(now.getTime() + 86400000);
    const planets = PLANETS.map((p) => {
      const lon = longitudeOf(p.key, now);
      const speed = ((longitudeOf(p.key, later) - lon + 540) % 360) - 180;
      return { ...p, lon, retro: p.key !== 'Sun' && p.key !== 'Moon' && speed < 0, ...signOf(lon) };
    });
    const ph = A.MoonPhase(now);
    const phase = MOON_PHASES[Math.floor(((ph + 22.5) % 360) / 45)];
    const transits = [];
    if (natal) {
      const targets = [natal.planets[0], natal.planets[1]];
      if (natal.asc) targets.push({ zh: '上升', lon: natal.asc.lon });
      for (const t of planets) {
        if (t.key === 'Moon') continue; // 月亮移動太快，不列入
        for (const n of targets) {
          let diff = Math.abs(t.lon - n.lon); if (diff > 180) diff = 360 - diff;
          for (const a of ASPECTS) {
            if (a.angle === 60) continue;
            const orb = Math.abs(diff - a.angle);
            if (orb <= 3) transits.push({ t, n, name: a.name, orb, cls: a.cls });
          }
        }
      }
      transits.sort((x, y) => x.orb - y.orb);
    }
    return { date: now, planets, phase, transits: transits.slice(0, 5),
      retro: planets.filter((p) => p.retro).map((p) => p.zh) };
  }

  function todayText(t) {
    const sun = t.planets[0], moon = t.planets[1];
    let s = `今日星象：太陽${sun.sign}座，月亮${moon.sign}座（${t.phase}）`;
    s += t.retro.length ? `；逆行中：${t.retro.join('、')}` : '；目前沒有行星逆行';
    if (t.transits.length) s += '\n對本命盤的行運：' + t.transits.map((x) => `行運${x.t.zh}${x.name}本命${x.n.zh}（${x.orb.toFixed(1)}°）`).join('、');
    return s;
  }

  function summaryText(chart) {
    const lines = chart.planets.map((p) => `${p.zh}：${p.text}${p.retro ? '（逆行）' : ''}${p.house ? '，第 ' + p.house + ' 宮' : ''}`);
    if (chart.asc) lines.unshift(`上升：${chart.asc.text}；天頂：${chart.mc.text}`);
    const asp = chart.aspects.slice(0, 8).map((a) => `${a.a.zh}${a.name}${a.b.zh}（容許 ${a.orbVal.toFixed(1)}°）`);
    if (asp.length) lines.push('主要相位：' + asp.join('、'));
    lines.push('元素分布（前七星）：' + Object.entries(chart.elements).map(([k, v]) => k + v).join(' '));
    if (!chart.timeKnown) lines.push('（未提供出生時間：月亮位置以中午估算，無上升與宮位）');
    return lines.join('\n');
  }

  window.ASTRO = { SIGN_GLYPHS, computeChart, chartSvg, geocode, localPlaces, today, todayText, summaryText, SIGNS, SIGN_TRAITS, SIGN_ELEMENT, HOUSE_THEMES };
})();
