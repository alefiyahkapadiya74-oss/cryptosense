import { useQuery } from "@tanstack/react-query";
import { fetchTopCoins } from "@/lib/coingecko";
import { fmtUsd, fmtCompact, fmtPct } from "@/lib/format";
import { Sparkline } from "./Sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";

export const CoinTable = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["markets"],
    queryFn: () => fetchTopCoins(20),
    refetchInterval: 30_000,
  });
  const navigate = useNavigate();
  const { toggleWatchlist, hasCoin } = useWatchlist();

  return (
    <section id="markets" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass rounded-[40px] overflow-hidden border border-white/5 neon-border bg-gradient-to-b from-white/5 to-transparent">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest w-12">Fav</th>
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest w-12">#</th>
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest">Asset</th>
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right">Price</th>
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right hidden sm:table-cell">24h Change</th>
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right hidden md:table-cell">7d Trend</th>
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest text-right hidden lg:table-cell">Market Cap</th>
                <th className="p-6 text-[10px] uppercase font-black text-muted-foreground tracking-widest w-40 hidden md:table-cell">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="p-8"><div className="h-12 bg-white/5 rounded-2xl w-full" /></td>
                  </tr>
                ))
              ) : (
                data?.map((c) => {
                  const ch24 = c.price_change_percentage_24h ?? 0;
                  const ch7 = c.price_change_percentage_7d_in_currency ?? 0;
                  const fav = hasCoin(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/coin/${c.id}`)}
                      className="hover:bg-white/5 transition-all cursor-pointer group float-shadow"
                    >
                      <td className="p-6" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleWatchlist({ id: c.id, symbol: c.symbol, name: c.name })}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Star className={cn("h-4 w-4", fav && "fill-primary text-primary shadow-glow-cyan")} />
                        </button>
                      </td>
                      <td className="p-6 text-xs font-black text-muted-foreground font-mono">
                        {c.market_cap_rank}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img src={c.image} alt="" className="h-10 w-10 rounded-full bg-white/5 p-1 shadow-glow-cyan" loading="lazy" />
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-primary transition-colors">{c.name}</div>
                            <div className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              {c.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-right font-mono font-bold text-white">
                        {fmtUsd(c.current_price)}
                      </td>
                      <td className={cn(
                        "p-6 text-right font-mono text-sm font-black hidden sm:table-cell",
                        ch24 >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {ch24 >= 0 ? "↑" : "↓"} {Math.abs(ch24).toFixed(2)}%
                      </td>
                      <td className={cn(
                        "p-6 text-right font-mono text-sm font-black hidden md:table-cell",
                        ch7 >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {fmtPct(ch7)}
                      </td>
                      <td className="p-6 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                        ${fmtCompact(c.market_cap)}
                      </td>
                      <td className="p-6 w-40 hidden md:table-cell">
                        <div className="flex items-center gap-4">
                          {c.sparkline_in_7d?.price && (
                            <div className="flex-1 h-10 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Sparkline data={c.sparkline_in_7d.price} positive={ch7 >= 0} />
                            </div>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
