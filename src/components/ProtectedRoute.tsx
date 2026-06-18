import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a] text-white">
        <div className="mesh-bg absolute inset-0 opacity-40" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Syncing Neural Connection...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
