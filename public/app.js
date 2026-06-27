const state = {
  workbook: null,
  sheets: {},
  rows: [],
  headers: [],
  mapping: {},
  normalizedTrades: [],
  result: null,
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  fileName: document.querySelector("#fileName"),
  analyzeButton: document.querySelector("#analyzeButton"),
  sampleButton: document.querySelector("#sampleButton"),
  clearButton: document.querySelector("#clearButton"),
  mappingPanel: document.querySelector("#mappingPanel"),
  sheetSelectWrap: document.querySelector("#sheetSelectWrap"),
  sheetSelect: document.querySelector("#sheetSelect"),
  totalPnl: document.querySelector("#totalPnl"),
  totalReturn: document.querySelector("#totalReturn"),
  winRate: document.querySelector("#winRate"),
  tradeCount: document.querySelector("#tradeCount"),
  dailyChart: document.querySelector("#dailyChart"),
  monthlyChart: document.querySelector("#monthlyChart"),
  symbolChart: document.querySelector("#symbolChart"),
  symbolCaption: document.querySelector("#symbolCaption"),
  symbolTable: document.querySelector("#symbolTable"),
  monthTable: document.querySelector("#monthTable"),
  quarterTable: document.querySelector("#quarterTable"),
  tradePreview: document.querySelector("#tradePreview"),
  previewCaption: document.querySelector("#previewCaption"),
  exportSymbol: document.querySelector("#exportSymbol"),
  exportTrades: document.querySelector("#exportTrades"),
  toast: document.querySelector("#toast"),
};

const mapEls = {
  date: document.querySelector("#mapDate"),
  symbol: document.querySelector("#mapSymbol"),
  name: document.querySelector("#mapName"),
  side: document.querySelector("#mapSide"),
  quantity: document.querySelector("#mapQuantity"),
  price: document.querySelector("#mapPrice"),
  amount: document.querySelector("#mapAmount"),
  buyAverage: document.querySelector("#mapBuyAverage"),
  sellAverage: document.querySelector("#mapSellAverage"),
  fee: document.querySelector("#mapFee"),
  tax: document.querySelector("#mapTax"),
  realized: document.querySelector("#mapRealized"),
  returnPct: document.querySelector("#mapReturnPct"),
};

const headerHints = {
  date: ["거래일", "거래일자", "일자", "체결일", "체결일자", "매매일", "날짜", "date", "trade date"],
  symbol: ["종목코드", "코드", "티커", "ticker", "symbol", "종목번호"],
  name: ["종목명", "종목", "상품명", "name", "security", "description"],
  side: ["매매구분", "거래구분", "구분", "매수매도", "매도매수", "side", "buy/sell", "type"],
  quantity: ["수량", "체결수량", "거래수량", "청산수량", "주수", "qty", "quantity", "shares"],
  price: ["단가", "체결가", "가격", "매매단가", "매도평균가", "price", "execution price"],
  amount: ["거래금액", "체결금액", "매매금액", "금액", "amount", "trade amount", "gross"],
  buyAverage: ["매입평균가", "매수평균가", "평균매입가", "평균매수가", "buy average", "avg buy"],
  sellAverage: ["매도평균가", "평균매도가", "sell average", "avg sell"],
  fee: ["수수료", "수수료금액", "commission", "fee", "fees"],
  tax: ["세금", "제세금", "거래세", "tax", "taxes"],
  realized: ["실현손익", "매매손익", "손익금액", "손익", "수익", "profit", "p/l", "realized", "realized p&l"],
  returnPct: ["수익률", "수익률(%)", "수익율", "profit rate", "return", "return pct"],
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function cleanHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function formatMoney(value) {
  if (value == null || Number.isNaN(value)) return "--";
  const sign = value < 0 ? "-" : "";
  return `${sign}${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Math.abs(value))}`;
}

function formatSignedMoney(value) {
  if (value == null || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Math.abs(value))}`;
}

function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return "--";
  return `${value > 0 ? "+" : ""}${formatNumber(value, 2)}%`;
}

function formatRate(value) {
  if (value == null || Number.isNaN(value)) return "--";
  return `${formatNumber(value, 2)}%`;
}

function formatCompactMoney(value) {
  if (value == null || Number.isNaN(value)) return "--";
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${sign}${formatNumber(abs / 100000000, abs >= 1000000000 ? 1 : 2)}억`;
  if (abs >= 10000) return `${sign}${formatNumber(abs / 10000, abs >= 100000 ? 0 : 1)}만`;
  return `${sign}${formatNumber(abs, 0)}`;
}

