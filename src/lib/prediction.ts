/**
 * CryptoSense Prediction Engine
 * ─────────────────────────────
 * Uses real chart data to compute technical indicators (RSI, momentum, volatility,
 * moving-average crossover) and project future prices with confidence bands.
 */

export interface PredictionPoint {
  t: number;     // timestamp
  v: number;     // predicted median price
  upper: number; // upper confidence band
  lower: number; // lower confidence band
}

export interface PredictionResult {
  coinId: string;
  signal: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";
  signalScore: number;        // -100 to +100
  confidence: number;         // 0-100%
  predictedPrice: number;     // predicted price at end of horizon
  predictedChange: number;    // % change from current
  currentPrice: number;
  rsi: number;
  momentum: number;           // -100 to 100
  volatility: number;         // annualised %
  support: number;
  resistance: number;
  shortTerm: PredictionPoint[];  // next 24h
  midTerm: PredictionPoint[];    // next 7d
  longTerm: PredictionPoint[];   // next 30d
  ultraShortTerm: PredictionPoint[]; // next 1h
  summary: string;
}

// ── Helpers ───────────────────────────────────────────

function sma(arr: number[], period: number): number {
  const slice = arr.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function ema(arr: number[], period: number): number {
  const k = 2 / (period + 1);
  let emaVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    emaVal = arr[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function computeRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

function computeVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(365) * 100; // annualised %
}

function findSupportResistance(prices: number[]): { support: number; resistance: number } {
  const recent = prices.slice(-30);
  const sorted = [...recent].sort((a, b) => a - b);
  return {
    support: sorted[Math.floor(sorted.length * 0.1)],
    resistance: sorted[Math.floor(sorted.length * 0.9)],
  };
}

// ── Prediction Generator ────────────────────────────

function generatePredictionCurve(
  currentPrice: number,
  drift: number,        // daily expected return
  dailyVol: number,     // daily volatility
  numPoints: number,
  intervalMs: number,
  startTime: number,
): PredictionPoint[] {
  const points: PredictionPoint[] = [];
  let price = currentPrice;

  for (let i = 1; i <= numPoints; i++) {
    const t = startTime + i * intervalMs;
    // Geometric Brownian Motion-style with seeded pseudo-randomness
    const noise = (Math.sin(i * 12.9898 + drift * 1000) * 43758.5453) % 1;
    const dailyReturn = drift + dailyVol * (noise * 2 - 1) * 0.6;
    const fraction = intervalMs / (24 * 60 * 60 * 1000); // fraction of day
    price = price * (1 + dailyReturn * fraction);

    // Confidence band widens over time
    const timeScale = Math.sqrt(i / numPoints);
    const band = currentPrice * dailyVol * timeScale * 2;

    points.push({
      t,
      v: Math.max(0, price),
      upper: Math.max(0, price + band),
      lower: Math.max(0, price - band),
    });
  }

  return points;
}

// ── Main Prediction Function ───────────────────────

export function generatePrediction(
  coinId: string,
  chartData: { t: number; v: number }[],
  currentPrice?: number,
): PredictionResult {
  const prices = chartData.map((d) => d.v);
  const now = Date.now();
  const price = currentPrice ?? prices[prices.length - 1] ?? 0;

  // Indicators
  const rsi = computeRSI(prices);
  const sma7 = sma(prices, 7);
  const sma25 = sma(prices, 25);
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const volatility = computeVolatility(prices);
  const { support, resistance } = findSupportResistance(prices);

  // Momentum: combine RSI + MA crossover + MACD-like signal
  const maCrossSignal = ((sma7 - sma25) / sma25) * 100; // normalised %
  const macdSignal = ((ema12 - ema26) / ema26) * 100;
  const rsiSignal = (rsi - 50) * 2; // -100 to +100

  const rawMomentum = rsiSignal * 0.3 + maCrossSignal * 10 * 0.4 + macdSignal * 10 * 0.3;
  const momentum = Math.max(-100, Math.min(100, rawMomentum));

  // Signal
  let signal: PredictionResult["signal"];
  let signalScore = Math.round(momentum);
  if (signalScore > 50) signal = "Strong Buy";
  else if (signalScore > 15) signal = "Buy";
  else if (signalScore > -15) signal = "Neutral";
  else if (signalScore > -50) signal = "Sell";
  else signal = "Strong Sell";

  // Confidence: higher when volatility is moderate and indicators agree
  const indicatorAgreement = Math.abs(Math.sign(rsiSignal) + Math.sign(maCrossSignal) + Math.sign(macdSignal)) / 3;
  const volPenalty = Math.min(volatility / 200, 1); // high vol = low confidence
  const confidence = Math.round(Math.max(20, Math.min(95, 50 + indicatorAgreement * 40 - volPenalty * 30)));

  // Daily drift based on momentum
  const dailyDrift = (momentum / 100) * 0.008; // ±0.8% per day max
  const dailyVol = volatility / (100 * Math.sqrt(365));

  // Generate future curves
  const ultraShortTerm = generatePredictionCurve(price, dailyDrift * 6, dailyVol * 2.5, 12, 5 * 60 * 1000, now);  // 1 hour × 12 points (5m)
  const shortTerm = generatePredictionCurve(price, dailyDrift * 2, dailyVol, 24, 60 * 60 * 1000, now);        // 24 hourly points
  const midTerm = generatePredictionCurve(price, dailyDrift, dailyVol, 28, 6 * 60 * 60 * 1000, now);          // 7 days × 4 points/day
  const longTerm = generatePredictionCurve(price, dailyDrift * 0.7, dailyVol * 0.8, 30, 24 * 60 * 60 * 1000, now); // 30 daily points

  const predictedPrice = ultraShortTerm[ultraShortTerm.length - 1]?.v ?? price;
  const predictedChange = ((predictedPrice - price) / price) * 100;

  const ultraShortTarget = ultraShortTerm[ultraShortTerm.length - 1]?.v ?? price;
  const ultraShortChange = ((ultraShortTarget - price) / price) * 100;

  // Summary
  const dirWord = predictedChange > 0 ? "upward" : predictedChange < 0 ? "downward" : "sideways";
  const strengthWord = Math.abs(momentum) > 50 ? "strong" : Math.abs(momentum) > 20 ? "moderate" : "weak";
  const summary = `Intelligence report for ${coinId}: Technicals suggest a ${strengthWord} ${dirWord} trend. ` +
    `RSI (${rsi.toFixed(0)}) and Momentum (${momentum.toFixed(0)}) indicate ${rsi > 70 ? "overbought conditions" : rsi < 30 ? "oversold conditions" : "balanced market dynamics"}. ` +
    `Immediate 1H target: $${ultraShortTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${ultraShortChange >= 0 ? "+" : ""}${ultraShortChange.toFixed(2)}%). ` +
    `Key levels: Support $${support.toFixed(2)} | Resistance $${resistance.toFixed(2)}.`;

  return {
    coinId,
    signal,
    signalScore,
    confidence,
    predictedPrice,
    predictedChange,
    currentPrice: price,
    rsi,
    momentum,
    volatility,
    support,
    resistance,
    shortTerm,
    midTerm,
    longTerm,
    ultraShortTerm,
    summary,
  };
}
