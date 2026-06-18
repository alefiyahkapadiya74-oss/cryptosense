import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useWatchlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlist = [], isLoading } = useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("watchlists")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleWatchlist = async (coin: { id: string; symbol: string; name: string }) => {
    if (!user) {
      toast.error("Please log in to manage your watchlist.");
      return;
    }

    const isFav = watchlist.some((w) => w.coin_id === coin.id);

    if (isFav) {
      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("user_id", user.id)
        .eq("coin_id", coin.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.info(`${coin.name} removed from watchlist.`);
        queryClient.invalidateQueries({ queryKey: ["watchlist", user?.id] });
      }
    } else {
      const { error } = await supabase
        .from("watchlists")
        .insert({
          user_id: user.id,
          coin_id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
        });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`${coin.name} added to watchlist.`);
        queryClient.invalidateQueries({ queryKey: ["watchlist", user?.id] });
      }
    }
  };

  const hasCoin = (coinId: string) => {
    return watchlist.some((w) => w.coin_id === coinId);
  };

  return {
    watchlist,
    isLoading,
    toggleWatchlist,
    hasCoin,
  };
};
