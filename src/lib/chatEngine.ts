/**
 * CryptoSense AI Chat Engine
 * 
 * A local NLP engine that understands crypto-related queries,
 * fetches real data from the existing API layer, and generates
 * structured, insightful responses.
 */

import { fetchTopCoins, fetchTrending, fetchFearGreed, type MarketCoin } from "./coingecko";
import { fetchCryptoNews, fetchRedditPosts } from "./newsApis";
import { fmtUsd, fmtPct, fmtCompact } from "./format";

// ─── Coin name → CoinGecko ID mapping ──────────────────
const COIN_ALIASES: Record<string, string> = {
  btc: "bitcoin", bitcoin: "bitcoin",
  eth: "ethereum", ethereum: "ethereum", ether: "ethereum",
  sol: "solana", solana: "solana",
  bnb: "binancecoin", binance: "binancecoin",
  xrp: "ripple", ripple: "ripple",
  ada: "cardano", cardano: "cardano",
  doge: "dogecoin", dogecoin: "dogecoin",
  dot: "polkadot", polkadot: "polkadot",
  matic: "matic-network", polygon: "matic-network",
  avax: "avalanche-2", avalanche: "avalanche-2",
  link: "chainlink", chainlink: "chainlink",
  shib: "shiba-inu", "shiba inu": "shiba-inu", shiba: "shiba-inu",
  ltc: "litecoin", litecoin: "litecoin",
  trx: "tron", tron: "tron",
  uni: "uniswap", uniswap: "uniswap",
  atom: "cosmos", cosmos: "cosmos",
  near: "near", "near protocol": "near",
  apt: "aptos", aptos: "aptos",
  arb: "arbitrum", arbitrum: "arbitrum",
  op: "optimism", optimism: "optimism",
  sui: "sui", pepe: "pepe",
};

// ─── Intent detection ───────────────────────────────────
type Intent =
  | { type: "analyze"; coinId: string; coinName: string }
  | { type: "compare"; coins: { id: string; name: string }[] }
  | { type: "news"; coinId: string; coinName: string }
  | { type: "recommend" }
  | { type: "market_overview" }
  | { type: "fear_greed" }
  | { type: "trending" }
  | { type: "greeting" }
  | { type: "help" }
  | { type: "context_question"; question: string }
  | { type: "unknown"; raw: string };

function resolveCoin(text: string): { id: string; name: string } | null {
  const lower = text.toLowerCase().trim();
  for (const [alias, id] of Object.entries(COIN_ALIASES)) {
    if (lower.includes(alias)) {
      const name = alias.charAt(0).toUpperCase() + alias.slice(1);
      return { id, name };
    }
  }
  return null;
}

function resolveMultipleCoins(text: string): { id: string; name: string }[] {
  const found: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const [alias, id] of Object.entries(COIN_ALIASES)) {
    if (text.toLowerCase().includes(alias) && !seen.has(id)) {
      seen.add(id);
      found.push({ id, name: alias.charAt(0).toUpperCase() + alias.slice(1) });
    }
  }
  return found;
}

export function detectIntent(text: string, contextCoin?: string): Intent {
  const lower = text.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|yo|sup|good morning|good evening|howdy)/i.test(lower)) {
    return { type: "greeting" };
  }

  // Help
  if (/^(help|what can you do|commands|features)/i.test(lower)) {
    return { type: "help" };
  }

  // Fear & Greed
  if (/fear.?greed|market sentiment|overall sentiment/i.test(lower)) {
    return { type: "fear_greed" };
  }

  // Trending
  if (/trending|hot coins|popular|what.?s hot/i.test(lower)) {
    return { type: "trending" };
  }

  // Market overview
  if (/market (overview|status|update|summary)|how.?s the market|crypto market/i.test(lower)) {
    return { type: "market_overview" };
  }

  // Comparison
  if (/compare|vs\.?|versus|difference between|better.+or/i.test(lower)) {
    const coins = resolveMultipleCoins(lower);
    if (coins.length >= 2) {
      return { type: "compare", coins: coins.slice(0, 2) };
    }
  }

  // Recommendation
  if (/recommend|suggest|which coin|what should i (buy|invest)|best coin|good investment/i.test(lower)) {
    return { type: "recommend" };
  }

  // News queries
  if (/news|happening|why.+going (up|down)|what.?s up with|headlines|updates/i.test(lower)) {
    const coin = resolveCoin(lower);
    if (coin) return { type: "news", coinId: coin.id, coinName: coin.name };
    if (contextCoin) {
      const ctx = resolveCoin(contextCoin) || { id: contextCoin, name: contextCoin };
      return { type: "news", coinId: ctx.id, coinName: ctx.name };
    }
  }

  // Analyze queries (most broad — should be last)
  if (/analy[sz]e|tell me about|price of|how.?s|should i buy|trend of|predict|forecast|info on|details|check/i.test(lower)) {
    const coin = resolveCoin(lower);
    if (coin) return { type: "analyze", coinId: coin.id, coinName: coin.name };
    if (contextCoin) {
      const ctx = resolveCoin(contextCoin) || { id: contextCoin, name: contextCoin };
      return { type: "analyze", coinId: ctx.id, coinName: ctx.name };
    }
  }

  // Direct coin name mention
  const directCoin = resolveCoin(lower);
  if (directCoin) return { type: "analyze", coinId: directCoin.id, coinName: directCoin.name };

  // Context-aware fallback ("is it risky?", "should I sell?")
  if (contextCoin && /risky|safe|sell|hold|buy|bullish|bearish|pump|dump|moon/i.test(lower)) {
    return { type: "context_question", question: lower };
  }

  return { type: "unknown", raw: lower };
}

