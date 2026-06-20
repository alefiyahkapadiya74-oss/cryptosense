/**
 * Custom hook that orchestrates all API calls for coin analysis.
 * Fetches data from CoinGecko, Reddit, Twitter alternatives, and News APIs,
 * then runs sentiment analysis and generates recommendations.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCoinChart, fetchTopCoins } from "@/lib/coingecko";
import {
  fetchCoinDetail,
  fetchRedditPosts,
  fetchTwitterPosts,
  fetchCryptoNews,
  type CoinFullDetail,
  type SocialItem,
  type NewsItem,
} from "@/lib/newsApis";
import {
  analyzeSentiment,
  analyzeMultipleTexts,
  getRecommendation,
  getRiskAnalysis,
  type SentimentResult,
  type RecommendationResult,
  type RiskResult,
} from "@/lib/sentiment";

export interface FullAnalysisData {
  coin: CoinFullDetail;
  chart: { t: number; v: number }[];
  reddit: SocialItem[];
  twitter: SocialItem[];
  news: NewsItem[];
  sentiment: {
    overall: SentimentResult;
    reddit: SentimentResult;
    twitter: SentimentResult;
    news: SentimentResult;
  };
  recommendation: RecommendationResult;
  risk: RiskResult;
  fearGreedIndex?: number;
  fearGreedLabel?: string;
}

async function fetchFullAnalysis(coinId: string, queryClient: any): Promise<FullAnalysisData> {
  // Step 1: Try to fetch detailed coin data, but fall back to cached market data if rate limited
  let coin: any = await fetchCoinDetail(coinId);
  
  if (!coin) {
    console.warn(`Detailed fetch for ${coinId} failed. Attempting fallback to market cache...`);
    const markets: any[] = queryClient.getQueryData(["top-coins"]) || queryClient.getQueryData(["markets"]) || [];
    const fallbackCoin = markets.find(c => c.id === coinId);
    
    if (fallbackCoin) {
      // Construct a partial CoinFullDetail from the fallback market data
      coin = {
        id: fallbackCoin.id,
        symbol: fallbackCoin.symbol,
        name: fallbackCoin.name,
        image: { large: fallbackCoin.image, small: fallbackCoin.image, thumb: fallbackCoin.image },
        market_data: {
          current_price: { usd: fallbackCoin.current_price },
          market_cap: { usd: fallbackCoin.market_cap },
          market_cap_rank: fallbackCoin.market_cap_rank,
          total_volume: { usd: fallbackCoin.total_volume },
          high_24h: { usd: fallbackCoin.high_24h || fallbackCoin.current_price },
          low_24h: { usd: fallbackCoin.low_24h || fallbackCoin.current_price },
          price_change_percentage_24h: fallbackCoin.price_change_percentage_24h || 0,
          price_change_percentage_7d: fallbackCoin.price_change_percentage_7d_in_currency || 0,
          price_change_percentage_30d: 0,
          price_change_percentage_1h_in_currency: { usd: 0 },
          price_change_percentage_1y: 0,
          ath: { usd: fallbackCoin.ath || 0 },
          ath_change_percentage: { usd: 0 },
          circulating_supply: fallbackCoin.circulating_supply || 0,
          total_supply: fallbackCoin.total_supply || 0,
          max_supply: fallbackCoin.max_supply || 0,
        },
        description: { en: "Market data fallback. Detailed analysis unavailable due to API rate limits." },
        links: { homepage: [], twitter_screen_name: "", subreddit_url: "" },
        community_data: { twitter_followers: 0, reddit_subscribers: 0, reddit_average_posts_48h: 0, reddit_average_comments_48h: 0 }
      };
    } else {
      // Final attempt: trigger a fetch for markets if cache is empty
      console.warn("Cache empty, attempting emergency market fetch...");
      try {
        const freshMarkets = await queryClient.fetchQuery({
          queryKey: ["top-coins"],
          queryFn: () => fetchTopCoins(100)
        });
        const emergencyCoin = freshMarkets.find((c: any) => c.id === coinId);
        if (emergencyCoin) {
          // Recurse once with the now-filled cache (or just build it here)
          return fetchFullAnalysis(coinId, queryClient);
        }
      } catch (e) {
        console.error("Emergency fetch failed", e);
      }
      throw new Error(`Data synchronization failed. The system is being rate-limited by CoinGecko (429). Please wait a few minutes or try another coin.`);
    }
  }

  const coinName = coin.name;
  const coinSymbol = coin.symbol.toUpperCase();

  // Step 2: Fetch all data in parallel with independent error handling
  const [chart, reddit, twitter, news] = await Promise.all([
    fetchCoinChart(coinId, 7).catch(e => { console.warn("Chart failed", e); return []; }),
    fetchRedditPosts(coinName, coinSymbol).catch(e => { console.warn("Reddit failed", e); return []; }),
    fetchTwitterPosts(coinName, coinSymbol).catch(e => { console.warn("Social failed", e); return []; }),
    fetchCryptoNews(coinName, coinSymbol).catch(e => { console.warn("News failed", e); return []; }),
  ]);

  // Step 3: Run sentiment analysis on each source
  const redditTexts = reddit.map(r => r.rawText);
  const twitterTexts = twitter.map(t => t.rawText || t.snippet);
  const newsTexts = news.map(n => `${n.title} ${n.summary}`);

  const redditSentiment = analyzeMultipleTexts(redditTexts);
  const twitterSentiment = analyzeMultipleTexts(twitterTexts);
  const newsSentiment = analyzeMultipleTexts(newsTexts);

  // Overall sentiment — weighted average
  const allTexts = [...redditTexts, ...twitterTexts, ...newsTexts];
  const overallSentiment = analyzeMultipleTexts(allTexts);

  // Step 4: Generate recommendation
  const md = coin.market_data;
  const volatilityRatio = md.total_volume.usd / Math.max(md.market_cap.usd, 1);
  const recommendation = getRecommendation(
    overallSentiment.score,
    md.price_change_percentage_24h,
    md.price_change_percentage_7d,
    volatilityRatio,
  );

  // Step 5: Generate risk analysis
  const totalNewsCount = reddit.length + twitter.length + news.length;
  const risk = getRiskAnalysis(
    overallSentiment.score,
    md.price_change_percentage_24h,
    volatilityRatio,
    totalNewsCount,
  );

  // Step 6: Attach sentiment labels to news items
  const newsWithSentiment: NewsItem[] = news.map(n => ({
    ...n,
    sentiment: analyzeSentiment(`${n.title} ${n.summary}`).label,
  }));

  // Extract fear & greed from news (if present)
  let fearGreedIndex: number | undefined;
  let fearGreedLabel: string | undefined;
  const fngItem = news.find(n => n.source === "Alternative.me");
  if (fngItem) {
    const match = fngItem.title.match(/Index:\s*(\d+)/);
    if (match) {
      fearGreedIndex = parseInt(match[1]);
      fearGreedLabel = fngItem.title.split("—")[1]?.trim();
    }
  }

  return {
    coin,
    chart,
    reddit,
    twitter,
    news: newsWithSentiment,
    sentiment: {
      overall: overallSentiment,
      reddit: redditSentiment,
      twitter: twitterSentiment,
      news: newsSentiment,
    },
    recommendation,
    risk,
    fearGreedIndex,
    fearGreedLabel,
  };
}

export function useFullAnalysis(coinId: string | null) {
  const queryClient = useQueryClient();
  
  return useQuery<FullAnalysisData>({
    queryKey: ["full-analysis", coinId],
    queryFn: () => fetchFullAnalysis(coinId!, queryClient),
    enabled: !!coinId,
    staleTime: 3 * 60 * 1000,   // 3 min cache
    refetchInterval: 180_000,    // Refresh every 3 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
