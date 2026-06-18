import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { fetchTopCoins } from "@/lib/coingecko";
import { fmtUsd, shorten } from "@/lib/format";
import { Wallet, ArrowUpRight, Lock } from "lucide-react";
import { mainnet, base, arbitrum, optimism, polygon } from "wagmi/chains";

const chainName = (id?: number) =>
  [mainnet, base, arbitrum, optimism, polygon].find((c) => c.id === id)?.name ?? "Network";

export const Portfolio = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { data: top } = useQuery({ queryKey: ["top-mini"], queryFn: () => fetchTopCoins(8) });

  const eth = top?.find((c) => c.symbol === "eth");
  const matic = top?.find((c) => c.symbol === "pol" || c.symbol === "matic");
  const native = chainId === 137 ? matic : eth;
  const balanceNum = balance ? Number(formatUnits(balance.value, balance.decimals)) : 0;
  const usd = native ? balanceNum * native.current_price : 0;

  return (
    <section id="portfolio" className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

      <div className="relative space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Wallet className="h-3 w-3" /> Your Portfolio
            </div>
            <h3 className="font-display text-2xl font-bold mt-1">
              {isConnected ? "Connected Wallet" : "Wallet Disconnected"}
            </h3>
          </div>
          {isConnected && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Network</div>
              <div className="text-sm font-medium">{chainName(chainId)}</div>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-10 space-y-3">
            <div className="mx-auto h-14 w-14 rounded-2xl glass grid place-items-center text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Connect your wallet to see live balances, valuations and on-chain analytics.
            </p>
          </div>
        ) : (
          <>
            <div>
              <div className="font-display text-5xl font-bold tracking-tight">
                {fmtUsd(usd)}
              </div>
              <div className="font-mono text-sm text-muted-foreground mt-1">
                {balance ? `${balanceNum.toFixed(6)} ${balance.symbol}` : "Loading…"}
                <span className="mx-2">·</span>
                {shorten(address, 6)}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="glass rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Native Balance</div>
                <div className="font-mono text-lg font-semibold mt-1">
                  {balance ? `${balanceNum.toFixed(4)} ${balance.symbol}` : "—"}
                </div>
                {native && (
                  <div className="text-xs text-muted-foreground mt-1">
                    @ {fmtUsd(native.current_price)}
                  </div>
                )}
              </div>
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank" rel="noreferrer"
                className="glass glass-hover rounded-xl p-4 flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Activity</div>
                  <div className="text-lg font-semibold mt-1">View on Explorer</div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
