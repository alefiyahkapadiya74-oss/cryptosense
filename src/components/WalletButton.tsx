import { useAccount, useDisconnect, useBalance, useChainId, useSwitchChain } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Check } from "lucide-react";
import { shorten } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { mainnet, base, arbitrum, optimism, polygon } from "wagmi/chains";

const chainOptions = [mainnet, base, arbitrum, optimism, polygon];

export const WalletButton = () => {
  const { address, isConnected, connector } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const currentChain = chainOptions.find((c) => c.id === chainId);

  if (!isConnected) {
    return (
      <Button 
        variant="hero" 
        size="lg" 
        className="gap-2 group"
        onClick={() => open()}
      >
        <Wallet className="h-4 w-4 group-hover:rotate-12 transition-transform" />
        Connect <span className="hidden sm:inline">to MetaMask</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="glass" size="sm" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
            {currentChain?.name ?? "Network"}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass border-border/50">
          <DropdownMenuLabel>Switch network</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {chainOptions.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => switchChain({ chainId: c.id })}
              className="cursor-pointer"
            >
              {c.id === chainId && <Check className="mr-2 h-3 w-3 text-primary" />}
              <span className={c.id === chainId ? "" : "ml-5"}>{c.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="glass" className="gap-2 font-mono">
            <span className="h-7 w-7 rounded-full bg-gradient-primary" />
            {shorten(address)}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass w-72 border-border/50">
          <DropdownMenuLabel className="space-y-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Balance</div>
            <div className="font-display text-2xl">
              {balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "—"}
            </div>
            <div className="font-mono text-xs text-muted-foreground">{address}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { navigator.clipboard.writeText(address ?? ""); toast.success("Address copied"); }}
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" /> Copy address
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <a
              href={`https://etherscan.io/address/${address}`}
              target="_blank" rel="noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> View on Etherscan
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { disconnect(); toast.message(`Disconnected from ${connector?.name ?? "wallet"}`); }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" /> Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