// ─── Sentiment analysis helpers ─────────────────────────
function quickSentiment(texts: string[]): "Bullish" | "Bearish" | "Neutral" {
  const blob = texts.join(" ").toLowerCase();
  const bull = ["bull", "moon", "pump", "up", "buy", "growth", "surge", "gain", "profit", "high", "listing", "breakout", "ath"];
  const bear = ["bear", "crash", "dump", "down", "sell", "loss", "scam", "hack", "red", "drop", "fraud", "rug"];
  let score = 0;
  bull.forEach(w => { if (blob.includes(w)) score++; });
  bear.forEach(w => { if (blob.includes(w)) score--; });
  if (score >= 2) return "Bullish";
  if (score <= -2) return "Bearish";
  return "Neutral";
}

function trendEmoji(pct: number): string {
  if (pct > 5) return "🚀";
  if (pct > 0) return "📈";
  if (pct > -5) return "📉";
  return "💥";
}

function riskLevel(pct24h: number): string {
  const abs = Math.abs(pct24h);
  if (abs > 10) return "🔴 High Risk — Extremely volatile";
  if (abs > 5) return "🟡 Moderate Risk — Active movement";
  return "🟢 Low Risk — Relatively stable";
}

// ─── Response generators ────────────────────────────────
async function getMarketData(): Promise<MarketCoin[]> {
  return fetchTopCoins(100);
}

async function handleAnalyze(coinId: string, coinName: string): Promise<string> {
  const coins = await getMarketData();
  const coin = coins.find(c => c.id === coinId);

  if (!coin) {
    return `I couldn't find live data for **${coinName}** in the top 100. Try the full name or symbol (e.g., "bitcoin" or "btc").`;
  }

  const trend24 = coin.price_change_percentage_24h;
  const emoji = trendEmoji(trend24);
  const risk = riskLevel(trend24);

  // Try to get social sentiment
  let sentiment = "Neutral";
  try {
    const reddit = await fetchRedditPosts(coin.name, coin.symbol);
    sentiment = quickSentiment(reddit.map(r => r.snippet));
  } catch { /* fallback */ }

  return [
    `## ${emoji} ${coin.name} (${coin.symbol.toUpperCase()}) Analysis`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| **Price** | ${fmtUsd(coin.current_price)} |`,
    `| **24h Change** | ${fmtPct(trend24)} |`,
    `| **Market Cap** | ${fmtCompact(coin.market_cap)} |`,
    `| **24h Volume** | ${fmtCompact(coin.total_volume)} |`,
    `| **Rank** | #${coin.market_cap_rank} |`,
    `| **ATH** | ${fmtUsd(coin.ath)} (${fmtPct(coin.ath_change_percentage)} from ATH) |`,
    ``,
    `**Trend:** ${trend24 > 0 ? "Uptrend" : "Downtrend"} over 24h`,
    `**Social Sentiment:** ${sentiment === "Bullish" ? "🟢 Bullish" : sentiment === "Bearish" ? "🔴 Bearish" : "🟡 Neutral"}`,
    `**Risk Assessment:** ${risk}`,
    ``,
    trend24 > 3
      ? `💡 *${coin.name} is showing strong upward momentum. Consider taking partial profits if you're already in.*`
      : trend24 < -3
        ? `💡 *${coin.name} is under pressure. This could be a buying opportunity if fundamentals are strong — or a warning sign. Do your own research.*`
        : `💡 *${coin.name} is trading relatively flat. Watch for a breakout in either direction.*`,
  ].join("\n");
}