function formatShortDate(value) {
  const text = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${Number(text.slice(5, 7))}/${Number(text.slice(8, 10))}`;
  return text;
}

function cssClassBySign(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "";
}

function parseNumber(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value).trim();
  if (!text || text === "-") return 0;
  const negative = /^\(.*\)$/.test(text) || text.includes("▲") || text.includes("-");
  text = text
    .replace(/[(),₩$%]/g, "")
    .replace(/[^\d.\-]/g, "")
    .replace(/(?!^)-/g, "");
  const number = Number(text);
  if (!Number.isFinite(number)) return 0;
  return negative && number > 0 ? -number : number;
}

function parseDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  const parsed = new Date(raw.replace(/\./g, "-").replace(/\//g, "-"));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function normalizeSide(value) {
  const text = String(value ?? "").toLowerCase().trim();
  if (!text) return "unknown";
  if (text.includes("매수") || text.includes("buy") || text === "b" || text.includes("입고")) return "buy";
  if (text.includes("매도") || text.includes("sell") || text === "s" || text.includes("출고")) return "sell";
  return "unknown";
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quote = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quote && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quote = !quote;
    } else if (char === delimiter && !quote) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quote) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => String(item).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((item) => String(item).trim() !== "")) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ""])));
}

function rowsFromMatrix(matrix) {
  const headerIndex = matrix.findIndex((row) => row.filter((cell) => String(cell ?? "").trim() !== "").length >= 3);
  const headers = (matrix[headerIndex] || []).map((item, index) => String(item || `컬럼${index + 1}`).trim());
  return matrix.slice(headerIndex + 1).map((items) => {
    return Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ""]));
  });
}

function guessMapping(headers) {
  const normalized = headers.map((header) => ({ header, clean: cleanHeader(header) }));
  const mapping = {};
  Object.entries(headerHints).forEach(([field, hints]) => {
    const found = normalized.find(({ clean }) => hints.some((hint) => clean.includes(cleanHeader(hint))));
    mapping[field] = found?.header || "";
  });
  return mapping;
}

function populateMappingControls() {
  const options = ["", ...state.headers];
  Object.entries(mapEls).forEach(([field, select]) => {
    select.innerHTML = options.map((header) => `<option value="${escapeHtml(header)}">${header || "사용 안 함"}</option>`).join("");
    select.value = state.mapping[field] || "";
  });
}

function setRows(rows) {
  state.rows = rows.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
  state.headers = Object.keys(state.rows[0] || {});
  state.mapping = guessMapping(state.headers);
  populateMappingControls();
  els.mappingPanel.hidden = false;
  els.analyzeButton.disabled = !state.rows.length;
  renderPreviewRaw();
}

function renderPreviewRaw() {
  const mapping = getMappingFromControls();
  const trades = normalizeRows(mapping).slice(0, 12);
  renderTradePreview(trades);
  els.previewCaption.textContent = state.rows.length ? `${state.rows.length}개 행을 읽었습니다.` : "최대 12개 거래를 표시합니다.";
}

function getMappingFromControls() {
  return Object.fromEntries(Object.entries(mapEls).map(([field, select]) => [field, select.value]));
}

function normalizeRows(mapping) {
  return state.rows
    .map((row, index) => {
      const quantity = Math.abs(parseNumber(row[mapping.quantity]));
      const price = Math.abs(parseNumber(row[mapping.price]));
      const buyAverage = Math.abs(parseNumber(row[mapping.buyAverage]));
      const sellAverage = Math.abs(parseNumber(row[mapping.sellAverage]));
      const fee = Math.abs(parseNumber(row[mapping.fee]));
      const tax = Math.abs(parseNumber(row[mapping.tax]));
      const amountRaw = parseNumber(row[mapping.amount]);
      let side = normalizeSide(row[mapping.side]);
      let sourceType = "trade";
      let effectivePrice = price || sellAverage || buyAverage;
      let amount = amountRaw ? Math.abs(amountRaw) : quantity * effectivePrice;
      let realizedCostInput = null;
      const realizedInput = mapping.realized ? parseNumber(row[mapping.realized]) : null;
      const returnInput = mapping.returnPct ? parseNumber(row[mapping.returnPct]) : null;

      if (side === "unknown" && realizedInput != null && (buyAverage || sellAverage || returnInput != null)) {
        sourceType = "period";
        side = "sell";
        realizedCostInput = buyAverage && quantity ? buyAverage * quantity : null;
        if (!realizedCostInput && returnInput) realizedCostInput = Math.abs(realizedInput / (returnInput / 100));
        if (!amount && realizedCostInput != null) amount = realizedCostInput + realizedInput;
        if (sellAverage && quantity) amount = sellAverage * quantity;
        effectivePrice = sellAverage || (quantity ? amount / quantity : effectivePrice);
      }

      const symbol = String(row[mapping.symbol] || row[mapping.name] || "UNKNOWN").trim();
      const name = String(row[mapping.name] || symbol).trim();
      return {
        id: index + 1,
        date: parseDate(row[mapping.date]),
        symbol,
        name,
        side,
        sourceType,
        quantity,
        price: effectivePrice || (quantity ? amount / quantity : 0),
        amount,
        buyAverage,
        sellAverage,
        fee,
        tax,
        cost: fee + tax,
        realizedInput,
        realizedPnl: sourceType === "period" ? realizedInput : null,
        realizedCostInput,
        returnInput,
      };
    })
    .filter((trade) => trade.date && trade.symbol && trade.quantity > 0 && trade.side !== "unknown")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

function emptyBucket() {
  return {
    buyAmount: 0,
    sellAmount: 0,
    realizedPnl: 0,
    realizedCost: 0,
    fees: 0,
    tradeCount: 0,
    sellCount: 0,
    winCount: 0,
  };
}

function getBucket(map, key) {
  if (!map.has(key)) map.set(key, emptyBucket());
  return map.get(key);
}

function quarterKey(date) {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

function analyzeTrades(trades) {
  const lotsBySymbol = new Map();
  const symbolMap = new Map();
  const dayMap = new Map();
  const monthMap = new Map();
  const quarterMap = new Map();
  const enriched = [];
  const totals = emptyBucket();

  trades.forEach((trade) => {
    const symbolKey = trade.symbol || trade.name;
    if (!lotsBySymbol.has(symbolKey)) lotsBySymbol.set(symbolKey, []);
    const lots = lotsBySymbol.get(symbolKey);
    const symbol = getBucket(symbolMap, symbolKey);
    symbol.name = trade.name;
    symbol.tradeCount += 1;
    symbol.fees += trade.cost;
    totals.tradeCount += 1;
    totals.fees += trade.cost;

    let realizedPnl = 0;
    let realizedCost = 0;

    if (trade.side === "buy") {
      const totalCost = trade.amount + trade.cost;
      lots.push({ quantity: trade.quantity, unitCost: totalCost / trade.quantity });
      symbol.buyAmount += totalCost;
      totals.buyAmount += totalCost;
    }

    if (trade.side === "sell") {
      const proceeds = trade.amount - trade.cost;
      symbol.sellAmount += proceeds;
      totals.sellAmount += proceeds;
      symbol.sellCount += 1;
      totals.sellCount += 1;

      if (trade.sourceType === "period") {
        realizedPnl = trade.realizedInput ?? 0;
        realizedCost = trade.realizedCostInput ?? Math.max(0, proceeds - realizedPnl);
        symbol.buyAmount += realizedCost;
        totals.buyAmount += realizedCost;
      } else if (trade.realizedInput != null && trade.realizedInput !== 0) {
        realizedPnl = trade.realizedInput;
        realizedCost = Math.max(0, proceeds - realizedPnl);
      } else {
        let remaining = trade.quantity;
        while (remaining > 0 && lots.length) {
          const lot = lots[0];
          const used = Math.min(remaining, lot.quantity);
          realizedCost += used * lot.unitCost;
          lot.quantity -= used;
          remaining -= used;
          if (lot.quantity <= 0.0000001) lots.shift();
        }
        if (remaining > 0) realizedCost += remaining * trade.price;
        realizedPnl = proceeds - realizedCost;
      }

      symbol.realizedPnl += realizedPnl;
      symbol.realizedCost += realizedCost;
      totals.realizedPnl += realizedPnl;
      totals.realizedCost += realizedCost;
      if (realizedPnl > 0) {
        symbol.winCount += 1;
        totals.winCount += 1;
      }

      const day = getBucket(dayMap, trade.date);
      const month = getBucket(monthMap, trade.date.slice(0, 7));
      const quarter = getBucket(quarterMap, quarterKey(trade.date));
      [day, month, quarter].forEach((bucket) => {
        bucket.realizedPnl += realizedPnl;
        bucket.realizedCost += realizedCost;
        bucket.sellAmount += proceeds;
        bucket.tradeCount += 1;
        bucket.sellCount += 1;
        if (realizedPnl > 0) bucket.winCount += 1;
      });
    }

    enriched.push({ ...trade, realizedPnl, realizedCost });
  });

  const positions = new Map();
  lotsBySymbol.forEach((lots, symbol) => {
    positions.set(
      symbol,
      lots.reduce((sum, lot) => sum + lot.quantity, 0)
    );
  });

  const addRates = (entry) => ({
    ...entry,
    returnPct: entry.realizedCost ? (entry.realizedPnl / entry.realizedCost) * 100 : null,
    winRate: entry.sellCount ? (entry.winCount / entry.sellCount) * 100 : null,
  });

  const symbols = [...symbolMap.entries()]
    .map(([symbol, bucket]) => ({
      symbol,
      name: bucket.name || symbol,
      remainingQty: positions.get(symbol) || 0,
      ...addRates(bucket),
    }))
    .sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl));

  const days = [...dayMap.entries()].map(([period, bucket]) => ({ period, ...addRates(bucket) })).sort((a, b) => a.period.localeCompare(b.period));
  const months = [...monthMap.entries()].map(([period, bucket]) => ({ period, ...addRates(bucket) })).sort((a, b) => a.period.localeCompare(b.period));
  const quarters = [...quarterMap.entries()].map(([period, bucket]) => ({ period, ...addRates(bucket) })).sort((a, b) => a.period.localeCompare(b.period));

  return {
    trades: enriched,
    totals: addRates(totals),
    symbols,
    days,
    months,
    quarters,
  };
}

function renderSummary(result) {
  els.totalPnl.textContent = formatMoney(result.totals.realizedPnl);
  els.totalPnl.className = cssClassBySign(result.totals.realizedPnl);
  els.totalReturn.textContent = formatPct(result.totals.returnPct);
  els.totalReturn.className = cssClassBySign(result.totals.returnPct);
  els.winRate.textContent = formatRate(result.totals.winRate);
  els.tradeCount.textContent = formatNumber(result.trades.length, 0);
}

function renderTables(result) {
  els.symbolTable.innerHTML = result.symbols
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.name)} <span class="muted">${escapeHtml(row.symbol)}</span></td>
          <td>${formatMoney(row.buyAmount)}</td>
          <td>${formatMoney(row.sellAmount)}</td>
          <td class="${cssClassBySign(row.realizedPnl)}">${formatMoney(row.realizedPnl)}</td>
          <td class="${cssClassBySign(row.returnPct)}">${formatPct(row.returnPct)}</td>
          <td>${formatNumber(row.remainingQty, 4)}</td>
          <td>${formatRate(row.winRate)}</td>
        </tr>
      `
    )
    .join("");

  els.monthTable.innerHTML = result.months
    .map(
      (row) => `
        <tr>
          <td>${row.period}</td>
          <td class="${cssClassBySign(row.realizedPnl)}">${formatMoney(row.realizedPnl)}</td>
          <td class="${cssClassBySign(row.returnPct)}">${formatPct(row.returnPct)}</td>
          <td>${formatNumber(row.tradeCount, 0)}</td>
        </tr>
      `
    )
    .join("");

  els.quarterTable.innerHTML = result.quarters
    .map(
      (row) => `
        <tr>
          <td>${row.period}</td>
          <td class="${cssClassBySign(row.realizedPnl)}">${formatMoney(row.realizedPnl)}</td>
          <td class="${cssClassBySign(row.returnPct)}">${formatPct(row.returnPct)}</td>
          <td>${formatNumber(row.tradeCount, 0)}</td>
        </tr>
      `
    )
    .join("");

  els.symbolCaption.textContent = `${result.symbols.length}개 종목을 집계했습니다.`;
}

