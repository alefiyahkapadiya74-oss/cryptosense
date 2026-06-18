/**
 * Keyword-based Sentiment Analysis Engine
 * Analyzes text from news/social sources to produce sentiment scores.
 */

const POSITIVE_WORDS = new Set([
  "bullish", "surge", "soar", "rally", "pump", "moon", "breakout", "gain",
  "profit", "growth", "rise", "up", "buy", "accumulate", "long", "recover",
  "adoption", "partnership", "upgrade", "innovation", "launch", "listing",
  "support", "strong", "momentum", "optimistic", "confident", "opportunity",
  "record", "high", "milestone", "achievement", "success", "positive",
  "institutional", "mainstream", "approve", "approval", "etf", "bullrun",
  "outperform", "exceed", "boost", "explode", "skyrocket", "promising",
  "healthy", "solid", "stable", "green", "win", "winning", "thrive",
  "demand", "inflow", "accumulation", "undervalued", "potential",
]);

const NEGATIVE_WORDS = new Set([
  "bearish", "crash", "dump", "plunge", "drop", "fall", "sell", "short",
  "loss", "decline", "down", "risk", "fear", "panic", "scam", "hack",
  "exploit", "vulnerability", "regulation", "ban", "lawsuit", "sec",
  "investigation", "fraud", "ponzi", "rug", "rugpull", "collapse",
  "bankruptcy", "insolvent", "liquidation", "warning", "concern",
  "volatile", "uncertainty", "unstable", "weak", "resistance", "reject",
  "rejection", "overvalued", "bubble", "correction", "capitulation",
  "outflow", "negative", "critical", "threat", "danger", "troubling",
  "lawsuit", "fine", "penalty", "sanction", "crackdown", "red",
]);

const INTENSIFIERS = new Set([
  "very", "extremely", "incredibly", "massive", "huge", "significant",
  "major", "critical", "unprecedented", "dramatic", "sharp",
]);

export interface SentimentResult {
  score: number;          // -1 to +1
  label: "Positive" | "Neutral" | "Negative";
  confidence: number;     // 0-100
  positiveCount: number;
  negativeCount: number;
  totalWords: number;
}

export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: "Neutral", confidence: 0, positiveCount: 0, negativeCount: 0, totalWords: 0 };
  }

  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  let intensifierNext = false;

  for (const word of words) {
    const multiplier = intensifierNext ? 1.5 : 1;
    intensifierNext = INTENSIFIERS.has(word);

    if (POSITIVE_WORDS.has(word)) {
      positiveCount += multiplier;
    } else if (NEGATIVE_WORDS.has(word)) {
      negativeCount += multiplier;
    }
  }

  const total = positiveCount + negativeCount;
  const score = total === 0 ? 0 : (positiveCount - negativeCount) / total;
  const confidence = Math.min(100, Math.round((total / Math.max(words.length, 1)) * 300));

  let label: "Positive" | "Neutral" | "Negative";
  if (score > 0.15) label = "Positive";
  else if (score < -0.15) label = "Negative";
  else label = "Neutral";

  return {
    score: Math.round(score * 100) / 100,
    label,
    confidence,
    positiveCount: Math.round(positiveCount),
    negativeCount: Math.round(negativeCount),
    totalWords: words.length,
  };
}

export function analyzeMultipleTexts(texts: string[]): SentimentResult {
  if (texts.length === 0) {
    return { score: 0, label: "Neutral", confidence: 0, positiveCount: 0, negativeCount: 0, totalWords: 0 };
  }

  const results = texts.map(t => analyzeSentiment(t));
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const totalPos = results.reduce((sum, r) => sum + r.positiveCount, 0);
  const totalNeg = results.reduce((sum, r) => sum + r.negativeCount, 0);
  const totalWords = results.reduce((sum, r) => sum + r.totalWords, 0);
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  let label: "Positive" | "Neutral" | "Negative";
  if (avgScore > 0.15) label = "Positive";
  else if (avgScore < -0.15) label = "Negative";
  else label = "Neutral";

  return {
    score: Math.round(avgScore * 100) / 100,
    label,
    confidence: Math.round(avgConfidence),
    positiveCount: totalPos,
    negativeCount: totalNeg,
    totalWords,
  };
}

