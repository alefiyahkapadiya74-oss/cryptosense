const BASE = "/coingecko/api/v3";
const ALT_BASE = "/alternative";

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  high_24h?: number;
  low_24h?: number;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  sparkline_in_7d?: { price: number[] };
}

import { MOCK_TOP_COINS, MOCK_GLOBAL } from "./mockData";

export interface GlobalData {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_change_percentage_24h_usd: number;
  market_cap_percentage: { btc: number; eth: number };
  active_cryptocurrencies: number;
}

// ─── Request Queue / Throttle ────────────────────────
// CoinGecko free tier: ~10-30 requests/minute.
// We enforce min 1.5s between requests to stay well within limits.

let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 2000;

const requestQueue: Array<{
  run: () => Promise<any>;
  resolve: (v: any) => void;
  reject: (e: any) => void;
}> = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const entry = requestQueue.shift()!;
    const now = Date.now();
    const waitTime = Math.max(0, MIN_REQUEST_GAP_MS - (now - lastRequestTime));
    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }
    lastRequestTime = Date.now();
    try {
      const result = await entry.run();
      entry.resolve(result);
    } catch (err) {
      entry.reject(err);
    }
  }

  isProcessingQueue = false;
}

export function throttledFetch(url: string, retries = 2): Promise<Response> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      let lastErr: any;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await fetch(url);
          if (res.status === 429) {
            // Rate limited — wait and retry
            const backoff = (attempt + 1) * 3000;
            console.warn(`Rate limited on ${url}, retrying in ${backoff}ms...`);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
          return res;
        } catch (err) {
          lastErr = err;
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }
      throw lastErr || new Error("Request failed after retries");
    };
    requestQueue.push({ run, resolve, reject });
    processQueue();
  });
}

// ─── In-memory cache (5 min TTL) ────────────────────

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
  // Prune old entries
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    cache.delete(oldest[0]);
  }
}

// ─── API Functions ──────────────────────────────────

export async function fetchTopCoins(perPage = 20): Promise<MarketCoin[]> {
  const cacheKey = `top-coins-${perPage}`;
  const cached = getCached<MarketCoin[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h,7d`;
    const res = await throttledFetch(url);
    if (!res.ok) throw new Error("Rate limited or network error");
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn("CoinGecko failed, trying CoinCap fallback...", err);
    try {
      const ccRes = await fetch("https://api.coincap.io/v2/assets?limit=" + perPage);
      if (!ccRes.ok) throw new Error("CoinCap failed");
      const ccJson = await ccRes.json();
      const ccData = ccJson.data.map((c: any) => ({
        id: c.id,
        symbol: c.symbol.toLowerCase(),
        name: c.name,
        image: `https://assets.coincap.io/assets/icons/${c.symbol.toLowerCase()}@2x.png`,
        current_price: parseFloat(c.priceUsd),
        market_cap: parseFloat(c.marketCapUsd),
        market_cap_rank: parseInt(c.rank),
        total_volume: parseFloat(c.volumeUsd24Hr),
        price_change_percentage_24h: parseFloat(c.changePercent24Hr),
        high_24h: parseFloat(c.priceUsd) * (1 + Math.abs(parseFloat(c.changePercent24Hr) / 100)),
        low_24h: parseFloat(c.priceUsd) * (1 - Math.abs(parseFloat(c.changePercent24Hr) / 100)),
        ath: parseFloat(c.priceUsd) * 1.5,
        ath_change_percentage: -33,
        circulating_supply: parseFloat(c.supply),
        total_supply: parseFloat(c.maxSupply || c.supply),
        max_supply: parseFloat(c.maxSupply || 0),
      }));
      return ccData;
    } catch (ccErr) {
      console.warn("All APIs failed, using mock data", ccErr);
      return MOCK_TOP_COINS.slice(0, perPage);
    }
  }
}

export async function fetchGlobal(): Promise<GlobalData> {
  const cacheKey = "global";
  const cached = getCached<GlobalData>(cacheKey);
  if (cached) return cached;

  try {
    const res = await throttledFetch(`${BASE}/global`);
    if (!res.ok) throw new Error("Global fetch failed");
    const json = await res.json();
    setCache(cacheKey, json.data);
    return json.data;
  } catch (err) {
    return MOCK_GLOBAL;
  }
}

export async function fetchCoinChart(id: string, days = 7): Promise<{ t: number; v: number }[]> {
  const cacheKey = `chart-${id}-${days}`;
  const cached = getCached<{ t: number; v: number }[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await throttledFetch(`${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
    if (!res.ok) throw new Error("Chart fetch failed");
    const json = await res.json();
    const data = (json.prices as [number, number][]).map(([t, v]) => ({ t, v }));
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn("CoinGecko chart failed, trying CoinCap fallback...", err);
    try {
      const interval = days <= 1 ? "m15" : days <= 7 ? "h1" : "d1";
      const ccRes = await fetch(`https://api.coincap.io/v2/assets/${id}/history?interval=${interval}`);
      if (!ccRes.ok) throw new Error("CoinCap chart failed");
      const ccJson = await ccRes.json();
      const ccData = ccJson.data.map((d: any) => ({ t: d.time, v: parseFloat(d.priceUsd) }));
      
      // Filter to requested days
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      const filtered = ccData.filter((d: any) => d.t >= cutoff);
      
      if (filtered.length > 0) {
        setCache(cacheKey, filtered);
        return filtered;
      }
    } catch (ccErr) {
      console.warn("All chart APIs failed, using mock chart", ccErr);
    }

    // Generate mock chart based on known mock data for consistency
    const mockCoin = MOCK_TOP_COINS.find(c => c.id === id);
    const basePrice = mockCoin?.current_price ?? 50000;
    const points = days <= 1 ? 24 : days <= 7 ? 7 * 24 : days * 4;
    return Array.from({ length: points }, (_, i) => ({
      t: Date.now() - (points - i) * (days <= 1 ? 3600000 : days <= 7 ? 3600000 : 21600000),
      v: basePrice * (1 + (Math.sin(i / 5) * 0.03) + (Math.random() - 0.5) * 0.02),
    }));
  }
}

export async function fetchCoinPrice(id: string): Promise<number> {
  try {
    const res = await fetch(`https://api.coincap.io/v2/assets/${id}`);
    if (res.ok) {
      const json = await res.json();
      return parseFloat(json.data.priceUsd);
    }
  } catch {}
  
  try {
    const res = await throttledFetch(`${BASE}/simple/price?ids=${id}&vs_currencies=usd`);
    if (res.ok) {
      const json = await res.json();
      return json[id]?.usd || 0;
    }
  } catch {}
  
  return 0;
}

export async function fetchTrending() {
  const cacheKey = "trending";
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const res = await throttledFetch(`${BASE}/search/trending`);
    if (!res.ok) throw new Error("Trending fetch failed");
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    return { coins: [] };
  }
}

export async function fetchFearGreed() {
  const cacheKey = "fear-greed";
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${ALT_BASE}/fng/?limit=1`); // Alt.me doesn't need throttling
    if (!res.ok) throw new Error("F&G fetch failed");
    const json = await res.json();
    const data = json.data[0];
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    return { value: "50", value_classification: "Neutral" };
  }
}
