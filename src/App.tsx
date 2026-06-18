import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { wagmiConfig } from "@/lib/wagmi";
import { useAlertMonitor } from "@/hooks/useAlertMonitor";
import { CryptoChat } from "@/components/CryptoChat";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import CoinDetail from "./pages/CoinDetail.tsx";
import { Login } from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 min — data considered fresh
      gcTime: 10 * 60 * 1000,     // 10 min — keep in cache
      retry: 1,
      refetchOnWindowFocus: false, // prevent duplicate refetches
    },
  },
});

// Setup Web3Modal
const projectId = "3fbb6bba6f1de962d911bb5b5c9dba88";
createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: true,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "hsl(var(--primary))",
    "--w3m-border-radius-master": "16px",
  }
});

const MonitorWrapper = () => {
  useAlertMonitor();
  return null;
};

const App = () => {
  return (
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MonitorWrapper />
            <TooltipProvider>
              <Toaster />
              <Sonner theme="dark" />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/coin/:id" element={<CoinDetail />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              <CryptoChat />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
};

export default App;
