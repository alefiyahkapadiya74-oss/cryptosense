import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCoins, type CoinSearchResult } from "@/lib/newsApis";

interface Props {
  onSelect: (id: string, name: string, symbol: string) => void;
  placeholder?: string;
}

export const CoinSearchInput = ({ onSelect, placeholder = "Search for a coin (e.g. bitcoin, solana)..." }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoinSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const r = await searchCoins(q);
      setResults(r);
      setShowDropdown(r.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      onSelect(results[0].id, results[0].name, results[0].symbol);
      setQuery(results[0].name);
      setShowDropdown(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative group">
        <Input
          value={query}
          onChange={(e) => doSearch(e.target.value)}
          placeholder={placeholder}
          className="h-14 pl-12 pr-12 rounded-2xl bg-white/5 border-white/10 text-lg focus:ring-primary/50 transition-all group-hover:border-white/20"
        />
        <Search className="absolute left-4 top-4 h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        {searching && <Loader2 className="absolute right-4 top-4 h-6 w-6 text-primary animate-spin" />}
      </form>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-[#0c1222]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {results.map((coin) => (
            <button
              key={coin.id}
              onClick={() => {
                onSelect(coin.id, coin.name, coin.symbol);
                setQuery(coin.name);
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
            >
              <img src={coin.thumb} alt="" className="h-8 w-8 rounded-full bg-white/5" />
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{coin.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{coin.symbol}</div>
              </div>
              {coin.market_cap_rank && (
                <div className="text-[10px] font-black text-primary/40 group-hover:text-primary transition-colors">#{coin.market_cap_rank}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
