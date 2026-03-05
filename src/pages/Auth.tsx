import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Layers, Mail, Lock, ArrowLeft, Search, MapPin, FileText, Check } from "lucide-react";
import { toast } from "sonner";

const tiers = [
  { name: "Starteris", credits: 1, price: "€1,99", perSearch: "€1,99", popular: false },
  { name: "Populiarus", credits: 10, price: "€9,99", perSearch: "€1,00", popular: true, save: "50%" },
  { name: "Profesionalus", credits: 30, price: "€19,99", perSearch: "€0,67", popular: false, save: "66%" },
];

const features = [
  { icon: Search, text: "Kadastrinė paieška pagal adresą" },
  { icon: MapPin, text: "Sklypo ribų atvaizdavimas žemėlapyje" },
  { icon: FileText, text: "Detali sklypo informacija" },
];

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
        toast.success("Registracija sėkminga!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Center: Login form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span className="font-display font-bold text-2xl text-foreground">
                Žemė<span className="text-gradient">Pro</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {isLogin ? "Prisijunkite" : "Sukurkite paskyrą"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Prisijunkite ir pradėkite paiešką"
                : "Registruokitės ir gaukite prieigą prie paieškos"}
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

          {/* Features row */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <f.icon className="h-3.5 w-3.5 text-primary" />
                {f.text}
              </div>
            ))}
          </div>

          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto">
            <ArrowLeft className="h-4 w-4" />
            Grįžti į žemėlapį
          </button>
        </div>
      </div>

      {/* Right: Skewed pricing panel */}
      <div className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[420px] items-center">
        <div
          className="absolute inset-0 bg-primary/5 border-l border-border"
          style={{ transform: "skewX(-6deg)", transformOrigin: "top right" }}
        />
        <div className="relative z-10 w-full px-12 py-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Kainodara</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Pasirinkite planą po prisijungimo
            </p>
          </div>

          <div className="space-y-3">
            {tiers.map((tier, i) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border p-4 transition-all backdrop-blur-sm ${
                  tier.popular
                    ? "border-primary bg-primary/10 shadow-md scale-[1.03]"
                    : "border-border bg-card/80"
                }`}
                style={{
                  transform: `rotate(${tier.popular ? -1 : i === 0 ? 1.5 : -1.5}deg)${tier.popular ? " scale(1.03)" : ""}`,
                }}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Populiariausias
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tier.credits} {tier.credits === 1 ? "paieška" : "paieškų"} · {tier.perSearch}/paieška
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground text-lg">{tier.price}</p>
                    {tier.save && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Sutaupyk {tier.save}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span>Saugūs mokėjimai per Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
