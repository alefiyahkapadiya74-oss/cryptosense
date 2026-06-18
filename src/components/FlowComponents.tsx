import React, { useState, useEffect } from "react";
import { 
  Search, ArrowRightLeft, Newspaper, ArrowLeft, Send, TrendingUp, TrendingDown, 
  Info, AlertTriangle, FileText, BarChart, Twitter, MessageSquare, Globe, 
  Wallet, Bell, Plus, Trash2, LayoutDashboard, Zap, Activity, RefreshCw, Shield, Brain,
  ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { fetchTopCoins, fetchCoinChart, fetchFearGreed, fetchTrending } from "@/lib/coingecko";
import { fmtUsd, fmtPct, fmtCompact } from "@/lib/format";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAccount } from "wagmi";

// Shared components
import { CoinSearchInput } from "./CoinSearchInput";
import { usePortfolio } from "@/hooks/usePortfolio";

// Re-export AnalysisView from its dedicated file
export { AnalysisView } from "@/components/AnalysisView";

// --- Chart Component ---
const SimpleChart = ({ data, color }: { data: any[], color: string }) => (
  <div className="h-[250px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
        <XAxis hide dataKey="t" />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
          labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
          formatter={(v: number) => [fmtUsd(v), "Price"]}
        />
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#grad-${color.replace("#","")})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// --- Dashboard Choice ---
export const DashboardChoice = ({ onSelect }: { onSelect: (view: string) => void }) => {
  const { data: fng } = useQuery({ queryKey: ["fear-greed"], queryFn: fetchFearGreed, refetchInterval: 180_000 });
  const { data: trending } = useQuery({ queryKey: ["trending"], queryFn: fetchTrending, refetchInterval: 180_000 });
  const { holdings, totalValue, totalProfitLoss, totalProfitLossPercentage, isLoading } = usePortfolio();

  const options = [
    { id: "analysis", title: "Single Analysis", desc: "AI-powered insights for any coin", icon: Search, color: "text-blue-400", bg: "bg-blue-500/10" },
    { id: "compare", title: "Compare Coins", desc: "Side-by-side asset comparison", icon: ArrowRightLeft, color: "text-purple-400", bg: "bg-purple-500/10" },
    { id: "portfolio", title: "Portfolio Tracker", desc: "Track your holdings & profit", icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { id: "alerts", title: "Smart Alerts", desc: "Real-time price & sentiment alerts", icon: Bell, color: "text-orange-400", bg: "bg-orange-500/10" },
    { id: "news", title: "Global News", desc: "Latest headlines & trending info", icon: Newspaper, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { id: "prediction", title: "AI Prediction", desc: "Price forecasting & signal analysis", icon: Brain, color: "text-pink-400", bg: "bg-pink-500/10" },
  ];

  return (
    <div className="container py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Section: Global Mood */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden bg-gradient-to-r from-primary/10 to-transparent border border-white/10">
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-3xl font-bold mb-2">Welcome to <span className="text-gradient">CryptoSense</span></h2>
            <p className="text-muted-foreground max-w-md">Your professional AI-powered intelligence dashboard. Analyze, compare, and track any asset with real-time data.</p>
          </div>
          <div className="flex-1 w-full grid grid-cols-2 gap-4 relative z-10">
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">Global Mood</div>
              <div className="text-2xl font-black text-white">{fng?.value || "--"}</div>
              <div className={cn("text-xs font-bold", (fng?.value || 0) > 60 ? "text-success" : (fng?.value || 0) < 40 ? "text-destructive" : "text-yellow-500")}>
                {fng?.value_classification || "Loading..." }
              </div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">Market State</div>
              <div className="text-sm font-bold flex items-center justify-center gap-1 text-blue-400">
                <Zap className="h-3 w-3" /> Bullish Bias
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 h-64 w-64 bg-primary/20 blur-[100px] -z-10 rounded-full" />
        </div>

        <div className="glass rounded-3xl p-6 overflow-hidden">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary" /> Trending Now
          </div>
          <div className="space-y-3">
            {trending?.coins?.slice(0, 4).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <img src={c.item.thumb} alt="" className="h-6 w-6 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate text-white">{c.item.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{c.item.symbol}</div>
                </div>
                <div className="text-[10px] font-mono text-primary font-bold">#{c.item.market_cap_rank || "N/A"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Status Widget */}
      <div className="glass rounded-3xl p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-emerald-500/5 to-transparent">
        <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 blur-[60px] rounded-full" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-black">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" /> Your Portfolio Status
            </div>
            <div className="flex items-baseline gap-4 mt-2">
              {isLoading ? (
                <Skeleton className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <>
                  <span className="text-4xl font-black text-white tracking-tight">{fmtUsd(totalValue)}</span>
                  <span className={cn(
                    "text-sm font-bold flex items-center gap-1",
                    totalProfitLoss >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {totalProfitLoss >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {totalProfitLoss >= 0 ? "+" : ""}{fmtUsd(totalProfitLoss)} ({totalProfitLossPercentage.toFixed(2)}%)
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button onClick={() => onSelect("portfolio")} className="rounded-full bg-gradient-primary shadow-glow-cyan h-12 px-8 font-black flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Go to Portfolio
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 border-t border-white/5 pt-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : holdings.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 border-t border-white/5 pt-6">
            {holdings.slice(0, 6).map((h, idx) => (
              <div key={idx} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/5 grid place-items-center shrink-0">
                  {h.image ? <img src={h.image} alt="" className="h-7 w-7" /> : <Wallet className="h-4 w-4 text-emerald-400" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white uppercase truncate">{h.symbol}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{h.amount.toLocaleString()}</div>
                  <div className="text-[10px] text-white font-bold font-mono mt-0.5">{fmtUsd(h.amount * h.current_price)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 border-t border-white/5 pt-6 text-sm text-muted-foreground italic">
            No active holdings recorded. Click the button above to add assets and log buy/sell transactions.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="glass glass-hover rounded-3xl p-6 text-left group transition-all duration-500 border border-white/5"
          >
            <div className={cn("h-12 w-12 rounded-2xl grid place-items-center mb-6 group-hover:scale-110 transition-transform", opt.bg, opt.color)}>
              <opt.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-white">{opt.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Portfolio View (Wallet Intelligence) ---
export const PortfolioView = ({ onBack }: { onBack: () => void }) => {
  const { address: connectedAddress } = useAccount();
  const [trackedAddress, setTrackedAddress] = useState("");
  
  const {
    holdings,
    transactions,
    totalValue,
    totalProfitLoss,
    totalProfitLossPercentage,
    portfolioChange24hPercentage,
    isLoading,
    addTransaction,
    isAddingTransaction,
  } = usePortfolio();

  const [showAdd, setShowAdd] = useState(false);
  const [showTrack, setShowTrack] = useState(false);

  // States for Add Transaction Modal
  const [txType, setTxType] = useState<"buy" | "sell">("buy");
  const [selectedCoin, setSelectedCoin] = useState<{ id: string; name: string; symbol: string } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const activeAddress = connectedAddress || trackedAddress;

  const [activeInsightTab, setActiveInsightTab] = useState<"strengths" | "risks" | "recommendations">("strengths");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { data: topCoins } = useQuery({ 
    queryKey: ["top-coins"], 
    queryFn: () => fetchTopCoins(100), 
    refetchInterval: 180_000 
  });

  const { data: fng } = useQuery({ 
    queryKey: ["fear-greed"], 
    queryFn: fetchFearGreed, 
    refetchInterval: 180_000 
  });

  const handleAddTransaction = async () => {
    if (!selectedCoin) {
      toast.error("Please select an asset.");
      return;
    }
    const amountVal = parseFloat(quantity);
    const priceVal = parseFloat(price);

    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Please enter a valid quantity greater than 0.");
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      toast.error("Please enter a valid price.");
      return;
    }

    try {
      await addTransaction({
        coin_id: selectedCoin.id,
        symbol: selectedCoin.symbol,
        name: selectedCoin.name,
        type: txType,
        amount: amountVal,
        price: priceVal,
        notes: notes || null,
      });
      
      // Reset state and close modal
      setQuantity("");
      setPrice("");
      setNotes("");
      setSelectedCoin(null);
      setShowAdd(false);
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const diversity = (() => {
    if (holdings.length === 0 || totalValue === 0) {
      return [];
    }
    const sorted = [...holdings].sort((a, b) => b.value - a.value);
    const top2 = sorted.slice(0, 2);
    const others = sorted.slice(2);
    
    const result = top2.map(h => ({
      symbol: h.symbol.toUpperCase(),
      percentage: (h.value / totalValue) * 100,
      color: "bg-primary shadow-glow-cyan",
      textColor: "text-primary"
    }));
    
    if (others.length > 0) {
      const othersVal = others.reduce((sum, h) => sum + h.value, 0);
      result.push({
        symbol: "OTHER",
        percentage: (othersVal / totalValue) * 100,
        color: "bg-white/20",
        textColor: "text-muted-foreground"
      });
    }
    
    if (result.length > 1 && result[1].symbol !== "OTHER") {
      result[1].color = "bg-secondary shadow-glow-violet";
      result[1].textColor = "text-secondary";
    }
    
    return result;
  })();

  const numHoldings = holdings.length;
  
  // 1. Diversification Score (HHI-based)
  const HHI = numHoldings === 0 ? 0 : holdings.reduce((sum, h) => sum + Math.pow(h.value / totalValue, 2), 0);
  const diversificationScore = numHoldings === 0 ? 0 : Math.max(0, 100 * (1 - HHI));
  const diversificationBonus = diversificationScore * 0.3;

  // 2. Concentration Risk
  const maxWeight = numHoldings === 0 ? 0 : Math.max(...holdings.map(h => h.value / totalValue));
  const maxWeightPct = maxWeight * 100;
  let concentrationRiskLevel = "Low";
  let concentrationPenalty = 0;
  if (maxWeightPct > 70) {
    concentrationRiskLevel = "High";
    concentrationPenalty = -25;
  } else if (maxWeightPct > 40) {
    concentrationRiskLevel = "Medium";
    concentrationPenalty = -10;
  }

  // Volatility math
  const calculateVolatility = (prices: number[]): number => {
    if (!prices || prices.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }
    if (returns.length < 2) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev * Math.sqrt(24 * 365) * 100;
  };

  const getFallbackVolatility = (symbol: string): number => {
    const sym = symbol.toLowerCase();
    if (sym.includes("usdt") || sym.includes("usdc") || sym.includes("dai") || sym.includes("usd") || sym.includes("fdusd") || sym.includes("pyusd") || sym.includes("tusd")) {
      return 2;
    }
    if (sym === "btc" || sym === "wbtc") {
      return 50;
    }
    if (sym === "eth" || sym === "weth") {
      return 60;
    }
    return 90;
  };

  // 3. Volatility Risk
  let portfolioVolatility = 0;
  if (numHoldings > 0 && totalValue > 0) {
    portfolioVolatility = holdings.reduce((sum, h) => {
      const weight = h.value / totalValue;
      const matchingCoin = topCoins?.find((c) => c.id.toLowerCase() === h.coin_id.toLowerCase() || c.symbol.toLowerCase() === h.symbol.toLowerCase());
      const coinVol = (matchingCoin?.sparkline_in_7d?.price && matchingCoin.sparkline_in_7d.price.length >= 2)
        ? calculateVolatility(matchingCoin.sparkline_in_7d.price)
        : getFallbackVolatility(h.symbol);
      return sum + weight * coinVol;
    }, 0);
  }

  let volatilityRiskLevel = "Low";
  let volatilityPenalty = 0;
  if (portfolioVolatility > 85) {
    volatilityRiskLevel = "Extreme";
    volatilityPenalty = -30;
  } else if (portfolioVolatility > 55) {
    volatilityRiskLevel = "High";
    volatilityPenalty = -15;
  } else if (portfolioVolatility > 15) {
    volatilityRiskLevel = "Medium";
    volatilityPenalty = -5;
  }

  // 4. Portfolio Health Score
  const baseScore = 60;
  const pnlAdj = totalProfitLossPercentage >= 0 
    ? Math.min(15, totalProfitLossPercentage * 0.5)
    : -Math.min(15, Math.abs(totalProfitLossPercentage) * 0.5);

  const fngVal = fng ? parseInt(fng.value) : 50;
  const sentimentAdj = (fngVal - 50) / 5;

  const rawHealthScore = baseScore + diversificationBonus + concentrationPenalty + volatilityPenalty + pnlAdj + sentimentAdj;
  const healthScore = numHoldings === 0 ? 0 : Math.max(5, Math.min(100, Math.round(rawHealthScore)));

  // Generate dynamic insights
  const advisorInsights = (() => {
    if (numHoldings === 0) {
      return {
        strengths: ["No active holdings recorded. Your capital is 100% in cash/off-chain."],
        risks: ["No market exposure. You are not participating in potential crypto asset growth."],
        recommendations: ["Log buy/sell transactions using the button above to begin tracking and receive portfolio optimization advice."]
      };
    }

    const strengths: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];

    if (diversificationScore >= 70) {
      strengths.push("Strong diversification across multiple assets, reducing idiosyncratic risk.");
    } else if (diversificationScore >= 40) {
      strengths.push("Moderate diversification helps shield the portfolio from single-asset shocks.");
    } else {
      risks.push("Weak diversification. Your portfolio is highly dependent on a few assets.");
      recommendations.push("Consider allocating capital across 2-3 additional assets to improve diversification.");
    }

    if (concentrationRiskLevel === "Low") {
      strengths.push("Well-balanced portfolio allocation with no single asset dominating.");
    } else if (concentrationRiskLevel === "High") {
      risks.push(`Critical concentration: your largest asset represents ${maxWeightPct.toFixed(1)}% of your portfolio.`);
      recommendations.push("Trim positions in your largest holding to lock in profits and rebalance into underallocated assets.");
    } else if (concentrationRiskLevel === "Medium") {
      risks.push(`Moderate concentration: your largest asset represents ${maxWeightPct.toFixed(1)}% of your portfolio.`);
      recommendations.push("Monitor your largest asset carefully; consider partial rebalancing if it continues to grow.");
    }

    if (volatilityRiskLevel === "Low") {
      strengths.push("Stable portfolio volatility profile, minimizing drawdown risk.");
    } else if (volatilityRiskLevel === "High" || volatilityRiskLevel === "Extreme") {
      risks.push(`High volatility profile (${portfolioVolatility.toFixed(1)}%). Significant price fluctuations are expected.`);
      recommendations.push("Increase exposure to stablecoins or large-cap assets (BTC) to dampen portfolio volatility.");
    } else {
      strengths.push(`Balanced volatility profile (${portfolioVolatility.toFixed(1)}%), matching a moderate growth strategy.`);
    }

    if (totalProfitLossPercentage >= 10) {
      strengths.push(`Excellent overall return profile, outperforming with a +${totalProfitLossPercentage.toFixed(1)}% net gain.`);
    } else if (totalProfitLossPercentage > 0) {
      strengths.push(`Portfolio is in a net profitable state (+${totalProfitLossPercentage.toFixed(1)}%).`);
    } else if (totalProfitLossPercentage < -10) {
      risks.push(`Significant drawdown: portfolio is currently running a net loss of ${totalProfitLossPercentage.toFixed(1)}%.`);
      recommendations.push("Review entry price points and consider dollar-cost averaging (DCA) to lower average cost basis.");
    }

    if (fngVal <= 25) {
      strengths.push(`Positioned well during extreme market fear (F&G: ${fngVal}/100) where assets are historically undervalued.`);
      recommendations.push(`Fear index is low (${fngVal}/100). This represents a historically good buying zone for long-term positions.`);
    } else if (fngVal >= 75) {
      risks.push(`Market is in Extreme Greed (F&G: ${fngVal}/100). Elevated probability of short-term corrections.`);
      recommendations.push("Exercise extreme caution with new lump-sum buys. Consider waiting for a pullback or setting strict stop-losses.");
    }

    if (strengths.length === 0) {
      strengths.push("Holdings are fully logged and tracking live market updates.");
    }
    if (risks.length === 0) {
      strengths.push("No immediate high-risk alerts detected under current market conditions.");
    }
    if (recommendations.length === 0) {
      recommendations.push("Maintain your current allocation and monitor upcoming macro sentiment shifts.");
    }

    return { strengths, risks, recommendations };
  })();

  return (
    <div className="container py-12 space-y-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex gap-4">
          <Button onClick={() => setShowTrack(true)} variant="glass" className="gap-2 rounded-full border-primary/20">
            <Globe className="h-4 w-4 text-primary" /> Track External Wallet
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2 rounded-full bg-gradient-primary shadow-glow-cyan">
            <Plus className="h-4 w-4" /> Log Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass rounded-[40px] p-8 relative overflow-hidden neon-border">
            <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/10 blur-3xl" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Net Worth</h3>
            <div className="text-5xl font-black text-white tracking-tighter mb-2">
              {isLoading ? <Skeleton className="h-12 w-48 bg-white/5" /> : fmtUsd(totalValue)}
            </div>
            
            {isLoading ? (
              <Skeleton className="h-5 w-40 bg-white/5 mt-2 animate-pulse" />
            ) : (
              <>
                <div className={cn(
                  "flex items-center gap-2 text-xs font-bold",
                  totalProfitLoss >= 0 ? "text-success" : "text-destructive"
                )}>
                  {totalProfitLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {totalProfitLoss >= 0 ? "+" : ""}{fmtUsd(totalProfitLoss)} ({totalProfitLossPercentage.toFixed(2)}% Total P&L)
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 text-[10px] font-bold mt-2",
                  portfolioChange24hPercentage >= 0 ? "text-success/80" : "text-destructive/80"
                )}>
                  <span>24h Change:</span>
                  <span>{portfolioChange24hPercentage >= 0 ? "+" : ""}{portfolioChange24hPercentage.toFixed(2)}%</span>
                </div>
              </>
            )}
            
            <div className="mt-10 pt-10 border-t border-white/5 space-y-6">
              <div>
                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-3">Portfolio Diversity</div>
                {isLoading ? (
                  <Skeleton className="h-8 w-full bg-white/5 rounded-xl animate-pulse" />
                ) : diversity.length === 0 ? (
                  <div className="text-[10px] text-muted-foreground italic">No assets to calculate diversity.</div>
                ) : (
                  <>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                      {diversity.map((div, idx) => (
                        <div 
                          key={idx} 
                          className={cn("h-full", div.color)} 
                          style={{ width: `${div.percentage}%` }} 
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[9px] font-bold uppercase tracking-widest">
                      {diversity.map((div, idx) => (
                        <span key={idx} className={div.textColor}>
                          {div.symbol} {div.percentage.toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {activeAddress && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="text-[10px] uppercase font-black text-primary tracking-widest">Active Intelligence</div>
                  <div className="text-[10px] font-mono text-white break-all">{activeAddress}</div>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-[40px] p-8 space-y-6 bg-gradient-to-br from-primary/5 to-secondary/5 border border-white/10 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6 text-primary animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg text-white">AI Portfolio Advisor</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Dynamic Risk Analysis</p>
                </div>
              </div>
              <div className="bg-primary/10 text-primary text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Active AI
              </div>
            </div>

            {/* Score and Main Metrics */}
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              {/* Gauge */}
              <div className="flex flex-col items-center justify-center relative shrink-0">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="45"
                    className="stroke-white/5 fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="45"
                    className={cn(
                      "fill-none transition-all duration-1000 ease-out",
                      healthScore >= 75 ? "stroke-success" : healthScore >= 45 ? "stroke-yellow-500" : "stroke-destructive"
                    )}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={2 * Math.PI * 45 - (healthScore / 100) * 2 * Math.PI * 45}
                    strokeLinecap="round"
                    style={{
                      filter: healthScore >= 75 
                        ? "drop-shadow(0 0 6px hsl(var(--success)))" 
                        : healthScore >= 45 
                          ? "drop-shadow(0 0 6px #eab308)" 
                          : "drop-shadow(0 0 6px hsl(var(--destructive)))"
                    }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{healthScore}</span>
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Health</span>
                </div>
              </div>

              {/* Sub-Metrics */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Diversification</span>
                  <span className="font-bold text-white font-mono">{diversificationScore.toFixed(0)}/100</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Concentration Risk</span>
                  <span className={cn(
                    "font-bold uppercase",
                    concentrationRiskLevel === "High" ? "text-destructive" : concentrationRiskLevel === "Medium" ? "text-yellow-500" : "text-success"
                  )}>
                    {concentrationRiskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Volatility Risk</span>
                  <span className={cn(
                    "font-bold uppercase",
                    volatilityRiskLevel === "Extreme" || volatilityRiskLevel === "High" ? "text-destructive" : volatilityRiskLevel === "Medium" ? "text-yellow-500" : "text-success"
                  )}>
                    {volatilityRiskLevel} ({portfolioVolatility.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Why This Score? Breakdown */}
            <div className="border-t border-white/5 pt-4">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground hover:text-white transition-colors"
              >
                <span>Why this score?</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-primary">{showBreakdown ? "Hide Details" : "Show Details"}</span>
                  {showBreakdown ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />}
                </div>
              </button>

              {showBreakdown && (
                <div className="mt-3 space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 text-xs font-mono animate-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Base Score:</span>
                    <span className="text-white">60.0 pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Diversification Bonus:</span>
                    <span className="text-success font-bold">+{diversificationBonus.toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Concentration Penalty:</span>
                    <span className={concentrationPenalty < 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
                      {concentrationPenalty === 0 ? "0.0 pts" : `${concentrationPenalty.toFixed(1)} pts`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Volatility Penalty:</span>
                    <span className={volatilityPenalty < 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
                      {volatilityPenalty === 0 ? "0.0 pts" : `${volatilityPenalty.toFixed(1)} pts`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">P&L Adjustment:</span>
                    <span className={pnlAdj >= 0 ? "text-success font-bold" : "text-destructive font-bold"}>
                      {pnlAdj >= 0 ? "+" : ""}{pnlAdj.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sentiment Adjustment:</span>
                    <span className={sentimentAdj >= 0 ? "text-success font-bold" : "text-destructive font-bold"}>
                      {sentimentAdj >= 0 ? "+" : ""}{sentimentAdj.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-2 font-bold text-white">
                    <span>Final Score:</span>
                    <span className={healthScore >= 75 ? "text-success" : healthScore >= 45 ? "text-yellow-500" : "text-destructive"}>
                      {healthScore} / 100
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tabbed Insights */}
            <div className="border-t border-white/5 pt-4 space-y-4">
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                {(["strengths", "risks", "recommendations"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveInsightTab(tab)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all",
                      activeInsightTab === tab
                        ? tab === "strengths"
                          ? "bg-success text-white shadow-lg shadow-success/20"
                          : tab === "risks"
                            ? "bg-destructive text-white shadow-lg shadow-destructive/20"
                            : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="min-h-[120px] transition-all duration-300">
                {activeInsightTab === "strengths" && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    {advisorInsights.strengths.map((str, idx) => (
                      <div key={idx} className="flex gap-2.5 p-3 rounded-2xl bg-success/5 border border-success/10 text-xs text-white">
                        <Shield className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{str}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeInsightTab === "risks" && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    {advisorInsights.risks.map((risk, idx) => (
                      <div key={idx} className="flex gap-2.5 p-3 rounded-2xl bg-destructive/5 border border-destructive/10 text-xs text-white">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{risk}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeInsightTab === "recommendations" && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    {advisorInsights.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-2.5 p-3 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-white">
                        <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="border-t border-white/5 pt-4 text-center">
              <span className="text-[9px] text-muted-foreground italic leading-tight block">
                This analysis is informational only and not financial advice.
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-[40px] overflow-hidden neon-border">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-bold">Asset Allocation</h3>
            </div>
            <div className="text-[10px] uppercase font-black text-success flex items-center gap-2 tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live Sync
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-muted-foreground tracking-widest border-b border-white/5 bg-white/5">
                  <th className="px-8 py-6 font-black">Asset</th>
                  <th className="px-8 py-6 font-black text-right">Holdings</th>
                  <th className="px-8 py-6 font-black text-right">Avg Price</th>
                  <th className="px-8 py-6 font-black text-right">Live Price</th>
                  <th className="px-8 py-6 font-black text-right">Net Value</th>
                  <th className="px-8 py-6 font-black text-right">Profit / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-8 py-6">
                        <Skeleton className="h-12 bg-white/5 rounded-2xl w-full" />
                      </td>
                    </tr>
                  ))
                ) : holdings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center text-muted-foreground text-lg italic bg-white/2">
                      No assets tracked. Add your transactions to unlock intelligence reports.
                    </td>
                  </tr>
                ) : holdings.map((item, i) => {
                  return (
                    <tr key={i} className="hover:bg-white/5 transition-all group float-shadow">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-white/5 grid place-items-center relative">
                            {item.image ? <img src={item.image} alt="" className="h-8 w-8" /> : <Wallet className="h-5 w-5 text-emerald-400" />}
                            <div className="absolute inset-0 bg-primary/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div>
                            <div className="font-black text-white text-lg leading-tight">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{item.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-mono text-sm font-bold text-white">
                        {item.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-muted-foreground text-[10px]">{item.symbol.toUpperCase()}</span>
                      </td>
                      <td className="px-8 py-6 text-right font-mono text-sm text-muted-foreground">
                        {fmtUsd(item.buy_price_avg)}
                      </td>
                      <td className="px-8 py-6 text-right font-mono text-sm text-muted-foreground">
                        {fmtUsd(item.current_price)}
                      </td>
                      <td className="px-8 py-6 text-right font-mono text-lg font-black text-primary shadow-glow-cyan">
                        {fmtUsd(item.value)}
                      </td>
                      <td className={cn(
                        "px-8 py-6 text-right font-mono text-sm font-bold",
                        item.profitLoss >= 0 ? "text-success" : "text-destructive"
                      )}>
                        <div>{item.profitLoss >= 0 ? "+" : ""}{fmtUsd(item.profitLoss)}</div>
                        <div className="text-[10px] font-bold">{item.profitLoss >= 0 ? "+" : ""}{item.profitLossPercentage.toFixed(2)}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="glass rounded-[40px] overflow-hidden border border-white/5 neon-border">
        <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold">Transaction History</h3>
          </div>
          <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
            Recorded Ledgers
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-muted-foreground tracking-widest border-b border-white/5 bg-white/5">
                <th className="px-8 py-6 font-black">Date</th>
                <th className="px-8 py-6 font-black">Asset</th>
                <th className="px-8 py-6 font-black text-center">Type</th>
                <th className="px-8 py-6 font-black text-right">Amount</th>
                <th className="px-8 py-6 font-black text-right">Price</th>
                <th className="px-8 py-6 font-black text-right">Total</th>
                <th className="px-8 py-6 font-black">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-8 py-5">
                      <Skeleton className="h-10 bg-white/5 rounded-xl w-full" />
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-muted-foreground text-sm italic bg-white/2">
                    No transactions recorded yet. Add your first transaction above!
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-all">
                    <td className="px-8 py-5 font-mono text-xs text-muted-foreground">
                      {new Date(tx.transaction_date).toLocaleString()}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{tx.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono">({tx.symbol})</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={cn(
                        "text-[9px] uppercase font-black px-2 py-0.5 rounded-md",
                        tx.type === "buy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-sm text-white">
                      {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-sm text-muted-foreground">
                      {fmtUsd(tx.price)}
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-sm font-bold text-white">
                      {fmtUsd(tx.amount * tx.price)}
                    </td>
                    <td className="px-8 py-5 text-sm text-muted-foreground truncate max-w-[200px]">
                      {tx.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Transaction Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass rounded-[40px] p-10 max-w-md w-full shadow-2xl border border-white/10 scale-in-95 animate-in">
            <h3 className="text-3xl font-black tracking-tighter mb-6 text-white">Log Transaction</h3>
            
            {/* Buy / Sell Tab Switcher */}
            <div className="grid grid-cols-2 p-1.5 bg-white/5 rounded-2xl mb-6 border border-white/5">
              <button
                type="button"
                onClick={() => setTxType("buy")}
                className={cn(
                  "py-2 text-sm font-bold rounded-xl transition-all",
                  txType === "buy" 
                    ? "bg-success text-white shadow-lg shadow-success/25" 
                    : "text-muted-foreground hover:text-white"
                )}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setTxType("sell")}
                className={cn(
                  "py-2 text-sm font-bold rounded-xl transition-all",
                  txType === "sell" 
                    ? "bg-destructive text-white shadow-lg shadow-destructive/25" 
                    : "text-muted-foreground hover:text-white"
                )}
              >
                Sell
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest ml-1">Search Asset</label>
                <CoinSearchInput 
                  onSelect={(id, name, symbol) => {
                    setSelectedCoin({ id, name, symbol });
                    const livePrice = topCoins?.find(c => c.id === id)?.current_price || 0;
                    setPrice(livePrice ? livePrice.toString() : "");
                  }} 
                  placeholder="e.g. bitcoin, ethereum..."
                />
              </div>

              {selectedCoin && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between animate-in fade-in duration-300">
                  <div>
                    <span className="text-xs text-muted-foreground block uppercase font-bold">Selected Asset</span>
                    <span className="text-sm font-bold text-white">{selectedCoin.name} ({selectedCoin.symbol.toUpperCase()})</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedCoin(null)} 
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest ml-1">Quantity</label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  placeholder="0.00" 
                  className="h-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest ml-1">Price per Coin (USD)</label>
                <Input 
                  type="number" 
                  value={price} 
                  onChange={e => setPrice(e.target.value)} 
                  placeholder="0.00" 
                  className="h-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest ml-1">Notes (Optional)</label>
                <Input 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Bought the dip, staking, etc." 
                  className="h-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50" 
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => {
                    setShowAdd(false);
                    setSelectedCoin(null);
                    setQuantity("");
                    setPrice("");
                    setNotes("");
                  }} 
                  variant="ghost" 
                  className="flex-1 h-12 rounded-2xl font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddTransaction} 
                  disabled={isAddingTransaction}
                  className="flex-1 h-12 rounded-2xl bg-gradient-primary shadow-glow-cyan font-black"
                >
                  {isAddingTransaction ? "Saving..." : "Log Tx"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTrack && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass rounded-[40px] p-10 max-w-lg w-full shadow-2xl border border-white/10 scale-in-95 animate-in">
            <h3 className="text-3xl font-black tracking-tighter mb-8 text-white">Track Public Wallet</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest ml-1">Wallet Address (EVM/Solana)</label>
                <Input 
                  value={trackedAddress} 
                  onChange={e => setTrackedAddress(e.target.value)} 
                  placeholder="0x... or Address" 
                  className="h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 font-mono text-sm" 
                />
              </div>
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                <Info className="h-6 w-6 text-primary shrink-0 mt-1" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Entering a public address allows CryptoSense to monitor on-chain movements and calculate a real-time risk score without requiring a direct connection.
                </p>
              </div>
              <div className="flex gap-4 pt-6">
                <Button onClick={() => setShowTrack(false)} variant="ghost" className="flex-1 h-14 rounded-2xl text-lg font-bold">Cancel</Button>
                <Button onClick={() => { setShowTrack(false); toast.success("Wallet tracking active"); }} className="flex-1 h-14 rounded-2xl bg-gradient-primary shadow-glow-cyan text-lg font-black">Begin Tracking</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Advanced Alerts View ---
export const AlertsView = ({ onBack }: { onBack: () => void }) => {
  const [alerts, setAlerts] = useState<any[]>(() => {
    const saved = localStorage.getItem("cryptosense_alerts_v2");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [activeCoinId, setActiveCoinId] = useState("");
  const [conditions, setConditions] = useState<{ type: string, value: string }[]>([
    { type: "price_above", value: "" }
  ]);
  const [logic, setLogic] = useState<"AND" | "OR">("AND");

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem("cryptosense_alerts_v2", JSON.stringify(alerts));
  }, [alerts]);

  const { data: topCoins } = useQuery({ queryKey: ["top-coins"], queryFn: () => fetchTopCoins(100), refetchInterval: 180_000 });
  const { data: trending } = useQuery({ queryKey: ["trending"], queryFn: fetchTrending, refetchInterval: 180_000 });

  // Background Sync: Listen for global alert triggers
  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("cryptosense_alerts_v2");
      if (saved) setAlerts(JSON.parse(saved));
    };
    window.addEventListener("alertsUpdated", sync);
    return () => window.removeEventListener("alertsUpdated", sync);
  }, []);

  const handleAdd = async () => {
    const coin = topCoins?.find(c => c.id === activeCoinId);
    if (!coin) {
      toast.error("Please select a valid coin");
      return;
    }
    const newAlert = {
      coinId: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      conditions: conditions.map(c => ({ type: c.type, value: parseFloat(c.value) })),
      logic,
      triggered: false,
      createdAt: new Date().toISOString(),
    };
    
    setAlerts([...alerts, newAlert]);
    setShowAdd(false);
    setActiveCoinId("");
    setConditions([{ type: "price_above", value: "" }]);
    toast.success("Advanced alert armed and active");
  };

  const removeAlert = async (idx: number) => {
    setAlerts(alerts.filter((_, i) => i !== idx));
    toast.info("Alert deactivated");
  };

  const addCondition = () => {
    if (conditions.length < 3) setConditions([...conditions, { type: "price_above", value: "" }]);
  };

  return (
    <div className="container py-12 space-y-10 animate-in fade-in duration-700 relative">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setAlerts(alerts.map(a => ({...a, triggered: false})))} className="rounded-full border-white/10 hover:bg-white/5">
            <RefreshCw className="h-4 w-4 mr-2" /> Reset All
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2 rounded-full bg-gradient-primary shadow-glow-cyan h-12 px-8 font-black">
            <Zap className="h-4 w-4" /> Create Intelligence Alert
          </Button>
        </div>
      </div>

      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-5xl font-black tracking-tighter text-white">Smart <span className="text-gradient">Alerts</span></h2>
        <p className="text-muted-foreground text-lg">Multi-condition triggers with volatility and trending detection.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {alerts.length === 0 ? (
          <div className="col-span-full glass rounded-[40px] p-24 text-center border-dashed border-2 border-white/5 opacity-50">
            <Bell className="h-16 w-16 mx-auto mb-6 text-muted-foreground/20" />
            <h3 className="text-xl font-bold">No active monitors</h3>
            <p className="text-sm mt-2">Arm your first smart alert to track market anomalies.</p>
          </div>
        ) : alerts.map((alert, i) => (
          <div key={i} className={cn(
            "neon-border rounded-[32px] overflow-hidden group transition-all duration-500",
            alert.triggered ? "opacity-60 grayscale-[0.5]" : "float-shadow"
          )}>
            <div className="glass p-8 h-full space-y-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={alert.image} className="h-10 w-10 rounded-full bg-white/5" />
                  <div>
                    <div className="text-sm font-black text-white">{alert.name}</div>
                    <div className="text-[10px] text-primary font-bold uppercase">{alert.symbol}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {alert.triggered && <div className="bg-success/20 text-success text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">Triggered</div>}
                  <button onClick={() => removeAlert(i)} className="h-8 w-8 rounded-full bg-white/5 grid place-items-center hover:bg-destructive/20 hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="text-[9px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                  <Shield className="h-3 w-3" /> Monitor Conditions ({alert.logic})
                </div>
                {alert.conditions.map((cond: any, ci: number) => (
                  <div key={ci} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5">
                    <div className="text-xs font-bold text-white capitalize">
                      {cond.type.replace("_", " ")}
                    </div>
                    <div className="text-sm font-mono font-black text-primary">
                      {cond.type === "trending" || cond.type === "volatility" ? "Detect" : cond.type.includes("price") ? fmtUsd(cond.value) : `${cond.value}%`}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest pt-2">
                <div className={cn("h-1.5 w-1.5 rounded-full", alert.triggered ? "bg-muted-foreground" : "bg-success animate-pulse")} />
                {alert.triggered ? "System Halted" : "Live Analyzing..."}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#02040a]/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass rounded-[40px] p-10 max-w-lg w-full shadow-2xl border border-white/10 scale-in-95 animate-in">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white">New <span className="text-gradient">Smart Alert</span></h3>
              <Zap className="h-6 w-6 text-primary animate-pulse" />
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground font-black ml-4 tracking-widest">Select Asset</label>
                <CoinSearchInput onSelect={(id) => setActiveCoinId(id)} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Logic & Conditions</label>
                  <button onClick={() => setLogic(l => l === "AND" ? "OR" : "AND")} className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
                    Type: {logic}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {conditions.map((cond, i) => (
                    <div key={i} className="flex gap-3 animate-in slide-in-from-right-4 duration-300">
                      <select 
                        value={cond.type} 
                        onChange={e => {
                          const newC = [...conditions];
                          newC[i].type = e.target.value;
                          setConditions(newC);
                        }}
                        className="flex-1 h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm outline-none focus:ring-1 ring-primary appearance-none"
                      >
                        <option value="price_above">Price Above</option>
                        <option value="price_below">Price Below</option>
                        <option value="volatility">High Volatility (&gt;10%)</option>
                        <option value="trending">Global Trending</option>
                        <option value="news_surge">News Surge (Articles Found)</option>
                        <option value="sentiment_positive">Sentiment: Positive</option>
                        <option value="sentiment_negative">Sentiment: Negative</option>
                      </select>
                      {!["volatility", "trending", "news_surge", "sentiment_positive", "sentiment_negative"].includes(cond.type) && (
                        <Input 
                          type="number" 
                          value={cond.value} 
                          onChange={e => {
                            const newC = [...conditions];
                            newC[i].value = e.target.value;
                            setConditions(newC);
                          }}
                          placeholder="Value" 
                          className="w-32 h-12 rounded-2xl bg-white/5 border-white/10" 
                        />
                      )}
                      {conditions.length > 1 && (
                        <button onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))} className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {conditions.length < 3 && (
                  <Button variant="ghost" onClick={addCondition} className="w-full h-10 border border-dashed border-white/10 rounded-2xl text-xs font-bold text-muted-foreground hover:text-white">
                    <Plus className="h-3 w-3 mr-2" /> Add Multi-Condition
                  </Button>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <Button onClick={() => setShowAdd(false)} variant="ghost" className="flex-1 h-14 rounded-2xl text-lg font-bold">Cancel</Button>
                <Button onClick={handleAdd} className="flex-1 h-14 rounded-2xl bg-gradient-primary shadow-glow-cyan text-lg font-black tracking-tight">Arm Alert</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Compare View (Full Comparison Engine) ---
export const CompareView = ({ onBack }: { onBack: () => void }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: topCoins, isLoading: isTopLoading } = useQuery({ 
    queryKey: ["top-coins"], 
    queryFn: () => fetchTopCoins(100),
    refetchInterval: 180_000
  });

  const handleAddCoin = (id: string) => {
    if (selectedIds.length >= 5) {
      toast.error("Maximum 5 coins for full comparison");
      return;
    }
    if (selectedIds.includes(id)) {
      toast.error("Coin already added");
      return;
    }
    setSelectedIds([...selectedIds, id]);
  };

  const removeCoin = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  const selectedCoins = topCoins?.filter(c => selectedIds.includes(c.id)) || [];

  return (
    <div className="container py-12 space-y-12 animate-in fade-in duration-700 relative">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-white group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to choices
        </Button>
        <div className="flex-1 max-w-md relative">
          <div className="text-[10px] uppercase text-muted-foreground font-black mb-2 tracking-widest ml-4">Add Asset to Compare</div>
          <CoinSearchInput onSelect={(id) => handleAddCoin(id)} />
        </div>
      </div>

      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-5xl font-black tracking-tighter text-white">Full <span className="text-gradient">Comparison</span></h2>
        <p className="text-muted-foreground text-lg">Detailed side-by-side analysis of performance, supply, and market metrics.</p>
      </div>

      {selectedIds.length === 0 ? (
        <div className="glass rounded-[40px] p-24 text-center border-dashed border-2 border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="h-20 w-20 rounded-3xl bg-white/5 grid place-items-center mx-auto mb-8">
            <ArrowRightLeft className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Assets Selected</h3>
          <p className="text-muted-foreground/60 max-w-xs mx-auto">Search for coins above to begin your deep-dive comparison matrix.</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Top Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {selectedCoins.map((coin) => (
              <div key={coin.id} className="neon-border float-shadow rounded-[32px] overflow-hidden">
                <div className="glass h-full p-8 space-y-8 relative">
                  <button 
                    onClick={() => removeCoin(coin.id)}
                    className="absolute top-6 right-6 h-9 w-9 rounded-full bg-white/5 grid place-items-center hover:bg-destructive/20 hover:text-destructive transition-all border border-white/5 hover:border-destructive/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img src={coin.image} alt="" className="h-16 w-16 rounded-full shadow-glow-cyan p-1 bg-white/5" />
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary grid place-items-center text-[10px] font-black border-2 border-[#02040a]">
                        {coin.market_cap_rank}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">{coin.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold uppercase tracking-widest text-[11px]">{coin.symbol}</span>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", coin.price_change_percentage_24h >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                          {coin.price_change_percentage_24h >= 0 ? "↑" : "↓"} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="text-[10px] uppercase text-muted-foreground font-black mb-1">Price</div>
                      <div className="text-2xl font-mono font-bold text-white tracking-tight">{fmtUsd(coin.current_price)}</div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="text-[10px] uppercase text-muted-foreground font-black mb-1">Market Cap</div>
                      <div className="text-xl font-bold text-white">${fmtCompact(coin.market_cap)}</div>
                    </div>
                  </div>

                  <div className="h-28 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={coin.sparkline_in_7d?.price.map((p, i) => ({ t: i, v: p })) || []}>
                        <defs>
                          <linearGradient id={`color-${coin.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={coin.price_change_percentage_24h >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={coin.price_change_percentage_24h >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="v" 
                          stroke={coin.price_change_percentage_24h >= 0 ? "#10b981" : "#ef4444"} 
                          fill={`url(#color-${coin.id})`}
                          strokeWidth={3} 
                          animationDuration={1500}
                        />
                        <YAxis hide domain={["auto", "auto"]} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Matrix Table */}
          <div className="glass rounded-[40px] overflow-hidden border border-white/5 neon-border">
            <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" /> Detailed Matrix
              </h3>
              <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                Side-by-side technical comparison
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="p-6 text-[11px] uppercase font-black text-muted-foreground tracking-widest">Metric</th>
                    {selectedCoins.map(c => (
                      <th key={c.id} className="p-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <img src={c.image} className="h-8 w-8 rounded-full" />
                          <div className="text-xs font-black text-white">{c.symbol.toUpperCase()}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { label: "Market Rank", key: "market_cap_rank", fmt: (v: any) => `#${v}` },
                    { label: "Price (USD)", key: "current_price", fmt: (v: any) => fmtUsd(v) },
                    { label: "24h Volume", key: "total_volume", fmt: (v: any) => `$${fmtCompact(v)}` },
                    { label: "ATH (All-Time High)", key: "ath", fmt: (v: any) => fmtUsd(v) },
                    { label: "ATH Change %", key: "ath_change_percentage", fmt: (v: any) => fmtPct(v) },
                    { label: "24h High", key: "high_24h", fmt: (v: any) => fmtUsd(v) },
                    { label: "24h Low", key: "low_24h", fmt: (v: any) => fmtUsd(v) },
                    { label: "Circulating Supply", key: "circulating_supply", fmt: (v: any) => fmtCompact(v) },
                    { label: "Total Supply", key: "total_supply", fmt: (v: any) => v ? fmtCompact(v) : "∞" },
                    { label: "Max Supply", key: "max_supply", fmt: (v: any) => v ? fmtCompact(v) : "∞" },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="p-6 text-sm font-bold text-muted-foreground group-hover:text-white transition-colors">{row.label}</td>
                      {selectedCoins.map(c => (
                        <td key={c.id} className="p-6 text-center font-mono text-sm text-white font-medium">
                          {row.fmt((c as any)[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- News View (Dynamic Feed) ---
export const NewsView = ({ onBack }: { onBack: () => void }) => {
  const { data: trending, isLoading: tLoading } = useQuery({ queryKey: ["trending"], queryFn: fetchTrending, refetchInterval: 180_000 });
  const { data: fng, isLoading: fLoading } = useQuery({ queryKey: ["fear-greed"], queryFn: fetchFearGreed, refetchInterval: 180_000 });

  const newsItems = [];
  if (fng) {
    newsItems.push({
      title: `Global Sentiment: ${fng.value}/100 — Market is in ${fng.value_classification}`,
      source: "Fear & Greed Index",
      time: "Today",
      url: "https://alternative.me/crypto/fear-and-greed-index/",
    });
  }
  if (trending?.coins) {
    trending.coins.slice(0, 12).forEach((c: any) => {
      newsItems.push({
        title: `${c.item?.name} (${c.item?.symbol}) is gaining significant attention · Rank #${c.item?.market_cap_rank || "N/A"}`,
        source: "Trending Search",
        time: "Live",
        url: `https://www.coingecko.com/en/coins/${c.item?.id}`,
      });
    });
  }

  const isLoading = tLoading || fLoading;

  return (
    <div className="container py-12 space-y-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse shadow-glow-cyan" />
          Live Updating every 60s
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-black tracking-tighter text-white">Global Intelligence <span className="text-gradient">Feed</span></h2>
          <p className="text-muted-foreground text-lg">Direct pipeline to trending assets and market sentiment anomalies.</p>
        </div>

        <div className="space-y-4">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-[32px] p-8 animate-pulse h-28 border border-white/5" />) :
            newsItems.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noreferrer" className="block glass glass-hover rounded-[32px] p-8 group relative overflow-hidden neon-border">
                <div className="text-xl font-bold group-hover:text-primary transition-colors pr-12 leading-relaxed">
                  {item.title}
                </div>
                <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] font-black">
                  <span className="text-primary">{item.source}</span>
                  <span className="text-muted-foreground flex items-center gap-2">
                    {item.time === "Live" && <span className="h-1 w-1 rounded-full bg-success animate-pulse" />}
                    {item.time}
                  </span>
                </div>
                <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </a>
            ))
          }
        </div>
      </div>
    </div>
  );
};
