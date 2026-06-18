/**
 * Real API integrations for crypto news & social data.
 * Uses free public endpoints — no API keys required.
 */

// ── Use the shared throttle from coingecko.ts so all CG requests
//    go through a single queue and avoid 429 rate limits ──────────
import { throttledFetch } from "./coingecko";

// Alias for backward-compat within this file
const throttledCGFetch = throttledFetch;

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  time: string;
  summary: string;
  sentiment?: "Positive" | "Neutral" | "Negative";
}

export interface RedditPost {
  title: string;
  author: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  created_utc: number;
  selftext: string;
  subreddit: string;
}

export interface SocialItem {
  platform: string;
  author: string;
  url: string;
  snippet: string;
  engagement: string;
  time: string;
  rawText: string;
}

// ──────────────────────────────────────────────────────
// Time helpers
// ──────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ──────────────────────────────────────────────────────
// A. Reddit API (Public JSON — no auth required)
// ──────────────────────────────────────────────────────

export async function fetchRedditPosts(coinName: string, coinSymbol: string): Promise<SocialItem[]> {
  try {
    const query = encodeURIComponent(`${coinName} OR ${coinSymbol}`);
    const subreddits = ["cryptocurrency", "CryptoMarkets", "Bitcoin", "ethtrader", "altcoin"];
    
    const allPosts: RedditPost[] = [];

    // Search across crypto subreddits
    for (const sub of subreddits.slice(0, 3)) {
      try {
        const res = await fetch(
          `/reddit/r/${sub}/search.json?q=${query}&sort=new&limit=5&restrict_sr=on&t=week`,
          { headers: { "Accept": "application/json" } }
        );
        if (!res.ok) continue;
        const json = await res.json();
        const posts = json?.data?.children?.map((c: any) => c.data) || [];
        allPosts.push(...posts);
      } catch {
        // Skip failed subreddit
      }
    }

    // Also search general crypto subreddit
    try {
      const res = await fetch(
        `/reddit/r/cryptocurrency/search.json?q=${query}&sort=hot&limit=5&t=week`,
        { headers: { "Accept": "application/json" } }
      );
      if (res.ok) {
        const json = await res.json();
        const posts = json?.data?.children?.map((c: any) => c.data) || [];
        allPosts.push(...posts);
      }
    } catch {
      // Fallback silent
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const unique = allPosts.filter(p => {
      if (seen.has(p.title)) return false;
      seen.add(p.title);
      return true;
    });

    // Sort by score (most popular first)
    unique.sort((a, b) => b.score - a.score);

    return unique.slice(0, 8).map(post => ({
      platform: "Reddit",
      author: `u/${post.author}`,
      url: `https://reddit.com${post.permalink}`,
      snippet: post.title,
      engagement: `↑${post.score} · 💬${post.num_comments}`,
      time: timeAgo(post.created_utc),
      rawText: `${post.title} ${post.selftext || ""}`.slice(0, 500),
    }));
  } catch (err) {
    console.warn("Reddit API failed:", err);
    return [];
  }
}

// ──────────────────────────────────────────────────────
// B. Twitter/X — Use free alternatives
// Since Twitter API requires paid access, we use crypto
// social aggregators and community feeds as alternatives.
// ──────────────────────────────────────────────────────

export async function fetchTwitterPosts(coinName: string, coinSymbol: string): Promise<SocialItem[]> {
  try {
    // Use CoinGecko's community data for the coin as a proxy for social buzz
    const res = await throttledCGFetch(
      `/coingecko/api/v3/search?query=${encodeURIComponent(coinName)}`
    );
    if (!res.ok) throw new Error("CoinGecko search failed");
    const json = await res.json();
    
    const coin = json.coins?.[0];
    if (!coin) return [];

    // Fetch coin detail for community data
    const detailRes = await throttledCGFetch(
      `/coingecko/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false`
    );
    
    if (!detailRes.ok) throw new Error("Coin detail fetch failed");
    const detail = await detailRes.json();
    
    const communityData = detail.community_data || {};
    const links = detail.links || {};
    const description = detail.description?.en || "";
    
    // Generate social items from community data
    const items: SocialItem[] = [];
    
    if (communityData.twitter_followers) {
      items.push({
        platform: "Twitter/X",
        author: `@${links.twitter_screen_name || coinSymbol}`,
        url: links.twitter_screen_name ? `https://twitter.com/${links.twitter_screen_name}` : "#",
        snippet: `${coinName} has ${communityData.twitter_followers.toLocaleString()} followers on Twitter/X. Community engagement is ${communityData.twitter_followers > 100000 ? "very high" : "growing"}.`,
        engagement: `👥 ${(communityData.twitter_followers / 1000).toFixed(0)}K followers`,
        time: "Live",
        rawText: `${coinName} twitter followers ${communityData.twitter_followers} community engagement social media crypto`,
      });
    }

    if (communityData.reddit_subscribers) {
      items.push({
        platform: "Twitter/X",
        author: "Community Stats",
        url: links.subreddit_url || "#",
        snippet: `Active Reddit community with ${communityData.reddit_subscribers.toLocaleString()} subscribers and ${(communityData.reddit_average_posts_48h || 0).toFixed(0)} posts in the last 48h.`,
        engagement: `📊 ${communityData.reddit_average_comments_48h?.toFixed(0) || "N/A"} comments/48h`,
        time: "Live",
        rawText: `${coinName} reddit community ${communityData.reddit_subscribers} subscribers active posts comments`,
      });
    }

    // Add trending status item
    if (description) {
      const shortDesc = description.replace(/<[^>]*>/g, "").slice(0, 200);
      items.push({
        platform: "Twitter/X",
        author: `${coinName} Network`,
        url: detail.links?.homepage?.[0] || "#",
        snippet: shortDesc + "...",
        engagement: `🔗 ${links.repos_url?.github?.length || 0} GitHub repos`,
        time: "Official",
        rawText: shortDesc,
      });
    }

    return items.slice(0, 5);
  } catch (err) {
    console.warn("Twitter/Social fetch failed:", err);
    return [];
  }
}

// ──────────────────────────────────────────────────────
// C. Google News / Crypto News (via free APIs)
// ──────────────────────────────────────────────────────

export async function fetchCryptoNews(coinName: string, coinSymbol: string): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];

  // Source 1: CoinGecko status updates (free, no key)
  try {
    const res = await throttledCGFetch(
      `/coingecko/api/v3/search/trending`
    );
    if (res.ok) {
      const json = await res.json();
      const trendingCoins = json.coins || [];
      
      // Check if our coin is trending
      const isTrending = trendingCoins.some((c: any) => 
        c.item?.symbol?.toLowerCase() === coinSymbol.toLowerCase()
      );
      
      if (isTrending) {
        allNews.push({
          title: `${coinName} is currently trending on CoinGecko`,
          source: "CoinGecko Trending",
          url: `https://www.coingecko.com/en/coins/${coinName.toLowerCase().replace(/\s/g, '-')}`,
          time: "Now",
          summary: `${coinName} (${coinSymbol.toUpperCase()}) is among the top trending cryptocurrencies, indicating high market interest and search volume.`,
        });
      }

      // Add other trending coins as context
      trendingCoins.slice(0, 3).forEach((c: any) => {
        allNews.push({
          title: `${c.item?.name} (${c.item?.symbol}) trending with rank #${c.item?.market_cap_rank || "N/A"}`,
          source: "CoinGecko Trending",
          url: `https://www.coingecko.com/en/coins/${c.item?.id}`,
          time: "Now",
          summary: `Market is showing strong interest in ${c.item?.name}. Price: $${c.item?.data?.price?.toFixed(4) || "N/A"}.`,
        });
      });
    }
  } catch {
    // Silent fallback
  }

  // Source 2: CoinPaprika free API for news-like data
  try {
    const searchRes = await fetch(
      `/coinpaprika/v1/search?q=${encodeURIComponent(coinName)}&c=currencies&limit=1`
    );
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      const coinId = searchJson.currencies?.[0]?.id;
      
      if (coinId) {
        // Get events/updates
        const eventsRes = await fetch(
          `/coinpaprika/v1/coins/${coinId}/events`
        );
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          if (Array.isArray(events)) {
            events.slice(0, 4).forEach((event: any) => {
              allNews.push({
                title: event.name || `${coinName} Event`,
                source: "CoinPaprika",
                url: event.link || "#",
                time: event.date ? new Date(event.date).toLocaleDateString() : "Upcoming",
                summary: event.description || `Upcoming event for ${coinName} in the crypto space.`,
              });
            });
          }
        }

        // Get Twitter timeline for extra data
        const twitterRes = await fetch(
          `/coinpaprika/v1/coins/${coinId}/twitter`
        );
        if (twitterRes.ok) {
          const tweets = await twitterRes.json();
          if (Array.isArray(tweets)) {
            tweets.slice(0, 3).forEach((tweet: any) => {
              allNews.push({
                title: (tweet.status || "").slice(0, 120) + "...",
                source: `Twitter via CoinPaprika`,
                url: tweet.status_link || "#",
                time: tweet.date ? timeAgo(new Date(tweet.date).getTime() / 1000) : "Recent",
                summary: tweet.status || "",
              });
            });
          }
        }
      }
    }
  } catch {
    // Silent fallback
  }

  // Source 3: Alternative.me Fear & Greed Index
  try {
    const res = await fetch("/alternative/fng/?limit=1");
    if (res.ok) {
      const json = await res.json();
      const fng = json.data?.[0];
      if (fng) {
        allNews.push({
          title: `Crypto Fear & Greed Index: ${fng.value} — ${fng.value_classification}`,
          source: "Alternative.me",
          url: "https://alternative.me/crypto/fear-and-greed-index/",
          time: "Today",
          summary: `The market sentiment index stands at ${fng.value}/100 (${fng.value_classification}). This indicates ${
            parseInt(fng.value) > 60 ? "growing optimism" : parseInt(fng.value) < 40 ? "increasing fear" : "neutral sentiment"
          } in the broader crypto market.`,
        });
      }
    }
  } catch {
    // Silent fallback
  }

  return allNews;
}

