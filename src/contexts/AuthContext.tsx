import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Profile {
  id: string;
  updated_at: string;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = React.useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error && error.code !== "PGRST116") {
        throw error;
      }
      return data || null;
    } catch (err) {
      console.error("Error fetching profile:", err instanceof Error ? err.message : err);
      return null;
    }
  }, []);

  const syncProfile = React.useCallback(async (currentUser: User) => {
    try {
      const metadata = currentUser.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || null;
      const avatarUrl = metadata.avatar_url || metadata.picture || null;
      const emailUsername = currentUser.email ? currentUser.email.split("@")[0] : null;
      const username = metadata.username || emailUsername || null;

      // Fetch existing profile first
      const existingProfile = await fetchProfile(currentUser.id);

      if (!existingProfile) {
        // Create new profile
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: currentUser.id,
            full_name: fullName,
            avatar_url: avatarUrl,
            username: username,
          });
        if (insertError) throw insertError;
      } else {
        // Update if metadata exists and differs (only sync empty fields to avoid overwriting user updates)
        const needsUpdate = 
          (fullName && !existingProfile.full_name) ||
          (avatarUrl && !existingProfile.avatar_url) ||
          (username && !existingProfile.username);
          
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              full_name: existingProfile.full_name || fullName,
              avatar_url: existingProfile.avatar_url || avatarUrl,
              username: existingProfile.username || username,
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentUser.id);
          if (updateError) throw updateError;
        }
      }

      // Final fetch to sync local state
      const finalProfile = await fetchProfile(currentUser.id);
      setProfile(finalProfile);
    } catch (err) {
      console.error("Error syncing profile:", err instanceof Error ? err.message : err);
    }
  }, [fetchProfile]);

  const refetchProfile = React.useCallback(async () => {
    if (user) {
      const data = await fetchProfile(user.id);
      setProfile(data);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Check initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(initialSession);
        
        if (initialSession?.user) {
          setUser(initialSession.user);
          await syncProfile(initialSession.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error fetching initial session:", err instanceof Error ? err.message : err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        await syncProfile(newUser);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
      
      if (event === "SIGNED_IN") {
        toast.success("Successfully signed in!");
      } else if (event === "SIGNED_OUT") {
        toast.info("Signed out of CryptoSense.");
      } else if (event === "USER_UPDATED") {
        toast.success("Profile updated!");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign out.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
