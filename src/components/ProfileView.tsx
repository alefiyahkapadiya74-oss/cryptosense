import React, { useState, useEffect } from "react";
import { ArrowLeft, User, Mail, Calendar, Star, Wallet, Save, ShieldAlert, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePortfolio } from "@/hooks/usePortfolio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileViewProps {
  onBack: () => void;
}

export const ProfileView = ({ onBack }: ProfileViewProps) => {
  const { user, profile, refetchProfile } = useAuth();
  const { watchlist } = useWatchlist();
  const { holdings } = usePortfolio();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-sm mb-6">Please log in to view this page.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Input Validation
      if (username && username.trim().length < 3) {
        throw new Error("Username must be at least 3 characters long.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          username: username.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      await refetchProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const userInitials = (fullName || user.email || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-500">
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="mb-8 gap-2 text-muted-foreground hover:text-white group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
        Back to Dashboard
      </Button>

      <div className="space-y-8">
        {/* Profile Header Header/Card */}
        <div className="glass rounded-[32px] p-8 border border-white/5 relative overflow-hidden bg-gradient-to-r from-primary/10 via-transparent to-transparent flex flex-col md:flex-row items-center gap-8">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-primary/20 blur-[80px] rounded-full" />
          
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name || "Avatar"} 
                className="h-24 w-24 rounded-3xl object-cover border-2 border-primary/20 p-1 bg-white/5 shadow-glow-cyan" 
              />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-gradient-primary grid place-items-center text-3xl font-black text-primary-foreground shadow-glow-cyan border-2 border-primary/20">
                {userInitials || <User className="h-10 w-10" />}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-success border-2 border-[#02040a] grid place-items-center" title="Session Verified">
              <Award className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-white">
              {profile?.full_name || user.email?.split("@")[0]}
            </h2>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary font-mono">
              @{profile?.username || "cryptouser"}
            </p>
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-white/10 hidden sm:inline" />
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Joined {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 grid place-items-center text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{holdings.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-black tracking-wider mt-0.5">Portfolio Assets</div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-yellow-500/5 to-transparent flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 grid place-items-center text-yellow-400">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{watchlist.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-black tracking-wider mt-0.5">Watchlisted Items</div>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="glass rounded-[32px] p-8 border border-white/5 relative overflow-hidden neon-border">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Edit Profile Settings
          </h3>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest ml-1">
                  Full Name
                </label>
                <Input 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="e.g. Satoshi Nakamoto" 
                  className="h-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 text-white" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest ml-1">
                  Username
                </label>
                <Input 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="e.g. satoshi99" 
                  className="h-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 text-white font-mono" 
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Profile updates are instantly synced to Supabase database. Email changes are restricted as your account uses secure third-party auth.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isSaving}
                className="h-12 px-8 rounded-full bg-gradient-primary shadow-glow-cyan font-black flex items-center gap-2 text-white"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving Settings..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
