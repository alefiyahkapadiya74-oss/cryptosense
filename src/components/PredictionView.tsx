import React, { useState, useMemo } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Shield, Target, Zap, Brain, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { fetchTopCoins, fetchCoinChart } from "@/lib/coingecko";
import { fmtUsd, fmtPct, fmtCompact } from "@/lib/format";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { CoinSearchInput } from "./CoinSearchInput";
import { generatePrediction, PredictionResult } from "@/lib/prediction";

const HORIZONS = [
  { label: "1H", key: "ultraShortTerm" as const },
];

const signalColor = (s: string) => {
  if (s.includes("Strong Buy")) return "text-emerald-400";
  if (s.includes("Buy")) return "text-green-400";
  if (s.includes("Strong Sell")) return "text-red-400";
  if (s.includes("Sell")) return "text-orange-400";
  return "text-yellow-400";
};

const signalBg = (s: string) => {
  if (s.includes("Strong Buy")) return "bg-emerald-500/15 border-emerald-500/30";
  if (s.includes("Buy")) return "bg-green-500/15 border-green-500/30";
  if (s.includes("Strong Sell")) return "bg-red-500/15 border-red-500/30";
  if (s.includes("Sell")) return "bg-orange-500/15 border-orange-500/30";
  return "bg-yellow-500/15 border-yellow-500/30";
};

const GaugeRing = ({ value, label, color, size = 100 }: { value: number; label: string; color: string; size?: number }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xl font-black text-white">{Math.round(value)}</span>
      </div>
      <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
};

