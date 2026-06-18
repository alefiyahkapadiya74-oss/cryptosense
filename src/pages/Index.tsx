import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Landing from "@/pages/Landing";
import { CoinTable } from "@/components/CoinTable";
import { 
  DashboardChoice,
  AnalysisView,
  NewsView,
  CompareView,
  PortfolioView,
  AlertsView
} from "@/components/FlowComponents";
import { PredictionView } from "@/components/PredictionView";
import { ProfileView } from "@/components/ProfileView";

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(() => {
    return !!new URLSearchParams(window.location.search).get("view");
  });
  const [currentView, setCurrentView] = useState(() => {
    return new URLSearchParams(window.location.search).get("view") || "choice";
  });

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    if (view) {
      setCurrentView(view);
      setShowDashboard(true);
    }
  }, []);

  if (!showDashboard) {
    return <Landing onEnter={() => setShowDashboard(true)} />;
  }

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#02040a] text-white selection:bg-cyan-500/30 overflow-x-hidden">
      <div className="mesh-bg" />
      <Header onNavigate={handleNavigate} />
      
      <main className="flex-1">
        <div className="container py-8">
          {currentView === "choice" && (
            <DashboardChoice onSelect={handleNavigate} />
          )}
          
          {currentView === "markets" && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
                <h2 className="text-5xl font-black tracking-tighter text-white">Top <span className="text-gradient">Markets</span></h2>
                <p className="text-muted-foreground text-lg">Real-time cryptocurrency prices by market capitalization.</p>
              </div>
              <CoinTable />
            </div>
          )}

          {currentView === "analysis" && (
            <AnalysisView onBack={() => setCurrentView("choice")} />
          )}
          
          {currentView === "news" && (
            <NewsView onBack={() => setCurrentView("choice")} />
          )}
          
          {currentView === "compare" && (
            <CompareView onBack={() => setCurrentView("choice")} />
          )}

          {currentView === "portfolio" && (
            <PortfolioView onBack={() => setCurrentView("choice")} />
          )}

          {currentView === "alerts" && (
            <AlertsView onBack={() => setCurrentView("choice")} />
          )}

          {currentView === "prediction" && (
            <PredictionView onBack={() => setCurrentView("choice")} />
          )}

          {currentView === "profile" && (
            <ProfileView onBack={() => setCurrentView("choice")} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