function renderTradePreview(trades) {
  els.tradePreview.innerHTML = trades
    .slice(0, 12)
    .map((trade) => {
      const sideLabel = trade.sourceType === "period" ? "청산" : trade.side === "buy" ? "매수" : trade.side === "sell" ? "매도" : "--";
      return `
        <tr>
          <td>${trade.date || "--"}</td>
          <td>${escapeHtml(trade.name || trade.symbol)}</td>
          <td>${sideLabel}</td>
          <td>${formatNumber(trade.quantity, 4)}</td>
          <td>${formatMoney(trade.price)}</td>
          <td>${formatMoney(trade.amount)}</td>
          <td>${formatMoney(trade.cost)}</td>
          <td class="${cssClassBySign(trade.realizedPnl)}">${trade.realizedPnl == null ? "--" : formatMoney(trade.realizedPnl)}</td>
        </tr>
      `;
    })
    .join("");
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * ratio));
  canvas.height = Math.max(260, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: canvas.width / ratio, height: canvas.height / ratio };
}

function drawEmpty(canvas, message) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#627069";
  ctx.font = "700 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
}

function niceRange(values) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const pad = Math.max((max - min) * 0.16, 1);
  return { min: min - pad, max: max + pad };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function drawAxis(ctx, plot, min, max, valueFormatter = formatCompactMoney) {
  ctx.strokeStyle = "#dce2dc";
  ctx.fillStyle = "#627069";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 5; i += 1) {
    const value = min + ((max - min) / 4) * i;
    const y = plot.bottom - ((value - min) / (max - min)) * plot.height;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.fillText(valueFormatter(value), plot.left - 8, y);
  }
}