export const PredictionView = ({ onBack }: { onBack: () => void }) => {
  const [coinId, setCoinId] = useState("bitcoin");
  const [horizon, setHorizon] = useState<"ultraShortTerm" | "shortTerm" | "midTerm" | "longTerm">("ultraShortTerm");

  const { data: topCoins } = useQuery({ queryKey: ["top-coins"], queryFn: () => fetchTopCoins(100), refetchInterval: 180_000 });
  const { data: chart, isLoading: chartLoading, error: chartError } = useQuery({
    queryKey: ["chart-pred", coinId], queryFn: () => fetchCoinChart(coinId, 90), refetchInterval: 300_000,
  });

  const coin = topCoins?.find(c => c.id === coinId);

  const prediction: PredictionResult | null = useMemo(() => {
    if (!chart || chart.length < 10) return null;
    return generatePrediction(coinId, chart, coin?.current_price);
  }, [chart, coinId, coin?.current_price]);

  const predictionData = prediction ? prediction[horizon] : [];

  const currentPrediction = useMemo(() => {
    if (!predictionData.length || !prediction) return { price: 0, change: 0 };
    const target = predictionData[predictionData.length - 1].v;
    const priceAtStart = coin?.current_price ?? prediction.currentPrice;
    return {
      price: target,
      change: ((target - priceAtStart) / priceAtStart) * 100
    };
  }, [predictionData, coin?.current_price, prediction]);

  const isPositive = currentPrediction.change >= 0;

  // Combine historical + predicted for the chart
  const combinedChart = useMemo(() => {
    if (!chart || !predictionData.length) return [];
    const histSlice = chart.slice(-20).map(d => ({ t: d.t, v: d.v, type: "historical" as const }));
    const predSlice = predictionData.map(d => ({ t: d.t, v: d.v, upper: d.upper, lower: d.lower, type: "predicted" as const }));
    // bridge
    if (histSlice.length > 0) {
      predSlice.unshift({ t: histSlice[histSlice.length-1].t, v: histSlice[histSlice.length-1].v, upper: histSlice[histSlice.length-1].v, lower: histSlice[histSlice.length-1].v, type: "predicted" });
    }
    return [...histSlice, ...predSlice];
  }, [chart, predictionData]);

  const handleSelect = (id: string) => setCoinId(id);

  return (
    <div className="container py-12 space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-white group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </Button>
        <div className="flex-1 max-w-md">
          <div className="text-[10px] uppercase text-muted-foreground font-black mb-2 tracking-widest ml-4">Select Asset</div>
          <CoinSearchInput onSelect={handleSelect} />
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-5xl font-black tracking-tighter text-white">
          AI <span className="text-gradient">Prediction</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Technical analysis & price forecasting powered by momentum, RSI, and volatility modeling.
        </p>
      </div>

      {/* Quick coin pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {topCoins?.slice(0, 10).map(c => (
          <button key={c.id} onClick={() => setCoinId(c.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              coinId === c.id ? "border-primary/50 bg-primary/10 text-primary shadow-glow-cyan" : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}>
            <img src={c.image} alt="" className="h-4 w-4 rounded-full" />
            {c.symbol.toUpperCase()}
          </button>
        ))}
      </div>

      {chartError ? (
        <div className="container py-32 text-center animate-in fade-in duration-500 max-w-md mx-auto">
          <div className="h-20 w-20 rounded-3xl bg-destructive/10 grid place-items-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Intelligence Sync Failed</h3>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Market analysis is temporarily unavailable. This is usually due to CoinGecko's public API rate limits (429).
            <br/><br/>
            <strong>Fix:</strong> Please wait 60 seconds and refresh, or check the Markets tab for cached data.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="gap-2 bg-gradient-primary shadow-glow-cyan h-12 px-8 rounded-full">
              <RefreshCw className="h-4 w-4" /> Retry Analysis
            </Button>
            <Button variant="ghost" onClick={onBack} className="h-12 px-8 rounded-full">Back</Button>
          </div>
        </div>
      ) : chartLoading || !prediction ? (
        <div className="glass rounded-[40px] p-24 text-center animate-pulse">
          <Brain className="h-16 w-16 mx-auto mb-6 text-primary/40 animate-pulse" />
          <h3 className="text-xl font-bold text-white">Analyzing {coinId}...</h3>
          <p className="text-sm text-muted-foreground mt-2">Running technical models on 90 days of data</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Signal Banner */}
          <div className={cn("rounded-[32px] p-8 border flex flex-col md:flex-row items-center gap-8 relative overflow-hidden", signalBg(prediction.signal))}>
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-[80px]" style={{ background: isPositive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }} />
            <div className="flex items-center gap-6 relative z-10">
              {coin?.image && <img src={coin.image} alt="" className="h-16 w-16 rounded-full shadow-glow-cyan p-1 bg-white/5" />}
              <div>
                <div className="text-3xl font-black text-white">{coin?.name ?? coinId}</div>
                <div className="text-sm text-muted-foreground font-bold uppercase tracking-widest">{coin?.symbol}</div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              <div className="text-center">
                <div className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Signal</div>
                <div className={cn("text-2xl font-black", signalColor(prediction.signal))}>{prediction.signal}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Current</div>
                <div className="text-xl font-mono font-bold text-white">{fmtUsd(prediction.currentPrice)}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">{HORIZONS.find(h => h.key === horizon)?.label} Target</div>
                <div className={cn("text-xl font-mono font-bold", isPositive ? "text-success" : "text-destructive")}>{fmtUsd(currentPrediction.price)}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">Predicted Δ</div>
                <div className={cn("text-xl font-mono font-bold", isPositive ? "text-success" : "text-destructive")}>
                  {currentPrediction.change >= 0 ? "+" : ""}{currentPrediction.change.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart - 2 cols */}
            <div className="lg:col-span-2 glass rounded-[32px] overflow-hidden neon-border">
              <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-white">Price Forecast</h3>
                </div>
                <div className="flex gap-1 glass rounded-xl p-1">
                  {HORIZONS.map(h => (
                    <button key={h.key} onClick={() => setHorizon(h.key)}
                      className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition",
                        horizon === h.key ? "bg-gradient-primary text-primary-foreground shadow-glow-cyan" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={combinedChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pred-hist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(187,100%,55%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(187,100%,55%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="pred-upper" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="t" 
                        tickFormatter={t => {
                          const date = new Date(t);
                          if (horizon === "ultraShortTerm") return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                        }} 
                        stroke="hsl(220,15%,45%)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis domain={["auto","auto"]} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+"k" : v.toFixed(2)}`} stroke="hsl(220,15%,45%)" fontSize={10} tickLine={false} axisLine={false} width={60} />
                      <Tooltip contentStyle={{ background: "hsl(230,30%,8%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                        labelFormatter={t => new Date(Number(t)).toLocaleString()}
                        formatter={(val: number, name: string) => [fmtUsd(val), name === "v" ? "Price" : name === "upper" ? "Upper Band" : "Lower Band"]} />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="none" />
                      <Area type="monotone" dataKey="upper" stroke={isPositive ? "#10b98144" : "#ef444444"} fill="url(#pred-upper)" strokeWidth={1} strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="v" stroke={isPositive ? "#10b981" : "#ef4444"} fill="url(#pred-hist)" strokeWidth={2.5} dot={false} />
                      <ReferenceLine y={prediction.support} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: "Support", fill: "#f59e0b", fontSize: 9, position: "insideTopLeft" }} />
                      <ReferenceLine y={prediction.resistance} stroke="#8b5cf6" strokeDasharray="6 3" label={{ value: "Resistance", fill: "#8b5cf6", fontSize: 9, position: "insideBottomLeft" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-6 mt-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-6 rounded-full" style={{ background: isPositive ? "#10b981" : "#ef4444" }} /> Predicted</span>
                  <span className="flex items-center gap-1"><span className="h-px w-6 border-t-2 border-dashed border-yellow-500" /> Support</span>
                  <span className="flex items-center gap-1"><span className="h-px w-6 border-t-2 border-dashed border-violet-500" /> Resistance</span>
                </div>
              </div>
            </div>

            {/* Indicators Panel */}
            <div className="space-y-6">
              {/* Gauges */}
              <div className="glass rounded-[32px] p-6 space-y-6">
                <div className="flex items-center gap-2 text-sm font-bold text-white"><Activity className="h-4 w-4 text-primary" /> Technical Indicators</div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "RSI", value: prediction.rsi, color: prediction.rsi > 70 ? "#ef4444" : prediction.rsi < 30 ? "#10b981" : "#06b6d4" },
                    { label: "Confidence", value: prediction.confidence, color: "#8b5cf6" },
                    { label: "Momentum", value: Math.abs(prediction.momentum), color: prediction.momentum >= 0 ? "#10b981" : "#ef4444" },
                  ].map(g => (
                    <div key={g.label} className="relative flex flex-col items-center">
                      <GaugeRing value={g.value} label={g.label} color={g.color} size={90} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Levels */}
              <div className="glass rounded-[32px] p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white"><Shield className="h-4 w-4 text-primary" /> Key Levels</div>
                {[
                  { label: "Support", value: prediction.support, color: "text-yellow-400" },
                  { label: "Resistance", value: prediction.resistance, color: "text-violet-400" },
                  { label: "Volatility", value: `${prediction.volatility.toFixed(1)}%`, color: "text-cyan-400", raw: true },
                ].map(lv => (
                  <div key={lv.label} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-muted-foreground">{lv.label}</span>
                    <span className={cn("text-sm font-mono font-bold", lv.color)}>{lv.raw ? lv.value : fmtUsd(lv.value as number)}</span>
                  </div>
                ))}
              </div>

              {/* Signal Strength Meter */}
              <div className="glass rounded-[32px] p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white"><Zap className="h-4 w-4 text-primary" /> Signal Strength</div>
                <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.abs(prediction.signalScore) + 50}%`,
                      background: prediction.signalScore >= 0
                        ? "linear-gradient(90deg, #06b6d4, #10b981)"
                        : "linear-gradient(90deg, #ef4444, #f59e0b)",
                    }} />
                </div>
                <div className="flex justify-between text-[9px] uppercase font-black tracking-widest text-muted-foreground">
                  <span>Strong Sell</span><span>Neutral</span><span>Strong Buy</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="glass rounded-[32px] p-8 relative overflow-hidden neon-border">
            <div className="absolute -top-10 -left-10 h-40 w-40 bg-primary/10 blur-[60px] rounded-full" />
            <div className="relative z-10 flex items-start gap-6">
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center shrink-0 shadow-glow-cyan">
                <Brain className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white">AI Analysis Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{prediction.summary}</p>
                <div className="flex items-center gap-2 pt-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  <span className="text-[10px] text-yellow-500/80 font-bold">Predictions are based on technical analysis and should not be considered financial advice.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
