import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchCoinChart, fetchTopCoins } from "@/lib/coingecko";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { fmtUsd, fmtPct, fmtCompact } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "24H", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

export const PriceChart = () => {
  const [coinId, setCoinId] = useState("bitcoin");
  const [days, setDays] = useState(7);
  const [lastSync, setLastSync] = useState("");

  useEffect(() => {
    setLastSync(new Date().toLocaleTimeString());
  }, []);

  const { data: top } = useQuery({ queryKey: ["top-mini"], queryFn: () => fetchTopCoins(8), refetchInterval: 180_000 });
  const { data: chart, isLoading } = useQuery({
    queryKey: ["chart", coinId, days],
    queryFn: () => fetchCoinChart(coinId, days),
    refetchInterval: 180_000,
  });

  const selected = top?.find((c) => c.id === coinId);
  const first = chart?.[0]?.v ?? 0;
  const last = chart?.[chart.length - 1]?.v ?? 0;
  const change = first ? ((last - first) / first) * 100 : 0;
  const positive = change >= 0;
  const stroke = positive ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <section id="analysis" className="glass rounded-2xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {selected && (
            <img src={selected.image} alt={selected.name} className="h-12 w-12 rounded-full" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-2xl font-bold">
                {selected?.name ?? "Loading…"}
              </h3>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {selected?.symbol}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="font-mono text-3xl font-semibold">
                {selected ? fmtUsd(selected.current_price) : "—"}
              </span>
              <span className={cn("font-mono text-sm", positive ? "text-success" : "text-destructive")}>
                {fmtPct(change)} <span className="text-muted-foreground">· {RANGES.find(r => r.days === days)?.label}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6 pr-4 border-r border-white/5">
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Market Cap</div>
            <div className="text-sm font-mono font-bold text-white">
              {selected ? `$${fmtCompact(selected.market_cap)}` : "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Volume (24h)</div>
            <div className="text-sm font-mono font-bold text-white">
              {selected ? `$${fmtCompact(selected.total_volume)}` : "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">24h High/Low</div>
            <div className="text-sm font-mono font-bold text-white">
              {selected?.high_24h ? `${fmtUsd(selected.high_24h)} / ${fmtUsd(selected.low_24h)}` : "— / —"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right hidden sm:block">
            Last Sync<br/>
            <span className="text-success">{lastSync || "..."}</span>
          </div>
          <div className="flex gap-1 glass rounded-xl p-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setDays(r.days)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition",
                  days === r.days
                    ? "bg-gradient-primary text-primary-foreground shadow-glow-cyan"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="hero" size="sm" asChild>
            <Link to={`/coin/${coinId}`} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Full analysis
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {top?.map((c) => (
          <button
            key={c.id}
            onClick={() => setCoinId(c.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              coinId === c.id
                ? "border-primary/50 bg-primary/10 text-primary shadow-glow-cyan"
                : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <img src={c.image} alt="" className="h-4 w-4 rounded-full" />
            {c.symbol.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="h-[340px]">
        {isLoading || !chart ? (
          <Skeleton className="h-full w-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(2)}`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
                formatter={(v: number) => [fmtUsd(v), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#area-gradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};