function drawBarChart(canvas, rows, valueKey, labelKey, options = {}) {
  if (!rows.length) {
    drawEmpty(canvas, "표시할 데이터가 없습니다.");
    return;
  }
  const { ctx, width, height } = setupCanvas(canvas);
  const plot = {
    left: options.left ?? 84,
    right: width - 24,
    top: options.top ?? 42,
    bottom: height - (options.rotateLabels ? 76 : 58),
  };
  plot.width = plot.right - plot.left;
  plot.height = plot.bottom - plot.top;
  const values = rows.map((row) => row[valueKey] || 0);
  const { min, max } = niceRange(values);
  const zeroY = plot.bottom - ((0 - min) / (max - min)) * plot.height;
  const gap = options.gap ?? 8;
  const barWidth = Math.max(8, (plot.width - gap * (rows.length - 1)) / rows.length);
  const labelFormatter = options.labelFormatter || ((value) => String(value ?? ""));
  const valueFormatter = options.valueFormatter || formatCompactMoney;
  const labelEvery = options.labelEvery ?? Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor(plot.width / 64))));
  const valueEvery = options.valueEvery ?? (barWidth >= 24 ? 1 : Math.max(1, Math.ceil(rows.length / 24)));

  ctx.clearRect(0, 0, width, height);
  drawAxis(ctx, plot, min, max, valueFormatter);
  ctx.strokeStyle = "#24312b";
  ctx.beginPath();
  ctx.moveTo(plot.left, zeroY);
  ctx.lineTo(plot.right, zeroY);
  ctx.stroke();

  rows.forEach((row, index) => {
    const value = row[valueKey] || 0;
    const x = plot.left + index * (barWidth + gap);
    const y = plot.bottom - ((value - min) / (max - min)) * plot.height;
    const top = Math.min(y, zeroY);
    const barHeight = Math.max(2, Math.abs(zeroY - y));
    ctx.fillStyle = options.colorMode === "blue" ? "#2869b8" : value >= 0 ? "#1f8a5b" : "#bd3f35";
    ctx.fillRect(x, top, barWidth, barHeight);
  });

  if (options.showValues !== false) {
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    rows.forEach((row, index) => {
      if (index % valueEvery !== 0) return;
      const value = row[valueKey] || 0;
      const x = plot.left + index * (barWidth + gap) + barWidth / 2;
      const y = plot.bottom - ((value - min) / (max - min)) * plot.height;
      const labelY = value >= 0 ? clamp(y - 6, plot.top + 10, plot.bottom - 8) : clamp(y + 14, plot.top + 12, plot.bottom - 4);
      ctx.fillStyle = value >= 0 ? "#176b48" : "#a9362e";
      ctx.textBaseline = value >= 0 ? "bottom" : "top";
      ctx.fillText(valueFormatter(value), x, labelY);
    });
  }

  ctx.fillStyle = "#627069";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  rows.forEach((row, index) => {
    if (index % labelEvery !== 0 && index !== rows.length - 1) return;
    const x = plot.left + index * (barWidth + gap) + barWidth / 2;
    const label = labelFormatter(row[labelKey], row);
    ctx.save();
    ctx.translate(x, height - 22);
    if (options.rotateLabels) {
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "right";
    } else {
      ctx.textAlign = "center";
    }
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });
}