async function handleNews(coinId: string, coinName: string): Promise<string> {
  const [news, reddit] = await Promise.all([
    fetchCryptoNews(coinName, coinId).catch(() => []),
    fetchRedditPosts(coinName, coinId).catch(() => []),
  ]);

  const items = [...news, ...reddit.map(r => ({ title: r.snippet, source: `Reddit (${r.engagement})`, time: r.time }))];

  if (items.length === 0) {
    return `I couldn't find recent news for **${coinName}**. The market may be quiet, or the news APIs are rate-limited. Try again in a minute.`;
  }

  const sentiment = quickSentiment(items.map(i => i.title));
  const top = items.slice(0, 5);

  return [
    `## 📰 ${coinName} — Latest Intelligence`,
    ``,
    `**Overall Sentiment:** ${sentiment === "Bullish" ? "🟢 Bullish" : sentiment === "Bearish" ? "🔴 Bearish" : "🟡 Neutral"}`,
    ``,
    ...top.map((item, i) =>
      `${i + 1}. **${(item as any).title?.slice(0, 80)}**\n   _${(item as any).source} · ${(item as any).time}_`
    ),
    ``,
    `_Found ${items.length} recent articles/posts._`,
  ].join("\n");
}

async function handleCompare(coins: { id: string; name: string }[]): Promise<string> {
  const marketData = await getMarketData();
  const [a, b] = coins.map(c => marketData.find(m => m.id === c.id));

  if (!a || !b) {
    return `I couldn't find live data for one or both coins. Make sure they're in the top 100.`;
  }

  const winner24h = a.price_change_percentage_24h > b.price_change_percentage_24h ? a : b;
  const winnerVol = a.total_volume > b.total_volume ? a : b;
  const winnerMcap = a.market_cap > b.market_cap ? a : b;

  return [
    `## ⚔️ ${a.name} vs ${b.name} — Head to Head`,
    ``,
    `| Metric | ${a.symbol.toUpperCase()} | ${b.symbol.toUpperCase()} | Winner |`,
    `|---|---|---|---|`,
    `| **Price** | ${fmtUsd(a.current_price)} | ${fmtUsd(b.current_price)} | — |`,
    `| **24h Change** | ${fmtPct(a.price_change_percentage_24h)} | ${fmtPct(b.price_change_percentage_24h)} | ${winner24h.symbol.toUpperCase()} |`,
    `| **Market Cap** | ${fmtCompact(a.market_cap)} | ${fmtCompact(b.market_cap)} | ${winnerMcap.symbol.toUpperCase()} |`,
    `| **Volume** | ${fmtCompact(a.total_volume)} | ${fmtCompact(b.total_volume)} | ${winnerVol.symbol.toUpperCase()} |`,
    `| **Rank** | #${a.market_cap_rank} | #${b.market_cap_rank} | #${Math.min(a.market_cap_rank, b.market_cap_rank)} |`,
    ``,
    `**📊 Verdict:** ${winner24h.name} is performing better over the last 24 hours with ${fmtPct(winner24h.price_change_percentage_24h)} movement.`,
    ``,
    winnerMcap.id === winnerVol.id
      ? `💡 *${winnerMcap.name} leads in both market cap and volume — it's the safer, more liquid choice.*`
      : `💡 *${winnerMcap.name} has a larger market cap, but ${winnerVol.name} has more trading volume — signaling higher short-term interest.*`,
  ].join("\n");
}

async function handleRecommend(): Promise<string> {
  const coins = await getMarketData();
  const top20 = coins.slice(0, 20);

  // Find strongest performer
  const best24h = [...top20].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)[0];
  // Find most stable
  const mostStable = [...top20].sort((a, b) => Math.abs(a.price_change_percentage_24h) - Math.abs(b.price_change_percentage_24h))[0];
  // Find highest volume
  const highVol = [...top20].sort((a, b) => b.total_volume - a.total_volume)[0];

  return [
    `## 💎 CryptoSense Recommendations`,
    ``,
    `Based on live market data from the top 20 assets:`,
    ``,
    `### 🚀 Strongest Performer`,
    `**${best24h.name}** (${best24h.symbol.toUpperCase()}) — ${fmtPct(best24h.price_change_percentage_24h)} in 24h`,
    `Price: ${fmtUsd(best24h.current_price)}`,
    ``,
    `### 🛡️ Most Stable`,
    `**${mostStable.name}** (${mostStable.symbol.toUpperCase()}) — only ${fmtPct(mostStable.price_change_percentage_24h)} movement`,
    `Good for conservative positions.`,
    ``,
    `### 📊 Highest Volume`,
    `**${highVol.name}** (${highVol.symbol.toUpperCase()}) — ${fmtCompact(highVol.total_volume)} in 24h`,
    `High liquidity = easy entry/exit.`,
    ``,
    `⚠️ *This is not financial advice. Always do your own research (DYOR).*`,
  ].join("\n");
}

