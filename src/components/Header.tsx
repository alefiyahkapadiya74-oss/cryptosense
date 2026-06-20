import { Link } from "react-router-dom";
import { WalletButton } from "./WalletButton";
import { Sparkles, User, LogOut, ChevronDown, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Header = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-xl bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <button onClick={() => onNavigate?.("choice")} className="flex items-center gap-2 group">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow-cyan group-hover:shadow-neon transition-all">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-primary blur-lg opacity-50 -z-10 group-hover:opacity-80 transition" />
          </div>
          <div className="flex flex-col items-start">
            <div className="font-display text-xl font-bold tracking-tight leading-none">
              CryptoSense<span className="text-gradient">.</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-1 w-1 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]" />
              <span className="text-[7px] uppercase font-black tracking-[0.2em] text-success/80">Intelligence Active</span>
            </div>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-widest font-black text-muted-foreground">
          <button onClick={() => onNavigate?.("markets")} className="hover:text-primary transition-colors">Markets</button>
          <button onClick={() => onNavigate?.("portfolio")} className="hover:text-primary transition-colors">Portfolio</button>
          <button onClick={() => onNavigate?.("analysis")} className="hover:text-primary transition-colors">Analysis</button>
          <button onClick={() => onNavigate?.("prediction")} className="hover:text-primary transition-colors">Prediction</button>
          <button onClick={() => onNavigate?.("compare")} className="hover:text-primary transition-colors">Compare</button>
        </nav>

        <div className="flex items-center gap-3">
          <WalletButton />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" className="gap-2 px-3 py-1.5 h-10 rounded-xl border border-white/10 hover:border-primary/30 transition-all">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-lg object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded-lg bg-gradient-primary grid place-items-center">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-semibold text-white truncate max-w-[120px]">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass w-56 border-border/50 rounded-2xl p-2 mt-1">
                <DropdownMenuLabel className="space-y-1 p-3">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Logged In As</div>
                  <div className="font-semibold text-xs text-white truncate">{profile?.full_name || user.email?.split("@")[0]}</div>
                  <div className="flex items-center gap-1 mt-1 text-[8px] uppercase tracking-wider text-primary font-bold">
                    <Shield className="h-2.5 w-2.5" /> Supabase Sec Link
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={() => onNavigate?.("profile")}
                  className="cursor-pointer text-white hover:bg-white/5 focus:bg-white/5 rounded-xl p-2.5 flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-muted-foreground" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={() => toast.info("Sign out is disabled in Demo Mode.")}
                  className="cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 rounded-xl p-2.5"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};