// ──────────────────────────────────────────────────────
// D. CoinGecko Search Autocomplete
// ──────────────────────────────────────────────────────

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
}

let searchCache: { query: string; results: CoinSearchResult[]; ts: number }[] = [];

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (!query || query.length < 1) return [];

  // Check cache (5 min TTL)
  const cached = searchCache.find(c => c.query === query.toLowerCase() && Date.now() - c.ts < 300000);
  if (cached) return cached.results;

  try {
    const res = await throttledCGFetch(
      `/coingecko/api/v3/search?query=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error("Search failed");
    const json = await res.json();

    const results: CoinSearchResult[] = (json.coins || [])
      .slice(0, 15)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        thumb: c.thumb,
        market_cap_rank: c.market_cap_rank,
      }));

    // Cache results
    searchCache = searchCache.filter(c => Date.now() - c.ts < 300000).slice(-50);
    searchCache.push({ query: query.toLowerCase(), results, ts: Date.now() });

    return results;
  } catch (err) {
    console.warn("Search failed:", err);
    return [];
  }
}

// ──────────────────────────────────────────────────────
// E. Fetch full coin details from CoinGecko
// ──────────────────────────────────────────────────────

export interface CoinFullDetail {
  id: string;
  symbol: string;
  name: string;
  image: { large: string; small: string; thumb: string };
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    market_cap_rank: number;
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    price_change_percentage_1h_in_currency: { usd: number };
    price_change_percentage_1y: number;
    ath: { usd: number };
    ath_change_percentage: { usd: number };
    circulating_supply: number;
    total_supply: number;
    max_supply: number;
  };
  description: { en: string };
  links: {
    homepage: string[];
    twitter_screen_name: string;
    subreddit_url: string;
  };
  community_data: {
    twitter_followers: number;
    reddit_subscribers: number;
    reddit_average_posts_48h: number;
    reddit_average_comments_48h: number;
  };
}

let coinDetailCache: Map<string, { data: CoinFullDetail; ts: number }> = new Map();

export async function fetchCoinDetail(coinId: string): Promise<CoinFullDetail | null> {
  // Check cache (2 min TTL)
  const cached = coinDetailCache.get(coinId);
  if (cached && Date.now() - cached.ts < 120000) return cached.data;

  try {
    const res = await throttledCGFetch(
      `/coingecko/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=false`
    );
    if (!res.ok) throw new Error(`Failed to fetch coin ${coinId}`);
    const data = await res.json();

    coinDetailCache.set(coinId, { data, ts: Date.now() });
    
    // Limit cache size
    if (coinDetailCache.size > 50) {
      const oldest = [...coinDetailCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      coinDetailCache.delete(oldest[0]);
    }

    return data;
  } catch (err) {
    console.warn("Coin detail fetch failed:", err);
    return null;
  }
}

export async function fetchGeneralNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `/reddit/r/cryptocurrency/new.json?limit=10`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) throw new Error("Reddit fetch failed");
    const json = await res.json();
    const posts = json?.data?.children?.map((c: any) => c.data) || [];
    
    return posts.map((post: any) => {
      let domain = "Reddit";
      try {
        if (post.url && post.url.startsWith("http")) {
          const urlObj = new URL(post.url);
          domain = urlObj.hostname.replace("www.", "");
        }
      } catch {}
      
      return {
        title: post.title,
        source: domain,
        url: post.url ? post.url : `https://reddit.com${post.permalink}`,
        time: timeAgo(post.created_utc),
        summary: post.selftext || "",
      };
    });
  } catch (err) {
    console.warn("fetchGeneralNews failed:", err);
    return [];
  }
}