function drawCharts(result) {
  const dailyRows = result.days.slice(-31);
  const monthlyRows = result.months.slice(-24);
  const symbolRows = result.symbols.slice(0, 18);

  drawBarChart(els.dailyChart, dailyRows, "realizedPnl", "period", {
    labelFormatter: formatShortDate,
    valueFormatter: dailyRows.length <= 12 ? formatSignedMoney : formatCompactMoney,
    labelEvery: 1,
    valueEvery: 1,
    rotateLabels: true,
  });
  drawBarChart(els.monthlyChart, monthlyRows, "realizedPnl", "period", {
    valueFormatter: monthlyRows.length <= 12 ? formatSignedMoney : formatCompactMoney,
    rotateLabels: true,
  });
  drawBarChart(els.symbolChart, symbolRows, "realizedPnl", "symbol", {
    valueFormatter: symbolRows.length <= 12 ? formatSignedMoney : formatCompactMoney,
    rotateLabels: true,
  });
}

function analyzeCurrentRows() {
  const mapping = getMappingFromControls();
  state.mapping = mapping;
  const trades = normalizeRows(mapping);
  if (!trades.length) {
    showToast("분석할 행을 찾지 못했습니다. 컬럼 매핑을 확인해 주세요.");
    return;
  }
  state.normalizedTrades = trades;
  state.result = analyzeTrades(trades);
  renderSummary(state.result);
  renderTables(state.result);
  renderTradePreview(state.result.trades.slice(-12).reverse());
  drawCharts(state.result);
  els.exportSymbol.disabled = false;
  els.exportTrades.disabled = false;
  els.previewCaption.textContent = `${trades.length}개 행을 분석했습니다.`;
  showToast("분석이 완료됐습니다.");
}

