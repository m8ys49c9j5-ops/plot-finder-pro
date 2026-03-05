import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Layers, Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Sėkmingai prisijungėte!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Registracija sėkminga! Patikrinkite el. paštą.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-2xl text-foreground">
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Prisijunkite prie savo paskyros" : "Sukurkite naują paskyrą"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-6 space-y-4 shadow-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">El. paštas</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                placeholder="jusu@pastas.lt"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Slaptažodis</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full premium-gradient text-primary-foreground font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Palaukite..." : isLogin ? "Prisijungti" : "Registruotis"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Neturite paskyros?" : "Jau turite paskyrą?"}{" "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? "Registruotis" : "Prisijungti"}
            </button>
          </p>
        </form>

        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto">
          <ArrowLeft className="h-4 w-4" />
          Grįžti į žemėlapį
        </button>
      </div>
    </div>
  );
};

export default Auth;
