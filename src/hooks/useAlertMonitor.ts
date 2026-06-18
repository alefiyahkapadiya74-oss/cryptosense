import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTopCoins, fetchTrending } from "@/lib/coingecko";
import { fetchCryptoNews, fetchRedditPosts } from "@/lib/newsApis";
import { toast } from "sonner";

// Sentiment Analysis Helper
const analyzeSentiment = (items: any[]) => {
  if (!items.length) return "Neutral";
  const text = items.map(i => i.title || i.snippet).join(" ").toLowerCase();
  const posWords = ["bull", "high", "growth", "surge", "up", "buy", "gain", "profit", "win", "success", "listing"];
  const negWords = ["bear", "low", "crash", "drop", "down", "sell", "loss", "scam", "hack", "failure", "red"];
  
  let pos = posWords.filter(w => text.includes(w)).length;
  let neg = negWords.filter(w => text.includes(w)).length;
  
  if (pos > neg + 1) return "Positive";
  if (neg > pos + 1) return "Negative";
  return "Neutral";
};

export const useAlertMonitor = () => {
  const newsCache = useRef<Record<string, { data: any[], ts: number }>>({});

  const { data: topCoins } = useQuery({ 
    queryKey: ["top-coins"], 
    queryFn: () => fetchTopCoins(100), 
    refetchInterval: 30000 
  });
  
  const { data: trending } = useQuery({ 
    queryKey: ["trending-monitor"], 
    queryFn: fetchTrending, 
    refetchInterval: 60000 
  });

  useEffect(() => {
    const checkLogic = async () => {
      const saved = localStorage.getItem("cryptosense_alerts_v2");
      if (!saved) return;

      let alerts = [];
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) alerts = parsed;
      } catch (e) {
        console.error("Failed to parse alerts from localStorage", e);
        return;
      }
      
      let changed = false;

      for (const [idx, alert] of alerts.entries()) {
        if (alert.triggered) continue;

        const coin = topCoins?.find(c => c.id === alert.coinId);
        if (!coin) continue;

        // Determine if we need news data
        const needsNews = alert.conditions.some((c: any) => 
          ["news_surge", "sentiment_positive", "sentiment_negative"].includes(c.type)
        );

        let newsItems: any[] = [];
        if (needsNews) {
          const cached = newsCache.current[coin.id];
          if (cached && Date.now() - cached.ts < 300000) { // 5 min cache
            newsItems = cached.data;
          } else {
            try {
              const [news, reddit] = await Promise.all([
                fetchCryptoNews(coin.name, coin.symbol),
                fetchRedditPosts(coin.name, coin.symbol)
              ]);
              newsItems = [...news, ...reddit];
              newsCache.current[coin.id] = { data: newsItems, ts: Date.now() };
            } catch (e) {
              console.warn("News fetch failed for alert", e);
            }
          }
        }

        const sentiment = needsNews ? analyzeSentiment(newsItems) : "Neutral";
        let met = alert.logic === "AND" ? true : false;

        alert.conditions.forEach((cond: any) => {
          let condMet = false;
          if (cond.type === "price_above") condMet = coin.current_price > cond.value;
          if (cond.type === "price_below") condMet = coin.current_price < cond.value;
          if (cond.type === "volatility") condMet = Math.abs(coin.price_change_percentage_24h) > 10;
          if (cond.type === "trending") condMet = trending?.coins?.some((c: any) => c.item.id === coin.id);
          if (cond.type === "news_surge") condMet = newsItems.length > 5;
          if (cond.type === "sentiment_positive") condMet = sentiment === "Positive";
          if (cond.type === "sentiment_negative") condMet = sentiment === "Negative";

          if (alert.logic === "AND") met = met && condMet;
          else met = met || condMet;
        });

        if (met) {
          toast.success(`🚨 INTELLIGENCE ALERT: ${coin.name}`, {
            description: `Triggered by ${alert.logic === "AND" ? "all" : "specific"} conditions including ${sentiment} sentiment.`,
            duration: 15000,
          });
          alerts[idx].triggered = true;
          changed = true;
        }
      }

      // Continuous Intelligence: Auto-notify about 24h market movers (>15% move)
      topCoins?.forEach(coin => {
        const move = coin.price_change_percentage_24h;
        if (Math.abs(move) > 15) {
          const key = `notif_move_${coin.id}_${Math.floor(Date.now() / 3600000)}`; // Once per hour
          if (!localStorage.getItem(key)) {
            toast(move > 0 ? "🚀 MARKET PUMP" : "📉 MARKET CRASH", {
              description: `${coin.name} is moving fast (${move.toFixed(2)}% in 24h). Price: $${coin.current_price.toLocaleString()}`,
              duration: 8000,
            });
            localStorage.setItem(key, "true");
          }
        }
      });

      if (changed) {
        localStorage.setItem("cryptosense_alerts_v2", JSON.stringify(alerts));
        window.dispatchEvent(new Event("alertsUpdated"));
      }
    };

    const interval = setInterval(checkLogic, 15000); // Check every 15s (slightly slower for news)
    return () => clearInterval(interval);
  }, [topCoins, trending]);
};
