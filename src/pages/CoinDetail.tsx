import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnalysisView } from "@/components/AnalysisView";

const CoinDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#02040a] text-white selection:bg-cyan-500/30 overflow-x-hidden">
      <div className="mesh-bg" />
      <Header onNavigate={(view) => navigate(`/?view=${view}`)} />
      
      <main className="flex-1 container py-8">
        <AnalysisView 
          initialCoinId={id} 
          onBack={() => navigate("/")} 
        />
      </main>

      <Footer />
    </div>
  );
};

export default CoinDetail;
