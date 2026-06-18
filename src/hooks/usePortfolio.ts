import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fetchTopCoins } from "@/lib/coingecko";

export interface TransactionInput {
  coin_id: string;
  symbol: string;
  name: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  notes?: string | null;
}

export const usePortfolio = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch user holdings from Supabase
  const { data: holdings = [], isLoading: isLoadingHoldings } = useQuery({
    queryKey: ["portfolio_holdings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolio_holdings")
        .select("*")
        .eq("user_id", user.id);
      
      if (error) {
        toast.error("Error loading portfolio holdings: " + error.message);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // 2. Fetch user transactions from Supabase
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["portfolio_transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });
      
      if (error) {
        toast.error("Error loading transactions: " + error.message);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // 3. Fetch live coin prices (top 100 coins)
  const { data: topCoins = [], isLoading: isLoadingPrices } = useQuery({
    queryKey: ["top-coins-portfolio"],
    queryFn: () => fetchTopCoins(100),
    refetchInterval: 60_000, // Refresh live price feed every 60 seconds
  });

  // Helper: Find live price of a coin
  const getLivePrice = (coinId: string, fallbackPrice = 0) => {
    const coin = topCoins.find(
      (c) =>
        c.id.toLowerCase() === coinId.toLowerCase() ||
        c.symbol.toLowerCase() === coinId.toLowerCase()
    );
    return coin ? coin.current_price : fallbackPrice;
  };

  // Helper: Find coin image URL
  const getCoinImage = (coinId: string) => {
    const coin = topCoins.find(
      (c) =>
        c.id.toLowerCase() === coinId.toLowerCase() ||
        c.symbol.toLowerCase() === coinId.toLowerCase()
    );
    return coin?.image || "";
  };

  // Helper: Find coin current 24h change percentage
  const getLivePriceChange24h = (coinId: string) => {
    const coin = topCoins.find(
      (c) =>
        c.id.toLowerCase() === coinId.toLowerCase() ||
        c.symbol.toLowerCase() === coinId.toLowerCase()
    );
    return coin ? coin.price_change_percentage_24h : 0;
  };

  // 4. Compute portfolio calculations
  const portfolioSummary = (() => {
    let totalValue = 0;
    let totalCostBasis = 0;
    let totalValueChange24h = 0; // Weighted 24h change

    const holdingsWithPrices = holdings.map((h) => {
      const currentPrice = getLivePrice(h.coin_id, h.buy_price_avg);
      const value = h.amount * currentPrice;
      const costBasis = h.amount * h.buy_price_avg;
      const profitLoss = value - costBasis;
      const profitLossPercentage = h.buy_price_avg > 0 ? (profitLoss / costBasis) * 100 : 0;
      const priceChange24h = getLivePriceChange24h(h.coin_id);

      totalValue += value;
      totalCostBasis += costBasis;
      totalValueChange24h += value * (priceChange24h / 100);

      return {
        ...h,
        current_price: currentPrice,
        value,
        costBasis,
        profitLoss,
        profitLossPercentage,
        priceChange24h,
        image: getCoinImage(h.coin_id),
      };
    });

    const totalProfitLoss = totalValue - totalCostBasis;
    const totalProfitLossPercentage = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
    const portfolioChange24hPercentage = totalValue > 0 ? (totalValueChange24h / totalValue) * 100 : 0;

    return {
      holdings: holdingsWithPrices,
      totalValue,
      totalCostBasis,
      totalProfitLoss,
      totalProfitLossPercentage,
      portfolioChange24hPercentage,
    };
  })();

  // 5. Mutation to add a transaction to Supabase
  const addTransactionMutation = useMutation({
    mutationFn: async (tx: TransactionInput) => {
      if (!user) throw new Error("Authentication required.");

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          coin_id: tx.coin_id,
          symbol: tx.symbol.toLowerCase(),
          name: tx.name,
          type: tx.type,
          amount: tx.amount,
          price: tx.price,
          notes: tx.notes || null,
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Transaction recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["portfolio_holdings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["portfolio_transactions", user?.id] });
    },
    onError: (error: Error) => {
      console.error("Supabase insert transaction error:", error);
      toast.error(error.message || "Failed to log transaction.");
    },
  });

  return {
    holdings: portfolioSummary.holdings,
    transactions,
    totalValue: portfolioSummary.totalValue,
    totalProfitLoss: portfolioSummary.totalProfitLoss,
    totalProfitLossPercentage: portfolioSummary.totalProfitLossPercentage,
    portfolioChange24hPercentage: portfolioSummary.portfolioChange24hPercentage,
    isLoading: isLoadingHoldings || isLoadingTransactions || isLoadingPrices,
    addTransaction: addTransactionMutation.mutateAsync,
    isAddingTransaction: addTransactionMutation.isPending,
  };
};
