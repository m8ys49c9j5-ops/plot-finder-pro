import { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ContactDialog({ open, onClose }: ContactDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const senderEmail = user?.email || email.trim();
    const msg = message.trim();
    if (!senderEmail || !msg) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: { email: senderEmail, message: msg },
      });
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Nepavyko išsiųsti žinutės.");
      }
      toast.success("Žinutė sėkmingai išsiųsta!");
      setMessage("");
      setEmail("");
      onClose();
    } catch (err) {
      console.error("Contact send error:", err);
      toast.error("Nepavyko išsiųsti žinutės. Bandykite vėliau.");
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
          {!user && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Jūsų el. paštas</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="el.pastas@pavyzdys.lt"
                className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:ring-1 focus:ring-primary outline-none"
              />
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
          </div>
          <button
            type="submit"
            disabled={sending}
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
