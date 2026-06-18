import { Sparkles, Github, Twitter } from "lucide-react";

export const Footer = () => (
  <footer className="border-t border-border/40 mt-20">
    <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-gradient-primary grid place-items-center">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} CryptoSense. Market data by CoinGecko.
        </span>
      </div>
      <div className="flex items-center gap-4 text-muted-foreground">
        <a href="#" aria-label="Twitter" className="hover:text-foreground transition"><Twitter className="h-4 w-4" /></a>
        <a href="#" aria-label="GitHub" className="hover:text-foreground transition"><Github className="h-4 w-4" /></a>
      </div>
    </div>
  </footer>
);
