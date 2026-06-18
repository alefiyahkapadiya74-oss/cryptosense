import React, { useState, useEffect, useRef } from "react";
import {
  Search, ArrowLeft, Send, TrendingUp, TrendingDown, FileText, BarChart,
  Twitter, MessageSquare, Globe, AlertTriangle, Shield, ThumbsUp,
  RefreshCw, ChevronDown, Loader2, ExternalLink, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFullAnalysis } from "@/hooks/useFullAnalysis";
import { CoinSearchInput } from "@/components/CoinSearchInput";
import { fmtUsd, fmtPct, fmtCompact } from "@/lib/format";
import { fetchCoinChart } from "@/lib/coingecko";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { analyzeSentiment } from "@/lib/sentiment";

/* ── Mini Chart ── */
const MiniChart = ({ data, color }: { data: { t: number; v: number }[]; color: string }) => (
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

/* ── Sentiment Gauge SVG ── */
const SentimentGauge = ({ score, label }: { score: number; label: string }) => {
  const pct = Math.round((score + 1) * 50); // -1..+1 → 0..100
  const displayScore = Math.round(score * 100);
  const color = score > 0.15 ? "#10b981" : score < -0.15 ? "#ef4444" : "#eab308";
  return (
    <div className="flex flex-col items-center">
      <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
        <circle cx="64" cy="64" r="58" stroke={color} strokeWidth="8" fill="transparent"
          strokeDasharray={364} strokeDashoffset={364 - (364 * Math.max(5, pct)) / 100}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <span className="absolute text-4xl font-bold text-white" style={{ marginTop: 48 }}>
        {displayScore > 0 ? "+" : ""}{displayScore}
      </span>
      <div className="mt-3 text-sm font-bold uppercase tracking-widest" style={{ color }}>{label}</div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   MAIN ANALYSIS VIEW
   ════════════════════════════════════════════════ */
export const AnalysisView = ({ onBack, initialCoinId }: { onBack: () => void, initialCoinId?: string }) => {
  const [activeCoinId, setActiveCoinId] = useState<string | null>(initialCoinId || null);
  const { data, isLoading, error, refetch, isFetching } = useFullAnalysis(activeCoinId);
  const [chartDays, setChartDays] = useState(7);
  const [lastSync, setLastSync] = useState("");

  useEffect(() => {
    if (data) setLastSync(new Date().toLocaleTimeString());
  }, [data]);

  const { data: chartData } = useQuery({
    queryKey: ["analysis-chart", activeCoinId, chartDays],
    queryFn: () => fetchCoinChart(activeCoinId!, chartDays),
    enabled: !!activeCoinId,
  });

  /* ── Search Screen ── */
  if (!activeCoinId) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-500">
        <Button variant="ghost" onClick={onBack} className="mb-8 gap-2 text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to choices
        </Button>
        <div className="text-center space-y-8 py-20">
          <h2 className="text-4xl font-bold tracking-tight text-white">Enter a coin to analyze</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Search any cryptocurrency by name or symbol. Real-time data from CoinGecko, Reddit & more.
          </p>
          <CoinSearchInput onSelect={(id) => setActiveCoinId(id)} />
        </div>
      </div>
    );
  }

  /* ── Loading State ── */
  if (isLoading) {
    return (
      <div className="container py-20 text-center animate-in fade-in duration-500">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
        <h3 className="text-xl font-bold text-white mb-2">Analyzing Markets…</h3>
        <p className="text-muted-foreground text-sm">Fetching data from CoinGecko, Reddit & news sources</p>
      </div>
    );
  }

  /* ── Error State ── */
  if (error || !data) {
    return (
      <div className="container py-20 text-center animate-in fade-in duration-500">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-6" />
        <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
        <p className="text-muted-foreground text-sm mb-6">{(error as Error)?.message || "Unable to fetch data"}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => refetch()} className="gap-2"><RefreshCw className="h-4 w-4" /> Retry</Button>
          <Button variant="ghost" onClick={() => setActiveCoinId(null)}>Try another coin</Button>
        </div>
      </div>
    );
  }

  const { coin, sentiment, recommendation, risk, reddit, twitter, news } = data;
  const md = coin.market_data;
  const chartColor = md.price_change_percentage_24h >= 0 ? "#10b981" : "#ef4444";
  const volCapRatio = ((md.total_volume.usd / Math.max(md.market_cap.usd, 1)) * 100);

  const recColor = recommendation.action.includes("Buy") ? "text-success" :
    recommendation.action.includes("Sell") ? "text-destructive" : "text-yellow-500";
  const riskColor = risk.level === "Low" ? "text-success" :
    risk.level === "Medium" ? "text-yellow-500" :
    risk.level === "High" ? "text-orange-500" : "text-destructive";

  return (
    <div className="container py-8 space-y-8 animate-in fade-in duration-700" id="analysis-results">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" onClick={() => setActiveCoinId(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> New Search
        </Button>
        <div className="flex gap-2 items-center">
          <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right hidden sm:block mr-2">
            Last Sync<br/>
            <span className="text-success">{lastSync || "..."}</span>
          </div>
          <Button onClick={() => refetch()} variant="ghost" disabled={isFetching} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Refresh
          </Button>
          <Button onClick={() => window.print()} className="gap-2 rounded-full bg-gradient-primary shadow-glow-cyan">
            <FileText className="h-4 w-4" /> Generate Report
          </Button>
        </div>
      </div>

      {/* ═══ A. Coin Overview ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="glass rounded-3xl p-6 md:col-span-2 flex items-center gap-6 bg-gradient-to-br from-primary/10 to-transparent">
          <img src={coin.image.large} alt="" className="h-16 w-16 rounded-full shadow-glow-cyan" />
          <div>
            <h2 className="text-3xl font-bold text-white">{coin.name}</h2>
            <div className="text-xs uppercase tracking-widest text-primary font-bold">
              {coin.symbol.toUpperCase()} · Rank #{md.market_cap_rank}
            </div>
          </div>
        </div>
        {[
          { label: "Current Price", val: fmtUsd(md.current_price.usd), big: true },
          { label: "24h Change", val: fmtPct(md.price_change_percentage_24h), color: md.price_change_percentage_24h >= 0 ? "text-success" : "text-destructive" },
          { label: "Market Cap", val: `$${fmtCompact(md.market_cap.usd)}` },
          { label: "24h Volume", val: `$${fmtCompact(md.total_volume.usd)}` },
        ].map((s, i) => (
          <div key={i} className="glass rounded-3xl p-6">
            <div className="text-[10px] uppercase text-muted-foreground mb-1 font-bold">{s.label}</div>
            <div className={cn(s.big ? "text-2xl" : "text-xl", "font-mono font-bold", s.color || "text-white")}>{s.val}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ═══ Left Column ═══ */}
        <div className="lg:col-span-2 space-y-8">

          {/* ═══ B. Price Chart ═══ */}
          <div className="glass rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" /> Price Chart
              </h3>
              <div className="flex gap-1 glass rounded-xl p-1">
                {[{ l: "24H", d: 1 }, { l: "7D", d: 7 }, { l: "30D", d: 30 }, { l: "90D", d: 90 }, { l: "1Y", d: 365 }].map(r => (
                  <button key={r.l} onClick={() => setChartDays(r.d)}
                    className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition",
                      chartDays === r.d ? "bg-gradient-primary text-white shadow-glow-cyan" : "text-muted-foreground hover:text-white")}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>
            {(chartData || data.chart) ? (
              <MiniChart data={chartData || data.chart} color={chartColor} />
            ) : (
              <div className="h-[250px] animate-pulse bg-white/5 rounded-2xl" />
            )}

            {/* Heatmap */}
            <div className="pt-6 border-t border-white/5">
              <h4 className="text-sm font-bold mb-4 uppercase tracking-widest text-muted-foreground">Market Momentum</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "1H", val: md.price_change_percentage_1h_in_currency?.usd ?? 0 },
                  { label: "24H", val: md.price_change_percentage_24h },
                  { label: "7D", val: md.price_change_percentage_7d },
                  { label: "Vol/Cap", val: volCapRatio },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">{item.label}</div>
                    <div className={cn("text-lg font-mono font-bold", item.val >= 0 ? "text-success" : "text-destructive")}>
                      {item.val > 0 ? "+" : ""}{item.val.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ C. News & Social Intelligence ═══ */}
          <div className="glass rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Live Intelligence Feed
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Reddit Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs border-b border-white/5 pb-2 text-muted-foreground uppercase tracking-widest">
                  <MessageSquare className="h-3 w-3 text-orange-500" /> Reddit
                  <span className="ml-auto text-[10px] text-orange-400">{reddit.length} posts</span>
                </div>
                {reddit.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No recent Reddit posts found</p>
                ) : reddit.slice(0, 4).map((item, i) => {
                  const s = analyzeSentiment(item.rawText);
                  return (
                    <a key={i} href={item.url} target="_blank" rel="noreferrer" className="block text-[11px] space-y-1 group">
                      <div className="font-semibold line-clamp-2 group-hover:text-primary transition-colors cursor-pointer text-white">{item.snippet}</div>
                      <div className="flex justify-between text-[9px] text-muted-foreground uppercase">
                        <span>{item.time} · {item.engagement}</span>
                        <span className={cn("font-bold", s.label === "Positive" ? "text-success" : s.label === "Negative" ? "text-destructive" : "text-yellow-500")}>{s.label}</span>
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Twitter/Social Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs border-b border-white/5 pb-2 text-muted-foreground uppercase tracking-widest">
                  <Twitter className="h-3 w-3 text-blue-400" /> Social
                  <span className="ml-auto text-[10px] text-blue-400">{twitter.length} items</span>
                </div>
                {twitter.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No social data available</p>
                ) : twitter.slice(0, 4).map((item, i) => {
                  const s = analyzeSentiment(item.rawText || item.snippet);
                  return (
                    <a key={i} href={item.url} target="_blank" rel="noreferrer" className="block text-[11px] space-y-1 group">
                      <div className="font-semibold line-clamp-2 group-hover:text-primary transition-colors cursor-pointer text-white">{item.snippet}</div>
                      <div className="flex justify-between text-[9px] text-muted-foreground uppercase">
                        <span>{item.time} · {item.engagement}</span>
                        <span className={cn("font-bold", s.label === "Positive" ? "text-success" : s.label === "Negative" ? "text-destructive" : "text-yellow-500")}>{s.label}</span>
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* News Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs border-b border-white/5 pb-2 text-muted-foreground uppercase tracking-widest">
                  <Globe className="h-3 w-3 text-green-400" /> News
                  <span className="ml-auto text-[10px] text-green-400">{news.length} articles</span>
                </div>
                {news.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No recent news found</p>
                ) : news.slice(0, 4).map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noreferrer" className="block text-[11px] space-y-1 group">
                    <div className="font-semibold line-clamp-2 group-hover:text-primary transition-colors cursor-pointer text-white">{item.title}</div>
                    <div className="flex justify-between text-[9px] text-muted-foreground uppercase">
                      <span>{item.source} · {item.time}</span>
                      <span className={cn("font-bold", item.sentiment === "Positive" ? "text-success" : item.sentiment === "Negative" ? "text-destructive" : "text-yellow-500")}>{item.sentiment}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Right Column ═══ */}
        <div className="space-y-8">
          {/* Sentiment Score */}
          <div className="glass rounded-3xl p-8 text-center bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-6">Sentiment Score</div>
            <div className="relative inline-flex items-center justify-center">
              <SentimentGauge score={sentiment.overall.score} label={sentiment.overall.label} />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { icon: MessageSquare, label: "Reddit", score: sentiment.reddit.score, color: "text-orange-400" },
                { icon: Twitter, label: "Social", score: sentiment.twitter.score, color: "text-blue-400" },
                { icon: Globe, label: "News", score: sentiment.news.score, color: "text-green-400" },
              ].map((s, i) => (
                <div key={i} className="glass rounded-xl p-3 text-center">
                  <s.icon className={cn("h-3 w-3 mx-auto mb-1", s.color)} />
                  <div className="text-[9px] uppercase text-muted-foreground">{s.label}</div>
                  <div className={cn("text-xs font-bold", s.score > 0.15 ? "text-success" : s.score < -0.15 ? "text-destructive" : "text-yellow-500")}>
                    {s.score > 0 ? "+" : ""}{s.score.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation & AI Prediction */}
          <div className="glass rounded-3xl p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", 
                recommendation.action.includes("Buy") ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
                AI Prediction
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Recommendation</div>
              <div className={cn("text-3xl font-black", recColor)}>{recommendation.action}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
              <div className="text-center">
                <div className="text-[9px] uppercase text-muted-foreground mb-1">Short-term Trend</div>
                <div className={cn("text-lg font-bold flex items-center justify-center gap-1", recommendation.action.includes("Buy") ? "text-success" : "text-destructive")}>
                  {recommendation.action.includes("Buy") ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {recommendation.action.includes("Buy") ? "UP" : "DOWN"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[9px] uppercase text-muted-foreground mb-1">Confidence</div>
                <div className="text-lg font-bold text-white">{recommendation.confidence}%</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{recommendation.rationale}</p>
            <Progress value={recommendation.confidence} className="h-2 bg-white/5" />
          </div>

          {/* Sentiment Timeline */}
          <div className="glass rounded-3xl p-8 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Activity className="h-3 w-3" /> Sentiment Timeline
            </h3>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { t: "3D ago", v: 45 },
                  { t: "2D ago", v: 52 },
                  { t: "1D ago", v: 48 },
                  { t: "Now", v: (sentiment.overall.score + 1) * 50 },
                ]}>
                  <Area type="monotone" dataKey="v" stroke="#06b6d4" fill="rgba(6, 182, 212, 0.1)" strokeWidth={2} />
                  <XAxis hide dataKey="t" />
                  <YAxis hide domain={[0, 100]} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold">
              <span>Bearish Bias</span>
              <span>Neutral</span>
              <span>Bullish Bias</span>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="glass rounded-3xl p-8 border-l-4 border-current" style={{ borderColor: risk.level === "Low" ? "#10b981" : risk.level === "Medium" ? "#eab308" : risk.level === "High" ? "#f97316" : "#ef4444" }}>
            <div className="flex items-center gap-2 font-bold mb-3 uppercase text-xs tracking-widest">
              <Shield className={cn("h-4 w-4", riskColor)} />
              <span className={riskColor}>Risk: {risk.level} ({risk.score}/100)</span>
            </div>
            <ul className="space-y-2">
              {risk.factors.map((f, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                  <span className={cn("mt-0.5 shrink-0", riskColor)}>▸</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Fear & Greed */}
          {data.fearGreedIndex !== undefined && (
            <div className="glass rounded-3xl p-6 text-center">
              <div className="text-[10px] uppercase text-muted-foreground mb-2">Fear & Greed Index</div>
              <div className="text-4xl font-bold text-white">{data.fearGreedIndex}</div>
              <div className={cn("text-sm font-bold mt-1", data.fearGreedIndex > 60 ? "text-success" : data.fearGreedIndex < 40 ? "text-destructive" : "text-yellow-500")}>
                {data.fearGreedLabel}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Data from CoinGecko, Reddit & crypto news. Sentiment via keyword NLP. Not financial advice.
      </p>
    </div>
  );
};

export default AnalysisView;
