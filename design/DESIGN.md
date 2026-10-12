# 夜航 Night Passage · 塔羅網站設計系統 v2.0

這份是整個網站的視覺規範。建置時請：

1. 在 `<head>` 載入字體與兩支 CSS：
   ```html
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus&family=Noto+Serif+TC:wght@500;700&family=Noto+Sans+TC:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
   <link rel="stylesheet" href="design/tokens.css">
   <link rel="stylesheet" href="design/components.css">
   ```
2. 所有顏色、字級、間距、圓角、陰影、動畫時間都用 `tokens.css` 的變數，不寫死數值。
3. 需要新元件時，先找有沒有現成的；真的沒有，用同一組 token 組出來，並回報給設計串補進規範。

視覺參考頁：`design/index.html`（所有元件的實際樣子）。

---

## 1. 設計原則

| 原則 | 意思 | 做法 |
|---|---|---|
| **一個強調色** | 黃銅金只留給「可以按的、被選中的、最重要的」 | 主按鈕、選中狀態、焦點框、牌背。其他都用中性色 |
| **層次靠明度** | 越靠近使用者的面越亮 | L0 頁面 → L1 區塊 → L2 解讀面板 → L3 彈窗，每升一層：底色亮一階、邊框強一階、陰影大一階 |
| **字體分工** | 每種字只做一件事 | Marcellus＝拉丁標題與牌名；思源宋體＝中文標題與總結句；思源黑體＝內文介面；Plex Mono＝度數、日期、數據 |
| **留白多於線** | 用間距分組，少畫框 | 同組 gap 用 `--space-3/4`，區塊之間 `--space-7/8`，只有需要「浮起來」的東西才加框 |
| **動畫只給儀式** | 洗牌、發牌、翻牌是唯一有戲的動作 | 其他互動只做 140ms 的顏色過渡。支援減少動態設定 |

## 2. 色彩

**預設深色「夜航」**，系統是淺色時自動切到「晨霧」，也可用 `<html data-theme="light|dark">` 手動指定。

| Token | 用途 |
|---|---|
| `--color-bg` | L0 頁面底 |
| `--color-surface` | L1 區塊、輸入表單區 |
| `--color-surface-raised` | L2 解讀面板、浮起卡片 |
| `--color-surface-overlay` | L3 彈窗、下拉選單 |
| `--color-surface-sunken` | 輸入框、分段選擇器內凹 |
| `--color-border-subtle / border / border-strong` | 由弱到強的分隔線 |
| `--color-text / text-secondary / text-muted` | 主要 / 次要 / 註解 |
| `--color-accent` (+ hover / press / soft / line) | 黃銅金強調 |
| `--color-success / warning / danger / info` | 只用於狀態訊息 |
| `--color-fire / earth / air / water` | 四元素：星盤星座、牌組花色（權杖 / 錢幣 / 寶劍 / 聖杯） |
| `--card-back-* / --card-face-*` | 塔羅牌本身，兩種主題都固定不變（像實體牌） |

規則：
- 金色面積一個畫面不超過 10%。
- 一個畫面只有一顆 `.btn--primary`。
- 元素色只出現在星盤和花色標記，不拿來做按鈕或背景。

## 3. 字體

| Token | 字級 | 用途 |
|---|---|---|
| `--text-4xl` 49px | 首頁 hero（全站只用一次） |
| `--text-3xl` 39px | 頁面主標（大螢幕） |
| `--text-2xl` 31px | h1 |
| `--text-xl` 25px | h2 區塊標題 |
| `--text-lg` 20px | h3、解讀總結句 |
| `--text-md` 16px | 內文 |
| `--text-sm` 14px | 介面、按鈕、說明 |
| `--text-xs` 12px | eyebrow、標籤、chip |
| `--text-2xs` 11px | 星盤小字 |

- 內文行高 `--leading-body` (1.75)，中文需要比較鬆。
- 解讀內文寬度上限 `--measure`（約 34 個中文字一行）。
- 區塊標題上方可放 `.eyebrow`（拉丁大寫，例如 `THREE-CARD SPREAD`），下方接中文標題。

## 4. 間距、圓角、層次

