import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTopCoins, fetchGlobal, fetchFearGreed } from "@/lib/coingecko";
import { fmtUsd, fmtPct, fmtCompact } from "@/lib/format";
import { 
  TrendingUp, TrendingDown, Zap, Newspaper, 
  BarChart3, MessageSquare, Twitter, Globe,
  Star, Search, ArrowRightLeft, LayoutDashboard, Trash2, Globe2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";
import { fetchGeneralNews } from "@/lib/newsApis";
import { analyzeSentiment } from "@/lib/sentiment";

// --- Section A: Market Snapshot ---
export const MarketSnapshot = () => {
  const { data: coins, isLoading } = useQuery({ 
    queryKey: ["top-coins"], 
    queryFn: () => fetchTopCoins(100) 
  });

  if (isLoading || !coins) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const trending = coins[0];
  const sorted = [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const gainer = sorted[0];
  const loser = sorted[sorted.length - 1];
  const marketStatus = coins.filter(c => c.price_change_percentage_24h > 0).length > 50 ? "Bullish" : "Bearish";

  const cards = [
    { label: "Trending", coin: trending, icon: Zap, color: "text-yellow-400" },
    { label: "Market Status", value: marketStatus, icon: LayoutDashboard, color: marketStatus === "Bullish" ? "text-success" : "text-destructive" },
    { label: "Top Gainer", coin: gainer, icon: TrendingUp, color: "text-success" },
    { label: "Top Loser", coin: loser, icon: TrendingDown, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="glass glass-hover rounded-2xl p-5 group relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <card.icon className={cn("h-3 w-3", card.color)} /> {card.label}
            </div>
            {card.coin ? (
              <>
                <div className="flex items-center gap-3">
                  <img src={card.coin.image} alt="" className="h-6 w-6 rounded-full" />
                  <span className="font-bold text-lg">{card.coin.symbol.toUpperCase()}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-semibold">{fmtUsd(card.coin.current_price)}</span>
                  <span className={cn("text-xs", card.coin.price_change_percentage_24h > 0 ? "text-success" : "text-destructive")}>
                    {fmtPct(card.coin.price_change_percentage_24h)}
                  </span>
                </div>
              </>
            ) : (
              <div className={cn("text-2xl font-bold mt-2", card.color)}>{card.value}</div>
            )}
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <card.icon className="h-20 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Section B: Sentiment Overview ---
export const SentimentOverview = () => {
  const { data: fng } = useQuery({
    queryKey: ["fear-greed-sentiment"],
    queryFn: fetchFearGreed,
    refetchInterval: 180_000,
  });

  const { data: globalData } = useQuery({
    queryKey: ["global-sentiment"],
    queryFn: fetchGlobal,
    refetchInterval: 180_000,
  });

  const { data: news = [] } = useQuery({
    queryKey: ["general-news"],
    queryFn: fetchGeneralNews,
    refetchInterval: 180_000,
  });

  // Fear & Greed Index
  const fngVal = parseFloat(fng?.value || "50");
  const fngNormalized = (fngVal - 50) / 50; // -1 to +1

  // Global Market Cap Change 24h
  const mcapChange = globalData?.market_cap_change_percentage_24h_usd || 0;
  const marketNormalized = Math.max(-1, Math.min(1, mcapChange / 5)); // -1 to +1 (clamped)

  // News NLP analysis
  const newsTitles = news.map((n: any) => n.title).join(" ") || "";
  const newsSentiment = newsTitles ? analyzeSentiment(newsTitles).score : 0; // -1 to +1

  // Composite score (-1 to +1)
  const score = (fngNormalized * 0.4) + (marketNormalized * 0.3) + (newsSentiment * 0.3);
  const roundedScore = Math.round(score * 100) / 100;

  // Sentiment Status: Bullish, Bearish, Neutral
  let status: "Bullish" | "Neutral" | "Bearish" = "Neutral";
  if (roundedScore > 0.15) status = "Bullish";
  else if (roundedScore < -0.15) status = "Bearish";

  const statusColor = status === "Bullish" ? "text-success" : status === "Bearish" ? "text-destructive" : "text-yellow-500";
  const displayScore = (roundedScore > 0 ? "+" : "") + roundedScore.toFixed(2);

  const subItems = [
    { icon: Zap, label: "F&G Index", val: `${fngVal}/100`, colorClass: fngVal > 60 ? "text-success" : fngVal < 40 ? "text-destructive" : "text-yellow-500" },
    { icon: Globe2, label: "News NLP", val: (newsSentiment > 0 ? "+" : "") + newsSentiment.toFixed(2), colorClass: newsSentiment > 0.15 ? "text-success" : newsSentiment < -0.15 ? "text-destructive" : "text-yellow-500" },
    { icon: BarChart3, label: "Market 24h", val: (mcapChange >= 0 ? "+" : "") + mcapChange.toFixed(1) + "%", colorClass: mcapChange >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <BarChart3 className="h-24 w-24" />
      </div>
      <div className="relative">
        <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
          Market Sentiment <span className="text-xs font-normal text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">AI Analysis</span>
        </h3>
        
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-bold text-gradient">{displayScore}</div>
                <div className={cn("text-sm font-semibold mt-1", statusColor)}>
                  {status} Momentum
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Updated Live
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest">
                <span>Bearish Bias</span>
                <span>Bullish Bias</span>
              </div>
              <Progress value={(roundedScore + 1) * 50} className="h-2 bg-white/5" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {subItems.map((s, i) => (
              <div key={i} className="glass rounded-xl p-3 text-center group hover:border-primary/30 transition-colors">
                <s.icon className="h-4 w-4 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="text-[10px] uppercase text-muted-foreground mb-1">{s.label}</div>
                <div className={cn("text-xs font-bold", s.colorClass)}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Section C: Quick Actions ---
export const QuickActions = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button 
        variant="glass" 
        className="h-auto p-6 rounded-2xl justify-between group overflow-hidden relative"
        asChild
      >
        <a href="#markets">
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
              <Search className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg">Analyze Coin</div>
              <div className="text-xs text-muted-foreground">Deep dive into any asset</div>
            </div>
          </div>
          <div className="absolute right-6 opacity-20 group-hover:translate-x-2 transition-transform">
            <Search className="h-12 w-12" />
          </div>
        </a>
      </Button>
      
      <Button 
        variant="glass" 
        className="h-auto p-6 rounded-2xl justify-between group overflow-hidden relative"
        onClick={() => alert("Comparison feature coming soon!")}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-secondary/10 grid place-items-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all">
            <ArrowRightLeft className="h-6 w-6" />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg">Compare Coins</div>
            <div className="text-xs text-muted-foreground">Side-by-side market comparison</div>
          </div>
        </div>
        <div className="absolute right-6 opacity-20 group-hover:translate-x-2 transition-transform">
          <ArrowRightLeft className="h-12 w-12" />
        </div>
      </Button>
    </div>
  );
};

// --- Section D: Live News Feed ---
// --- Section D: Live News Feed ---
export const LiveNewsFeed = () => {
  const { data: news = [], isLoading } = useQuery({
    queryKey: ["general-news"],
    queryFn: fetchGeneralNews,
    refetchInterval: 60_000,
  });

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
        <Newspaper className="h-5 w-5 text-primary" /> Live News Feed
      </h3>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs italic">
          No news updates available.
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
          {news.map((item, i) => (
            <a 
              key={i} 
              href={item.url} 
              target="_blank" 
              rel="noreferrer" 
              className="block glass glass-hover rounded-xl p-4 cursor-pointer group"
            >
              <div className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2 text-white">
                {item.title}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="text-primary font-medium">{item.source}</span>
                <span>{item.time}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Section E: Watchlist Section ---
export const Watchlist = () => {
  const { watchlist, isLoading: isWatchlistLoading, toggleWatchlist } = useWatchlist();
  const { data: topCoins, isLoading: isCoinsLoading } = useQuery({ 
    queryKey: ["top-coins-watchlist"], 
    queryFn: () => fetchTopCoins(100),
    refetchInterval: 30_000
  });

  const isLoading = isWatchlistLoading || isCoinsLoading;

  // Map watchlisted items to live price data from the top coins
  const watchlistedCoins = watchlist.map((w: any) => {
    const liveData = topCoins?.find((c: any) => c.id === w.coin_id);
    return {
      id: w.coin_id,
      name: w.name,
      symbol: w.symbol,
      image: liveData?.image,
      current_price: liveData?.current_price ?? 0,
      price_change_percentage_24h: liveData?.price_change_percentage_24h ?? 0
    };
  });

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="h-6 w-32 bg-white/5 rounded-md animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> Watchlist
      </h3>
      {watchlistedCoins.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs italic">
          Your watchlist is empty. Star coins in the markets table to track them here.
        </div>
      ) : (
        <div className="space-y-3">
          {watchlistedCoins.map((coin, i) => (
            <div key={i} className="flex items-center justify-between glass glass-hover rounded-xl p-3 group">
              <div className="flex items-center gap-3">
                {coin.image ? (
                  <img src={coin.image} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/5" />
                )}
                <div>
                  <div className="font-bold text-sm uppercase">{coin.symbol}</div>
                  <div className="text-[10px] text-muted-foreground">{coin.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">{fmtUsd(coin.current_price)}</div>
                  <div className={cn("text-[10px] font-medium", coin.price_change_percentage_24h > 0 ? "text-success" : "text-destructive")}>
                    {fmtPct(coin.price_change_percentage_24h)}
                  </div>
                </div>
                <button
                  onClick={() => toggleWatchlist({ id: coin.id, symbol: coin.symbol, name: coin.name })}
                  className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/5"
                  title="Remove from watchlist"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
