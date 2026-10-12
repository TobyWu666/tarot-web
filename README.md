# 星語塔羅（自用）

純前端網站，不需要安裝任何東西。

## 使用
- **最簡單**：直接雙擊 `index.html` 用瀏覽器開啟。
- 或在此資料夾執行 `python3 -m http.server 8000`，打開 http://localhost:8000
- 第一次使用：右上角 ⚙ 貼上 Gemini API Key → 儲存（只存在你的瀏覽器）。

## 功能
- 抽牌：單張、三張（時間之流／身心靈）、關係、二選一、凱爾特十字；可含逆位；點擊牌面看詳細牌義
- 我的星盤：出生日期、時間、地點 → 十大行星、上升、天頂、整宮制宮位、相位、元素分布
- 血型性格：A / B / O / AB
- 今日星象：當下太陽、月亮星座、月相、逆行行星，以及對你本命盤的行運，會一起放進解讀
- 出生地查詢：內建台灣各縣市與常見國際城市，沒網路也查得到；其他地方再用線上查詢
- 綜合參考：不需 AI 的規則式摘要
- AI 深度解讀：Gemini 串流回覆，可追問、可一鍵複製；模型忙碌時自動改用備用模型
- 紀錄：抽牌與 AI 解讀存在瀏覽器 localStorage

## 部署（選用）
整個資料夾可直接放到 GitHub Pages / Vercel / Netlify。**不要**上傳 `config.local.js`。

## 素材授權
- 視覺規範：design/（夜航 Night Passage 設計系統，tokens.css + components.css），頁面版型在 css/app.css，只引用 token
- 牌圖：1909 Rider-Waite-Smith 掃描（公有領域），取自 metabismuth/tarot-json（MIT）
- 星曆計算：astronomy-engine（MIT）
- 地點查詢：Open-Meteo Geocoding API（免費、免金鑰）