- 間距 4px 基準：`--space-1` 4 → `--space-9` 96。元件內用 2–5，區塊之間用 7–8。
- 頁面左右留白 `--gutter`（手機 16px，大螢幕 32px）。內容最寬 `--container` 1152px，閱讀頁 `--container-narrow` 672px。
- 圓角：chip 用 pill，按鈕和輸入框 8px，面板 12px，彈窗 20px，塔羅牌 10px。
- 陰影：`--shadow-1/2/3` 對應 L1/L2/L3；`--shadow-card` 專給塔羅牌；`--glow-accent` 只給「被選中的牌」。

## 5. 動態

| Token | 時間 | 用在 |
|---|---|---|
| `--dur-instant` | 80ms | 按鈕按下 |
| `--dur-fast` | 140ms | hover 顏色 |
| `--dur-base` | 220ms | 展開、淡入 |
| `--dur-slow` | 420ms | 面板進場、發一張牌 |
| `--dur-flip` | 720ms | 翻牌（`--ease-in-out`） |
| `--dur-shuffle` | 1200ms | 洗牌 |
| `--stagger` | 90ms | 牌陣逐張出現間隔 |

抽牌流程的節奏：**洗牌 1.2s → 使用者點選 → 發牌逐張 90ms 間隔 → 全部到位後依序翻牌（每張間隔 300ms）→ 解讀面板淡入並開始逐字出現**。

---

## 6. 元件規格

### 按鈕 `.btn`
| 變體 | class | 用途 |
|---|---|---|
| 主要 | `.btn--primary` | 抽牌、開始解讀、送出（一畫面一顆） |
| 次要 | `.btn--secondary` | 換牌陣、看星盤 |
| 幽靈 | `.btn--ghost` | 取消、重新洗牌、清除 |
尺寸 `.btn--sm`(36px) / 預設(44px) / `.btn--lg`(52px)；`.btn--icon` 正方形。狀態：hover、`:active` 下壓 1px、`:disabled` 40% 透明、`.is-loading` 轉圈。

### 表單
```html
<div class="field">
  <label class="field__label" for="birth-date">出生日期</label>
  <input class="input" type="date" id="birth-date">
  <span class="field__hint">用來計算太陽、月亮與上升星座</span>
</div>
```
- 輸入框是內凹面（sunken），聚焦時金框 + 3px 淡金光暈。
- 錯誤：外層加 `.is-invalid`，下面放 `.field__error`。
- 日期、時間輸入用等寬字。
- **血型**用 `.segmented`（A / B / O / AB 四格），不要用下拉選單。
- 出生資料表單排法：日期、時間同一列，出生地一整列，血型一列；手機全部單欄。

### Chip `.chip`
小標籤，用於解讀來源（「塔羅 · 三張」「星盤」「血型 O」）、正逆位、元素。`.chip--accent` 金色；`.chip--fire/earth/air/water` 元素色並可加 `.chip__dot`。

### 面板 `.panel`
`.panel`(L1) / `.panel--raised`(L2) / `.panel--overlay`(L3)。內距 `--space-5`。標頭用 `.panel__header`（左標題、右操作）。

### 分頁 `.tabs`
三個主功能切換：塔羅 / 星盤 / 血型。底線式，選中為金色底線，`aria-selected="true"`。

### 塔羅牌 `.tarot`
- 比例 **7:12**（實體塔羅 70×120mm）。尺寸 `.tarot--sm` 72px（牌堆）/ 預設 136px（牌陣）/ `.tarot--lg` 208px（單張詳解）。
- 牌背：深靛底、斜格細紋、雙線金框、中央八芒星。兩種主題都一樣。
- 牌面：紙色底、細內框；上方羅馬數字（Marcellus）、中間圖、下方英文牌名大寫 + 中文牌名。
- 狀態：`.is-flipped` 翻到正面；`.is-reversed` 逆位（正面倒置）；`.is-interactive` 可點（hover 上浮 6px）；`.is-selected` 上浮 10px + 金光；`.is-dealing` + `style="--i:n"` 發牌進場。
- 小阿爾克那數字用阿拉伯數字或宮廷牌名（例：`ACE`、`KNIGHT`），花色可在 `.tarot__numeral` 旁放元素色小點。
- 沒有牌圖時 `.tarot__art` 會顯示深靛漸層當佔位。
- 牌圖（RWS 掃描）用 `object-fit: cover` 填滿 `.tarot__art`，原圖上下印刷的編號與牌名帶會被裁掉；這是刻意的，牌框自己已經有羅馬數字和牌名，不要重複。