async function handleMarketOverview(): Promise<string> {
  const [coins, fg] = await Promise.all([
    getMarketData(),
    fetchFearGreed(),
  ]);

  const top5 = coins.slice(0, 5);
  const totalMcap = coins.reduce((s, c) => s + c.market_cap, 0);
  const avgChange = coins.slice(0, 20).reduce((s, c) => s + c.price_change_percentage_24h, 0) / 20;

  return [
    `## 🌐 Crypto Market Overview`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| **Fear & Greed Index** | ${fg.value}/100 — ${fg.value_classification} |`,
    `| **Top 100 Market Cap** | ~${fmtCompact(totalMcap)} |`,
    `| **Avg 24h Change (Top 20)** | ${fmtPct(avgChange)} |`,
    ``,
    `### Top 5 by Market Cap`,
    ...top5.map((c, i) =>
      `${i + 1}. **${c.name}** — ${fmtUsd(c.current_price)} (${fmtPct(c.price_change_percentage_24h)})`
    ),
    ``,
    avgChange > 1
      ? `📈 *The market is showing bullish momentum today.*`
      : avgChange < -1
        ? `📉 *The market is under selling pressure. Exercise caution.*`
        : `➡️ *The market is relatively flat. Watch for breakout signals.*`,
  ].join("\n");
}

async function handleTrending(): Promise<string> {
  const data = await fetchTrending();
  const coins = data.coins?.slice(0, 7) || [];

  if (coins.length === 0) return "I couldn't fetch trending coins right now. Try again in a moment.";

  return [
    `## 🔥 Trending Coins Right Now`,
    ``,
    ...coins.map((c: any, i: number) => {
      const item = c.item;
      return `${i + 1}. **${item.name}** (${item.symbol}) — Rank #${item.market_cap_rank || "N/A"}`;
    }),
    ``,
    `_These are the most searched coins on CoinGecko in the last 24 hours._`,
    ``,
    `💡 *Trending ≠ good investment. High search volume can mean hype or panic. Always DYOR.*`,
  ].join("\n");
}

async function handleFearGreed(): Promise<string> {
  const fg = await fetchFearGreed();
  const val = parseInt(fg.value);
  let emoji = "😐";
  if (val >= 75) emoji = "🤑";
  else if (val >= 55) emoji = "😊";
  else if (val <= 25) emoji = "😱";
  else if (val <= 45) emoji = "😟";

  return [
    `## ${emoji} Fear & Greed Index: ${fg.value}/100`,
    ``,
    `**Classification:** ${fg.value_classification}`,
    ``,
    val >= 75
      ? `The market is in **Extreme Greed**. Historically, this signals that a correction may be coming. Be cautious with new positions.`
      : val >= 55
        ? `The market is **Greedy** — sentiment is optimistic. A good time to hold, but watch for overextension.`
        : val <= 25
          ? `The market is in **Extreme Fear**. Historically, this has been a strong buying signal for long-term investors.`
          : val <= 45
            ? `The market is **Fearful**. Prices may be depressed — potential opportunity for contrarian plays.`
            : `The market sentiment is **Neutral**. No strong conviction either way. Wait for clearer signals.`,
  ].join("\n");
}

async function handleContextQuestion(question: string, contextCoin: string): Promise<string> {
  // Use the context coin to answer vague questions
  const coins = await getMarketData();
  const resolved = resolveCoin(contextCoin);
  const coinId = resolved?.id || contextCoin;
  const coin = coins.find(c => c.id === coinId);

  if (!coin) {
    return `I'm not sure which coin you're referring to. Could you specify? For example: "Is Bitcoin risky?"`;
  }

  const pct = coin.price_change_percentage_24h;

  if (/risky|safe|risk/i.test(question)) {
    return `**${coin.name} Risk Assessment:**\n\n${riskLevel(pct)}\n\n24h volatility is ${Math.abs(pct).toFixed(2)}%. ${Math.abs(pct) > 5 ? "This is significant movement — exercise caution." : "Movement is within normal range."}`;
  }

  if (/sell|hold|buy/i.test(question)) {
    return [
      `**${coin.name} — Quick Take:**`,
      ``,
      `Price: ${fmtUsd(coin.current_price)} (${fmtPct(pct)} 24h)`,
      ``,
      pct > 5 ? `The asset is pumping. Consider taking partial profits if you're in profit.` :
        pct < -5 ? `The asset is dumping. If you believe in the long term, this could be a DCA opportunity.` :
          `The asset is trading sideways. Hold your position and wait for a clearer signal.`,
      ``,
      `⚠️ *This is not financial advice.*`,
    ].join("\n");
  }

  if (/bullish|bearish|moon|pump|dump/i.test(question)) {
    return `**${coin.name}** is currently ${pct > 0 ? "showing bullish" : "showing bearish"} momentum with ${fmtPct(pct)} in 24h. Volume is at ${fmtCompact(coin.total_volume)}.`;
  }

  return await handleAnalyze(coinId, coin.name);
}