async function readFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  els.fileName.textContent = file.name;
  if (["csv", "tsv"].includes(ext)) {
    const text = await file.text();
    setRows(parseDelimited(text, ext === "tsv" ? "\t" : ","));
    return;
  }

  if (!window.XLSX) {
    showToast("엑셀 파일을 읽기 위한 라이브러리를 불러오지 못했습니다. CSV로 저장해서 다시 시도해 주세요.");
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  state.workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  state.sheets = Object.fromEntries(
    state.workbook.SheetNames.map((name) => {
      const matrix = XLSX.utils.sheet_to_json(state.workbook.Sheets[name], { header: 1, defval: "" });
      return [name, rowsFromMatrix(matrix)];
    })
  );
  els.sheetSelect.innerHTML = state.workbook.SheetNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  els.sheetSelectWrap.hidden = state.workbook.SheetNames.length <= 1;
  setRows(state.sheets[state.workbook.SheetNames[0]] || []);
}

function loadSampleData() {
  const sample = [
    { 매매일: "2026/01/15", 종목번호: "MU", 종목명: "마이크론", 청산수량: 12, 매입평균가: "132,500", 매도평균가: "142,800", 손익금액: "117,300", "수익률(%)": "7.38" },
    { 매매일: "2026/02/04", 종목번호: "SOXL", 종목명: "SOXL", 청산수량: 30, 매입평균가: "31,200", 매도평균가: "29,850", 손익금액: "-48,900", "수익률(%)": "-5.22" },
    { 매매일: "2026/03/21", 종목번호: "AAPL", 종목명: "애플", 청산수량: 8, 매입평균가: "271,000", 매도평균가: "283,500", 손익금액: "91,400", "수익률(%)": "4.22" },
    { 매매일: "2026/04/11", 종목번호: "COF", 종목명: "캐피털 원 파이낸셜", 청산수량: 10, 매입평균가: "284,300", 매도평균가: "298,211", 손익금액: "124,490", "수익률(%)": "4.38" },
    { 매매일: "2026/05/18", 종목번호: "MU", 종목명: "마이크론", 청산수량: 5, 매입평균가: "139,200", 매도평균가: "151,600", 손익금액: "56,800", "수익률(%)": "8.16" },
    { 매매일: "2026/06/15", 종목번호: "COF", 종목명: "캐피털 원 파이낸셜", 청산수량: 10, 매입평균가: "284,300", 매도평균가: "298,211", 손익금액: "124,490", "수익률(%)": "4.38" },
  ];
  els.fileName.textContent = "샘플 기간손익 파일";
  setRows(sample);
  analyzeCurrentRows();
}

