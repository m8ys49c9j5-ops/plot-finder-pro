import { useState, useEffect, useRef } from "react";
import { X, Loader2, Send, CheckSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MIN_MESSAGE_LENGTH = 30;
const COOLDOWN_SECONDS = 30;
const LS_KEY = "contactLastSent";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email);
}

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ContactDialog({ open, onClose }: ContactDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [humanCheck, setHumanCheck] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [emailError, setEmailError] = useState("");

  // Check cooldown on open
  useEffect(() => {
    if (!open) return;
    const lastSent = localStorage.getItem(LS_KEY);
    if (lastSent) {
      const elapsed = (Date.now() - parseInt(lastSent, 10)) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        setCooldownRemaining(Math.ceil(COOLDOWN_SECONDS - elapsed));
      } else {
        setCooldownRemaining(0);
      }
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const t = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownRemaining]);

  if (!open) return null;

  const senderEmail = user?.email || email.trim();
  const msg = message.trim();
  const canSubmit =
    senderEmail &&
    msg.length >= MIN_MESSAGE_LENGTH &&
    humanCheck &&
    cooldownRemaining <= 0 &&
    !sending &&
    (user || isValidEmail(email.trim()));

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val.trim() && !isValidEmail(val.trim())) {
      setEmailError("Neteisingas el. pašto formatas");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Honeypot check — bots fill hidden fields
    if (honeypot) {
      toast.success("Žinutė sėkmingai išsiųsta!");
      setMessage("");
      setEmail("");
      setHumanCheck(false);
      onClose();
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: { email: senderEmail, message: msg, website: honeypot },
      });
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Nepavyko išsiųsti žinutės.");
      }
      toast.success("Žinutė sėkmingai išsiųsta!");
      localStorage.setItem(LS_KEY, Date.now().toString());
      setCooldownRemaining(COOLDOWN_SECONDS);
      setMessage("");
      setEmail("");
      setHumanCheck(false);
      onClose();
    } catch (err: any) {
      console.error("Contact send error:", err);
      toast.error(err.message || "Nepavyko išsiųsti žinutės. Bandykite vėliau.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative glass-panel rounded-xl shadow-xl p-5 w-full max-w-md border border-border animate-fade-in bg-card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-foreground">Rašykite mums</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Honeypot — hidden from humans via CSS */}
          <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {!user && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Jūsų el. paštas</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="el.pastas@pavyzdys.lt"
                className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:ring-1 focus:ring-primary outline-none"
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
            </div>
          )}
          {user && (
            <p className="text-xs text-muted-foreground">
              Siųsime iš: <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Žinutė</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Jūsų komentaras, idėja ar pasiūlymas..."
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 resize-none h-28 focus:ring-1 focus:ring-primary outline-none"
            />
            <p className={`text-xs mt-1 ${msg.length >= MIN_MESSAGE_LENGTH ? "text-green-600" : "text-muted-foreground"}`}>
              {msg.length} / {MIN_MESSAGE_LENGTH} min. simbolių
            </p>
          </div>

          {/* Human check */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={humanCheck}
              onChange={(e) => setHumanCheck(e.target.checked)}
              className="rounded border-input"
            />
            Patvirtinu, kad esu žmogus
          </label>

          {cooldownRemaining > 0 && (
            <p className="text-xs text-amber-600">
              Galėsite siųsti vėl po {cooldownRemaining}s.
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full premium-gradient text-primary-foreground text-sm font-semibold rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Siunčiama...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Siųsti
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
