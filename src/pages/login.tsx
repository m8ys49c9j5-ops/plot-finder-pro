import React, { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock as LockIcon, Loader2, ArrowLeft, Layers } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Read the return URL from navigation state
  const returnTo = (location.state as any)?.from || "/map";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (error) throw error;
        toast.success("Sėkmingai prisijungėte!");
        navigate(returnTo);
      } else {
        const { error } = await supabase.auth.signUp({
          email, 
          password,
          options: { 
            emailRedirectTo: window.location.origin 
          },
        });
        if (error) throw error;
        toast.success("Registracija sėkminga! Patikrinkite savo el. paštą.");
        if (!supabase.auth.getSession()) {
            setIsLogin(true);
        } else {
            navigate(returnTo);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
      
      {/* Back to Home Button */}
      <button 
        onClick={() => navigate("/")} 
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į žemėlapį
      </button>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Logo */}
        <div className="flex justify-center items-center gap-2 mb-8">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <span className="text-3xl font-display font-bold text-foreground">
            Žemė<span className="text-gradient">Pro</span>
          </span>
        </div>

        {/* Auth Card */}
        <div className="glass-panel bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">
                {isLogin ? "Prisijungti prie paskyros" : "Sukurti naują paskyrą"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {isLogin 
                  ? "Įveskite savo duomenis, kad pasiektumėte paieškų istoriją ir kreditus." 
                  : "Registruokitės ir pradėkite naudotis profesionaliomis sklypų ataskaitomis."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">El. paštas</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="vardas@pavyzdys.lt"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Slaptažodis</label>
                <div className="relative">
                  <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit" 
                disabled={loading}
                className="w-full premium-gradient text-primary-foreground font-bold text-lg rounded-xl py-3.5 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {isLogin ? "Prisijungti" : "Registruotis"}
              </button>
            </form>
          </div>

          {/* Footer Toggle */}
          <div className="p-6 border-t border-border bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Neturite paskyros?" : "Jau turite paskyrą?"}{" "}
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-primary font-bold hover:underline transition-all"
              >
                {isLogin ? "Registruotis čia" : "Prisijungti čia"}
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
