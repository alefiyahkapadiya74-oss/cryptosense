import { Sparkles, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Hero = () => (
  <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
    <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] -z-10" />
    <div className="absolute top-20 right-1/4 h-[300px] w-[300px] rounded-full bg-secondary/20 blur-[120px] -z-10 animate-float" />

    <div className="container relative text-center max-w-4xl">
      <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-primary mb-6 animate-fade-in">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        Live on-chain data · Updated every 30s
        <Sparkles className="h-3 w-3" />
      </div>

      <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] animate-fade-in">
        Crypto analysis,
        <br />
        <span className="text-gradient">beautifully simple.</span>
      </h1>

      <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in">
        Track markets, analyze trends and connect your wallet — all in one
        elegant dashboard built for the next generation of investors.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in">
        <Button variant="hero" size="lg" asChild>
          <a href="#markets">Explore Markets</a>
        </Button>
        <Button variant="glass" size="lg" asChild>
          <a href="#analysis" className="gap-2">
            View Analysis <ArrowDown className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  </section>
);