export interface RecommendationResult {
  action: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  confidence: number;
  rationale: string;
}

export function getRecommendation(
  sentimentScore: number,
  priceChange24h: number,
  priceChange7d: number | undefined,
  volatilityRatio: number,
): RecommendationResult {
  // Weighted scoring
  const sentimentWeight = sentimentScore * 40;  // -40 to +40
  const priceWeight24h = Math.max(-30, Math.min(30, priceChange24h * 2));  // -30 to +30
  const priceWeight7d = priceChange7d !== undefined
    ? Math.max(-20, Math.min(20, priceChange7d))  // -20 to +20
    : 0;
  const volatilityPenalty = volatilityRatio > 0.15 ? -10 : volatilityRatio > 0.08 ? -5 : 0;

  const totalScore = sentimentWeight + priceWeight24h + priceWeight7d + volatilityPenalty;

  let action: RecommendationResult["action"];
  let rationale: string;

  if (totalScore > 40) {
    action = "Strong Buy";
    rationale = "Strong positive sentiment combined with bullish price action suggests high upside potential.";
  } else if (totalScore > 15) {
    action = "Buy";
    rationale = "Favorable sentiment and price trends indicate a good entry opportunity.";
  } else if (totalScore > -15) {
    action = "Hold";
    rationale = "Mixed signals from sentiment and price data. Recommend monitoring for clearer direction.";
  } else if (totalScore > -40) {
    action = "Sell";
    rationale = "Negative sentiment and declining prices suggest reducing exposure.";
  } else {
    action = "Strong Sell";
    rationale = "Strongly negative sentiment with bearish price action. High risk of further decline.";
  }

  const confidence = Math.min(95, Math.max(20, Math.round(50 + Math.abs(totalScore) * 0.6)));

  return { action, confidence, rationale };
}

export interface RiskResult {
  level: "Low" | "Medium" | "High" | "Extreme";
  score: number;  // 0-100
  factors: string[];
}

export function getRiskAnalysis(
  sentimentScore: number,
  priceChange24h: number,
  volatilityRatio: number,
  newsCount: number,
): RiskResult {
  let riskScore = 50; // Baseline
  const factors: string[] = [];

  // Sentiment-based risk
  if (sentimentScore < -0.3) {
    riskScore += 20;
    factors.push("Strongly negative market sentiment detected across sources");
  } else if (sentimentScore < 0) {
    riskScore += 10;
    factors.push("Mildly negative sentiment signals caution");
  } else if (sentimentScore > 0.5) {
    riskScore -= 10;
    factors.push("Very positive sentiment reduces short-term risk");
  }

  // Volatility-based risk
  if (Math.abs(priceChange24h) > 15) {
    riskScore += 25;
    factors.push(`Extreme 24h price movement of ${priceChange24h.toFixed(1)}% indicates high volatility`);
  } else if (Math.abs(priceChange24h) > 8) {
    riskScore += 15;
    factors.push(`Significant 24h price swing of ${priceChange24h.toFixed(1)}%`);
  } else if (Math.abs(priceChange24h) < 2) {
    riskScore -= 5;
    factors.push("Stable 24h price action");
  }

  // Volume/market cap ratio
  if (volatilityRatio > 0.2) {
    riskScore += 15;
    factors.push("High volume-to-market-cap ratio suggests elevated trading activity");
  } else if (volatilityRatio < 0.03) {
    riskScore += 5;
    factors.push("Low trading volume relative to market cap");
  }

  // News intensity
  if (newsCount > 15) {
    riskScore += 10;
    factors.push("High news intensity may signal upcoming volatility");
  } else if (newsCount < 3) {
    riskScore += 5;
    factors.push("Limited news coverage may indicate reduced market interest");
  }

  riskScore = Math.max(5, Math.min(95, riskScore));

  let level: RiskResult["level"];
  if (riskScore < 30) level = "Low";
  else if (riskScore < 55) level = "Medium";
  else if (riskScore < 75) level = "High";
  else level = "Extreme";

  return { level, score: riskScore, factors };
}