// ─── Main entry point ───────────────────────────────────
export async function processMessage(
  userMessage: string,
  contextCoin?: string
): Promise<{ response: string; newContext?: string }> {
  const intent = detectIntent(userMessage, contextCoin);

  try {
    switch (intent.type) {
      case "greeting":
        return {
          response: [
            `👋 Hey! I'm the **CryptoSense AI Assistant**.`,
            ``,
            `I can help you with:`,
            `• 📊 **Analyze** any coin — _"Analyze Bitcoin"_`,
            `• 📰 **News** — _"What's happening with ETH?"_`,
            `• ⚔️ **Compare** — _"Compare BTC and SOL"_`,
            `• 💎 **Recommend** — _"Which coin should I buy?"_`,
            `• 🌐 **Market Overview** — _"How's the market?"_`,
            `• 🔥 **Trending** — _"What's hot?"_`,
            `• 😱 **Fear & Greed** — _"Market sentiment"_`,
            ``,
            `Just ask me anything about crypto!`,
          ].join("\n"),
        };

      case "help":
        return {
          response: [
            `## 🤖 CryptoSense AI — Commands`,
            ``,
            `| Command | Example |`,
            `|---|---|`,
            `| **Analyze** | "Analyze Bitcoin", "How's ETH?" |`,
            `| **News** | "Bitcoin news", "Why is SOL going up?" |`,
            `| **Compare** | "Compare BTC and ETH" |`,
            `| **Recommend** | "Which coin is best?" |`,
            `| **Market** | "Market overview" |`,
            `| **Trending** | "What's trending?" |`,
            `| **Sentiment** | "Fear and greed index" |`,
            ``,
            `I also understand context! After analyzing a coin, just ask "Is it risky?" and I'll know what you mean.`,
          ].join("\n"),
        };

      case "analyze":
        return {
          response: await handleAnalyze(intent.coinId, intent.coinName),
          newContext: intent.coinId,
        };

      case "news":
        return {
          response: await handleNews(intent.coinId, intent.coinName),
          newContext: intent.coinId,
        };

      case "compare":
        return { response: await handleCompare(intent.coins) };

      case "recommend":
        return { response: await handleRecommend() };

      case "market_overview":
        return { response: await handleMarketOverview() };

      case "trending":
        return { response: await handleTrending() };

      case "fear_greed":
        return { response: await handleFearGreed() };

      case "context_question":
        if (contextCoin) {
          return {
            response: await handleContextQuestion(intent.question, contextCoin),
            newContext: contextCoin,
          };
        }
        return {
          response: `I'm not sure which coin you're asking about. Try specifying, e.g., "Is Bitcoin risky?"`,
        };

      case "unknown":
        // Try a direct coin match as last resort
        const fallbackCoin = resolveCoin(intent.raw);
        if (fallbackCoin) {
          return {
            response: await handleAnalyze(fallbackCoin.id, fallbackCoin.name),
            newContext: fallbackCoin.id,
          };
        }
        return {
          response: [
            `I'm not sure how to answer that. Try asking me:`,
            `• "Analyze Bitcoin"`,
            `• "Compare ETH and SOL"`,
            `• "What's trending?"`,
            `• "Market overview"`,
            ``,
            `Type **help** for all commands.`,
          ].join("\n"),
        };

      default:
        return { response: "Something went wrong. Please try again." };
    }
  } catch (err) {
    console.error("Chat engine error:", err);
    // Structured fallback — never return blank
    return {
      response: [
        `⚠️ I encountered an issue fetching live data.`,
        ``,
        `This is usually due to API rate limits. Here's what I suggest:`,
        `• Wait 30 seconds and try again`,
        `• Check the **Markets** tab for cached data`,
        `• Try a different coin or command`,
      ].join("\n"),
    };
  }
}
