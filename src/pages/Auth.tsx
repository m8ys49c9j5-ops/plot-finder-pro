import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useNavigate } from "react-router-dom";
import { Layers, Mail, Lock, ArrowLeft, Search, MapPin, FileText, Check, Zap, Crown, Loader2, Info, MailCheck, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const CREDITS_ENABLED = false; // TODO: set to true when credits go live

const tiers = [
  { id: "tier1", name: "Starteris", credits: 1, price: "€1,99", perSearch: "€1,99", icon: Search, popular: false },
  { id: "tier2", name: "Populiarus", credits: 10, price: "€9,99", perSearch: "€1,00", icon: Zap, popular: true, save: "50%" },
  { id: "tier3", name: "Profesionalus", credits: 30, price: "€19,99", perSearch: "€0,67", icon: Crown, popular: false, save: "66%" },
];

const features = [
  { icon: Search, text: "Kadastrinė paieška pagal adresą" },
  { icon: MapPin, text: "Sklypo ribų atvaizdavimas žemėlapyje" },
  { icon: FileText, text: "Detali sklypo informacija" },
];

// Password validation rules (registration only)
const PASSWORD_RULES = [
  { key: "length", label: "Mažiausiai 8 simboliai", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "Bent 1 didžioji raidė (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "Bent 1 mažoji raidė (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { key: "digit", label: "Bent 1 skaičius (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "Bent 1 specialus simbolis (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 1) return { score: 20, label: "Silpnas", color: "bg-red-500" };
  if (passed <= 2) return { score: 40, label: "Silpnas", color: "bg-red-500" };
  if (passed <= 3) return { score: 60, label: "Vidutinis", color: "bg-orange-500" };
  if (passed <= 4) return { score: 80, label: "Stiprus", color: "bg-yellow-500" };
  return { score: 100, label: "Labai stiprus", color: "bg-green-500" };
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();

  // Email verification state
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const allPasswordRulesPass = PASSWORD_RULES.every(r => r.test(password));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLogin && !allPasswordRulesPass) {
      toast.error("Slaptažodis neatitinka reikalavimų.");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Sėkmingai prisijungėte!");
        if (CREDITS_ENABLED && selectedTier) {
          await redirectToCheckout(selectedTier);
        } else {
          navigate("/map");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/map" },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Registracija sėkminga!");
          if (CREDITS_ENABLED && selectedTier) {
            await redirectToCheckout(selectedTier);
          } else {
            navigate("/map");
          }
        } else {
          // Email confirmation required
          setSentEmail(email);
          setEmailSent(true);
          setResendCooldown(60);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await supabase.auth.resend({ type: "signup", email: sentEmail });
      toast.success("Patvirtinimo laiškas išsiųstas pakartotinai!");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Nepavyko išsiųsti pakartotinai.");
    }
  };

  const redirectToCheckout = async (tierId: string) => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier: tierId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Klaida kuriant mokėjimą");
      navigate("/map");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const strength = !isLogin ? getPasswordStrength(password) : null;

  // Email verification sent screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-2xl text-foreground">
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </div>
          <div className="glass-panel rounded-xl p-8 shadow-lg space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Patikrinkite el. paštą</h2>
            <p className="text-sm text-muted-foreground">
              Išsiuntėme patvirtinimo nuorodą į <span className="font-semibold text-foreground">{sentEmail}</span>. Paspauskite ją, kad prisijungtumėte.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              Negavote laiško? Patikrinkite Spam aplanką arba{" "}
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Siųsti iš naujo (${resendCooldown}s)` : "Siųsti iš naujo"}
              </button>
            </div>
          </div>
          <button onClick={() => navigate("/map")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto">
            <ArrowLeft className="h-4 w-4" />
            Grįžti į žemėlapį
          </button>
        </div>
      </div>
    );
  }

  // When credits are disabled, show simplified auth form
  if (!CREDITS_ENABLED) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={() => navigate("/map")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Grįžti
          </button>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span className="font-display font-bold text-2xl text-foreground">
                Žemė<span className="text-gradient">Pro</span>
              </span>
            </div>
          </div>

          {/* Coming soon banner */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Mokama versija su papildoma informacija netrukus! Šiuo metu registracija yra nemokama.
            </p>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              {isLogin ? "Prisijunkite" : "Sukurkite paskyrą"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin
                ? "Prisijunkite prie savo paskyros"
                : "Registruokitės nemokamai"}
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? 1 : 8}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength indicator — registration only */}
              {!isLogin && password.length > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 rounded-full ${strength!.color}`} style={{ width: `${strength!.score}%` }} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{strength!.label}</span>
                  </div>
                  {passwordFocused && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {PASSWORD_RULES.map(rule => (
                        <div key={rule.key} className="flex items-center gap-1.5 text-xs">
                          {rule.test(password) ? (
                            <Check className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={rule.test(password) ? "text-green-600" : "text-muted-foreground"}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!isLogin && !allPasswordRulesPass)}
              className="w-full premium-gradient text-primary-foreground font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Palaukite...
                </>
              ) : isLogin ? (
                "Prisijungti"
              ) : (
                "Registruotis"
              )}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">arba</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const redirectUri = import.meta.env.VITE_APP_URL || window.location.origin;
                const { error } = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: redirectUri,
                });
                if (error) toast.error(error.message || "Apple prisijungimo klaida");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-input bg-background py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Prisijungti su Apple
            </button>

            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Neturite paskyros?" : "Jau turite paskyrą?"}{" "}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setPassword(""); }} className="text-primary font-medium hover:underline">
                {isLogin ? "Registruotis" : "Prisijungti"}
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Original tier-based flow (when CREDITS_ENABLED is true)
  if (selectedTier) {
    const tier = tiers.find((t) => t.id === selectedTier)!;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={() => setSelectedTier(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Grįžti į kainas
          </button>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span className="font-display font-bold text-2xl text-foreground">
                Žemė<span className="text-gradient">Pro</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
              <tier.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{tier.name}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm font-bold text-foreground">{tier.price}</span>
              <span className="text-xs text-muted-foreground">({tier.credits} {tier.credits === 1 ? "paieška" : "paieškų"})</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              {isLogin ? "Prisijunkite" : "Sukurkite paskyrą"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin
                ? "Prisijunkite ir būsite nukreipti į mokėjimą"
                : "Registruokitės ir būsite nukreipti į mokėjimą"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-6 space-y-4 shadow-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">El. paštas</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  placeholder="jusu@pastas.lt" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Slaptažodis</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isLogin ? 1 : 8}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading || checkoutLoading}
              className="w-full premium-gradient text-primary-foreground font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading || checkoutLoading ? (<><Loader2 className="h-4 w-4 animate-spin" />Palaukite...</>) : isLogin ? "Prisijungti ir mokėti" : "Registruotis ir mokėti"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Neturite paskyros?" : "Jau turite paskyrą?"}{" "}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
                {isLogin ? "Registruotis" : "Prisijungti"}
              </button>
            </p>
          </form>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span>Saugus mokėjimas per Stripe</span>
          </div>
        </div>
      </div>
    );
  }

  // Default: show pricing selection (only when CREDITS_ENABLED)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-2xl text-foreground">
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Greita ir patikima kadastrinė paieška Lietuvoje</p>
        </div>
        <div className="flex justify-center gap-6">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <f.icon className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">{f.text}</span>
            </div>
          ))}
        </div>
        <h3 className="text-center text-lg font-bold text-foreground">Pasirinkite planą</h3>
        <div className="space-y-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <button key={tier.id} onClick={() => setSelectedTier(tier.id)}
                className={`relative w-full text-left rounded-xl border p-5 transition-all hover:scale-[1.02] active:scale-[0.99] cursor-pointer ${
                  tier.popular ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                }`}>
                {tier.popular && <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Populiariausias</span>}
                {tier.save && <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full premium-gradient text-primary-foreground">Sutaupyk {tier.save}</span>}
                <div className="flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${tier.popular ? "premium-gradient" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${tier.popular ? "text-primary-foreground" : "text-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">{tier.credits} {tier.credits === 1 ? "paieška" : "paieškų"} · {tier.perSearch}/paieška</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground text-xl">{tier.price}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-primary" />
          <span>Mokėjimai apdorojami saugiai per Stripe</span>
        </div>
        <button onClick={() => navigate("/map")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto">
          <ArrowLeft className="h-4 w-4" />
          Grįžti į žemėlapį
        </button>
      </div>
    </div>
  );
};

export default Auth;