function clearAll() {
  state.workbook = null;
  state.sheets = {};
  state.rows = [];
  state.headers = [];
  state.mapping = {};
  state.normalizedTrades = [];
  state.result = null;
  els.fileInput.value = "";
  els.fileName.textContent = "기간손익 엑셀·CSV 파일을 올려주세요.";
  els.mappingPanel.hidden = true;
  els.analyzeButton.disabled = true;
  els.exportSymbol.disabled = true;
  els.exportTrades.disabled = true;
  els.symbolTable.innerHTML = "";
  els.monthTable.innerHTML = "";
  els.quarterTable.innerHTML = "";
  els.tradePreview.innerHTML = "";
  els.totalPnl.textContent = "--";
  els.totalReturn.textContent = "--";
  els.winRate.textContent = "--";
  els.tradeCount.textContent = "--";
  drawEmpty(els.dailyChart, "파일을 넣으면 차트가 표시됩니다.");
  drawEmpty(els.monthlyChart, "파일을 넣으면 차트가 표시됩니다.");
  drawEmpty(els.symbolChart, "파일을 넣으면 차트가 표시됩니다.");
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function downloadCsv(filename, csv) {
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportSymbols() {
  if (!state.result) return;
  downloadCsv(
    "symbol-performance.csv",
    toCsv(
      state.result.symbols.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        buyAmount: row.buyAmount,
        sellAmount: row.sellAmount,
        realizedPnl: row.realizedPnl,
        returnPct: row.returnPct,
        remainingQty: row.remainingQty,
        winRate: row.winRate,
      }))
    )
  );
}

function exportTrades() {
  if (!state.result) return;
  downloadCsv("normalized-trades.csv", toCsv(state.result.trades));
}

function bindEvents() {
  els.fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) readFile(file);
  });
  els.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.dropZone.classList.add("dragging");
  });
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("dragging"));
  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("dragging");
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  });
  els.sheetSelect.addEventListener("change", () => setRows(state.sheets[els.sheetSelect.value] || []));
  Object.values(mapEls).forEach((select) => select.addEventListener("change", renderPreviewRaw));
  els.analyzeButton.addEventListener("click", analyzeCurrentRows);
  els.sampleButton.addEventListener("click", loadSampleData);
  els.clearButton.addEventListener("click", clearAll);
  els.exportSymbol.addEventListener("click", exportSymbols);
  els.exportTrades.addEventListener("click", exportTrades);
  window.addEventListener("resize", () => {
    window.clearTimeout(bindEvents.resizeTimer);
    bindEvents.resizeTimer = window.setTimeout(() => {
      if (state.result) drawCharts(state.result);
    }, 140);
  });
}

bindEvents();
clearAll();
