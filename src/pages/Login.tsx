import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "An authentication error occurred.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: email.split("@")[0],
            }
          }
        });
        if (error) throw error;
        toast.success("Signed up successfully! You can now log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Logged in successfully!");
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#02040a] text-white p-4 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="mesh-bg absolute inset-0 opacity-40 -z-10" />
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md glass rounded-[36px] border border-white/10 p-8 md:p-10 shadow-[0_0_50px_rgba(0,242,255,0.05)] scale-in-95 animate-in">
        <div className="text-center space-y-3 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow-cyan">
              <Sparkles className="h-6 w-6 text-primary-foreground animate-pulse" />
            </div>
          </Link>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Access <span className="text-gradient">CryptoSense</span>
          </h2>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Sign in to activate intelligence portal
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center shadow-glow-cyan/5 active:scale-[0.99] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase font-bold tracking-widest">Or QA Email Auth</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <Input
              type="email"
              placeholder="qa-test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-white/5 border-white/10"
              disabled={loading}
            />
            <Input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-white/5 border-white/10"
              disabled={loading}
            />
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : isSignUp ? "Sign Up Test Account" : "Sign In Test Account"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-primary hover:underline font-bold"
              >
                {isSignUp ? "Already have a QA account? Sign In" : "Need a QA account? Sign Up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

