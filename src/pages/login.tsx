import React, { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock as LockIcon, Loader2, ArrowLeft, Layers, MailCheck, Check, X, Eye, EyeOff } from "lucide-react";

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

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Email verification state
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const returnTo = (location.state as any)?.from || "/map";

  // Cooldown timer
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
        navigate(returnTo);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, 
          password,
          options: { 
            emailRedirectTo: window.location.origin + "/map"
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Registracija sėkminga!");
          navigate(returnTo);
        } else {
          // Email confirmation required
          setSentEmail(email);
          setEmailSent(true);
          setResendCooldown(60);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Įvyko klaida. Bandykite dar kartą.");
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

  // Email verification sent screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
        <button 
          onClick={() => navigate("/")} 
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Grįžti
        </button>
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-center items-center gap-2 mb-8">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <span className="text-3xl font-display font-bold text-foreground">
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </div>
          <div className="glass-panel bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Patikrinkite el. paštą</h1>
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
        </div>
      </div>
    );
  }

  const strength = !isLogin ? getPasswordStrength(password) : null;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4 relative">
      <button 
        onClick={() => navigate("/")} 
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į žemėlapį
      </button>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center items-center gap-2 mb-8">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <span className="text-3xl font-display font-bold text-foreground">
            Žemė<span className="text-gradient">Pro</span>
          </span>
        </div>

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
                    type={showPassword ? "text" : "password"}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={isLogin ? 1 : 8}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="w-full pl-11 pr-10 py-3 rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                className="w-full premium-gradient text-primary-foreground font-bold text-lg rounded-xl py-3.5 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {isLogin ? "Prisijungti" : "Registruotis"}
              </button>
            </form>
          </div>

          <div className="p-6 border-t border-border bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Neturite paskyros?" : "Jau turite paskyrą?"}{" "}
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setPassword(""); }}
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
