// Gemini API（瀏覽器直連，API Key 存在 localStorage，不寫進程式碼）
(function () {
  const BASE = 'https://generativelanguage.googleapis.com/v1beta';
  const DEFAULT_MODEL = 'gemini-flash-latest';
  const FALLBACKS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function getKey() { return store('gemini_key') || (window.TAROT_CONFIG || {}).geminiApiKey || ''; }
  function getModel() { return store('gemini_model') || (window.TAROT_CONFIG || {}).model || DEFAULT_MODEL; }

  async function listModels(key) {
    const r = await fetch(BASE + '/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
      .filter((n) => /^gemini/.test(n) && !/(tts|image|audio|live|embedding|transcribe|robotics|computer-use|banana)/.test(n));
  }

  // 在 claude.ai Artifact 裡，瀏覽器不能連外部 API，改用頁面內建的 Claude（用的是檢視者自己的 Claude 額度）
  let samplePromise = null;
  function claudeSample() {
    if (!window.claude || typeof window.claude.use !== 'function') return Promise.resolve(null);
    if (!samplePromise) samplePromise = window.claude.use('sample').catch(() => null);
    return samplePromise;
  }

  async function streamClaude(sample, { contents, system, onText, signal }) {
    const input = contents.map((c, i) => ({
      role: c.role === 'model' ? 'assistant' : 'user',
      content: (i === 0 && system ? system + '\n\n' : '') + c.parts.map((p) => p.text).join(''),
    }));
    try {
      const { text } = await sample(input, { onText: ({ text }) => onText && onText(text), signal, cache: false });
      return { text, model: 'Claude' };
    } catch (e) {
      const msg = {
        not_granted: '你沒有允許這個頁面使用 Claude，所以無法產生 AI 解讀。重新整理頁面後可以再允許一次。',
        rate_limited: '短時間內請求太多次，請稍等一下再試。',
      }[e && e.code] || ('AI 解讀失敗：' + ((e && e.message) || '未知錯誤'));
      throw new Error(msg);
    }
  }

  // 有沒有可用的 AI：Gemini Key 或頁面內建的 Claude
  async function available() {
    return !!getKey() || !!(await claudeSample());
  }

  // 串流產生；onText 會收到累積文字。遇到 429/503 自動換備用模型
  async function stream(opts) {
    const key = getKey();
    if (!key) {
      const sample = await claudeSample();
      if (sample) return streamClaude(sample, opts);
      const e = new Error('尚未設定 Gemini API Key，請點右上角的設定貼上。'); e.code = 'nokey'; throw e;
    }
    try {
      return await streamGemini(key, opts);
    } catch (e) {
      // 連不到 Google（例如在 Artifact 裡被擋）時，改用內建的 Claude
      if (e instanceof TypeError) {
        const sample = await claudeSample();
        if (sample) return streamClaude(sample, opts);
        throw new Error('連不到 Gemini，請確認網路連線。');
      }
      throw e;
    }
  }

  async function streamGemini(key, { contents, system, onText, signal }) {
    const tried = [];
    const models = [getModel(), ...FALLBACKS.filter((m) => m !== getModel())];
    let lastErr;
    for (const model of models) {
      tried.push(model);
      try {
        return { text: await streamOnce(model, key, contents, system, onText, signal), model };
      } catch (e) {
        lastErr = e;
        if (!e.retryable) throw e;
      }
    }
    throw new Error(lastErr.message + '（已嘗試：' + tried.join('、') + '）');
  }

  async function streamOnce(model, key, contents, system, onText, signal) {
    const body = {
      contents,
      generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const r = await fetch(`${BASE}/models/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try { const j = await r.json(); msg = (j.error && j.error.message) || msg; } catch (e) { /* ignore */ }
      const err = new Error(friendly(r.status, msg));
      err.retryable = r.status === 429 || r.status === 503 || r.status === 500 || r.status === 404;
      throw err;
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '', text = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        try {
          const j = JSON.parse(line.slice(5));
          const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
          for (const p of parts) if (p.text && !p.thought) text += p.text;
          onText && onText(text);
        } catch (e) { /* 不完整的片段 */ }
      }
    }
    if (!text) { const e = new Error('模型沒有回傳內容'); e.retryable = true; throw e; }
    return text;
  }

  function friendly(status, msg) {
    if (status === 400 && /API key/i.test(msg)) return 'API Key 無效，請到設定確認。';
    if (status === 403) return 'API Key 沒有權限（' + msg + '）';
    if (status === 429) return '免費額度暫時用完或請求太頻繁，請稍後再試。';
    if (status === 503) return '模型目前忙碌中。';
    return msg;
  }

  window.GEMINI = { getKey, getModel, listModels, stream, available, store, DEFAULT_MODEL };
})();
