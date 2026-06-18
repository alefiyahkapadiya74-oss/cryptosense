import { useQuery } from "@tanstack/react-query";
import { fetchGlobal } from "@/lib/coingecko";
import { fmtCompact, fmtPct } from "@/lib/format";
import { TrendingUp, TrendingDown, Activity, Bitcoin, Coins, Globe2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const StatCard = ({
  icon: Icon, label, value, delta, glow,
}: {
  icon: React.ElementType; label: string; value: string; delta?: string; glow?: "cyan" | "violet";
}) => (
  <div className="glass glass-hover rounded-2xl p-5 relative overflow-hidden group">
    <div
      className={`absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition ${
        glow === "violet" ? "bg-secondary" : "bg-primary"
      }`}
    />
    <div className="relative flex items-start justify-between">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-2xl font-semibold mt-1">{value}</div>
        {delta && (
          <div
            className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
              delta.startsWith("-") ? "text-destructive" : "text-success"
            }`}
          >
            {delta.startsWith("-") ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </div>
      <div className={`h-10 w-10 rounded-xl glass grid place-items-center ${
        glow === "violet" ? "text-secondary" : "text-primary"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export const MarketStats = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["global"],
    queryFn: fetchGlobal,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Globe2}
        label="Global Market Cap"
        value={`$${fmtCompact(data.total_market_cap.usd)}`}
        delta={fmtPct(data.market_cap_change_percentage_24h_usd)}
      />
      <StatCard
        icon={Activity}
        label="24h Volume"
        value={`$${fmtCompact(data.total_volume.usd)}`}
        glow="violet"
      />
      <StatCard
        icon={Bitcoin}
        label="BTC Dominance"
        value={`${data.market_cap_percentage.btc.toFixed(1)}%`}
      />
      <StatCard
        icon={Coins}
        label="ETH Dominance"
        value={`${data.market_cap_percentage.eth.toFixed(1)}%`}
        glow="violet"
      />
    </div>
  );
};