### 牌陣 `.spread`
每個位置一個 `.spread__slot`：牌 + `.spread__label`（`<b>過去</b>The Past`）。還沒抽的位置用 `.spread__empty` 虛線框。三張牌陣橫排；凱爾特十字由建置端用 grid 排，仍用同樣的 slot。

### 解讀面板 `.reading`
L2 面板，三段：
1. `.reading__header`：eyebrow（例 `READING`）＋ 中文標題 ＋ `.reading__sources` 來源 chips。
2. `.reading__body.prose`：Gemini 輸出。建議請 Gemini 回傳的結構＝每個主題一個 `h3`、段落、最後一句 `blockquote` 總結。
3. `.reading__footer`：產生時間（等寬字）＋ 重新解讀按鈕（`.btn--ghost.btn--sm`）。
- 逐字輸出中加 `.is-streaming`，最後一段尾端會有金色游標閃爍。
- 等第一個字之前用 `.skeleton` 三到四條（寬度 90% / 100% / 75%）。
- API 錯誤或 key 額度用完：在面板內放 `.notice--danger`，寫清楚發生什麼、怎麼辦（例：「今天的解讀額度用完了，明天再試」）。

### 星盤 `.chart`
SVG 星盤，由外往內：
1. 星座圈（外圈，`.chart__ring--zodiac` 填 L1 底色），12 個星座符號用元素色（`.chart__sign--fire` 等）。
2. 宮位圈：宮位分隔線 `.chart__house`，宮位數字 `.chart__house-num`。
3. 行星：符號 `.chart__planet` + 實際位置小金點 `.chart__planet-dot`。
4. 中心相位線：和諧（三分、六分）藍實線、緊張（四分、對分）紅虛線、合相金線。
5. ASC / MC 主軸用金色 `.chart__axis`，標籤 `.chart__axis-label`。
- 上升點固定在左側（9 點鐘方向），這是占星慣例。
- 星盤旁邊配 `.data-table` 行星位置表（行星 / 星座 / 度數 / 宮位），度數用等寬字 `15°42′`。手機時表格放星盤下方。
- 元素比例用 `.element-bar`。

### v1.1 收錄的元件（來自建置端）
| 元件 | 用途 | 備註 |
|---|---|---|
| `.toggle` | 勾選開關（包含逆位、結合星盤與血型） | 原生 checkbox，`accent-color` 金 |
| `.segmented--wrap` | 選項多時可換行的分段選擇器（牌陣種類） | 桌機 6 欄、手機 3 欄 |
| `.deck` | 抽牌用牌堆，小牌重疊 | `.is-shuffling` 洗牌、`.is-taken` 已抽、`.is-complete` 收起 |
| `.meaning-list > .meaning` | 每張牌的位置、牌名、牌義 | 左小牌右文字，項目間細線 |
| `.reading__thread / .reading__q / .reading__ask` | 解讀下方的追問對話 | **問題泡泡用中性 L1 面，不用金色** |
| `.big3 > .big3__item` | 太陽、月亮、上升三要素 | 星座名用宋體 lg |
| `.aspect-list` + `.aspect-mark` | 相位列表，線型和星盤相位線一致 | |
| `.retro` | 行星逆行 R | **用 muted，不用 danger**（逆行不是錯誤） |
| `.history-item` | 紀錄頁，`<details>` 展開 | |
| `dialog.modal` | 原生 dialog 彈窗 | 搭配 `.panel--overlay` |
手機（≤48rem）牌尺寸自動縮成 sm 52 / md 100 / lg 160px，已寫在 tokens.css。

### 提示
- `.notice` 頁內提示（左側 3px 狀態色條）。
- `.toast` 底部置中短訊息，例：「已複製解讀」。
- `.scrim` + `.modal.panel--overlay` 彈窗。

---

## 7. 頁面版型建議

- **頂部導覽**：左側網站名（Marcellus 大寫 + 中文），右側 `.tabs`。高度 64px，L0 底、底部 `--color-border-subtle` 線，sticky。
- **塔羅頁**：上方 eyebrow + 標題 + 問題輸入框 → 中間牌陣（置中，留大量空間）→ 下方解讀面板（`--container-narrow` 寬）。
- **星盤頁**：大螢幕左右兩欄（左表單 / 右星盤＋表格），手機單欄。
- **血型頁**：`.segmented` 選血型 → 解讀面板。
- **綜合解讀**：三個來源都有資料時，解讀面板的 sources 同時顯示三個 chip。
- 背景：L0 純色即可，不加星空圖或漸層；儀式感交給牌本身。

## 8. 文案語氣
- 平實、溫和、具體；不用「命運之輪已轉動✨」這種腔調，不用 emoji。
- 按鈕寫動作：「抽三張牌」「開始解讀」「重新洗牌」。
- 錯誤說清楚原因和下一步，不道歉堆疊。

---

## v2.0 改版重點（2026-10-12）

使用者回饋「整體有點醜、洗牌抽牌動畫不夠」，v2 把網站從「乾淨但空」推向「有夜空氛圍、有儀式感」。

**氛圍**
- 網站固定深色（`<html data-theme="dark">`）。淺色 token 保留但不再預設跟系統切換。
- 背景：底色上疊三團星雲光（`--sky-nebula-*`），加上 `js/sky.js` 畫的星點 canvas（緩慢閃爍、偶爾一顆流星，減少動態時為靜態）。
- 面板改為玻璃材質：`--glass-bg` 半透明 + `--glass-blur` 模糊 + 上緣 `--glass-highlight` 細光，讓星空透出來，層次更明顯。
- 主按鈕改為金屬漸層 `--gradient-brass`，hover 有一道光澤滑過。
- 頁首標題組 `.title-block`：eyebrow、大標、中間帶小星的金色細線、說明文字，全部置中。

**牌背 v2**：內嵌 SVG 紋章，雙框、四角菱形、日輪八芒星、24 道光芒、上下新月、散落星點；hover 時一道金屬反光滑過。

**抽牌儀式（`js/ritual.js`）**
| 階段 | 動作 | 時間 token |
|---|---|---|
| 落牌 | 牌堆從上方落到桌面 | `--dur-slow` |
| 洗牌 ×2 | 鴿尾洗牌：分左右兩半、傾斜、交錯落回 | `--dur-riffle` |
| 疊洗 | 上方一疊抽起、放到底部，兩次 | `--dur-riffle` |
| 切牌 | 分成三疊，使用者憑直覺點一疊；那疊抬起、放到最上面。真的會依選的疊切開整副牌 | `--dur-cut` |
| 展開 | 78 張從中央往兩側展成扇形 | `--dur-fan`，間隔 6ms |
| 選牌 | hover 時沿半徑上浮 22px 並亮金框；點擊後牌飛到牌位（弧線、放大、輕微回彈） | `--dur-fly`、`--ease-spring` |
| 翻牌 | 抬起放大 → 3D 翻面 → 金光爆開 → 一道光掃過牌面；依序翻牌每張間隔 520ms | `--dur-flip` |
- 桌面 `.ritual__table`：中央淡金光暈 + 一圈淡金雙線圓（像占星盤刻度）。
- 洗牌與切牌時有「略過動畫」按鈕；系統開啟減少動態時全部瞬間完成。
- 空牌位 `.spread__empty` 顯示羅馬數字 I、II、III。

---

## 變更紀錄
- **v2.0**（2026-10-12）：夜空氛圍、玻璃面板、金屬按鈕、新牌背、完整抽牌儀式動畫（洗牌、切牌、扇形、飛牌、翻牌）。
- **v1.1**（2026-10-11）：收錄建置端的 10 個元件；`.reading__q` 改為中性底、`.retro` 改為 muted；手機牌尺寸移進 tokens。
- **v1.0**（2026-10-11）：初版。
