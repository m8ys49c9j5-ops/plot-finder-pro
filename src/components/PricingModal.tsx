import { useState } from "react";
import { X, Search, Zap, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

const tiers = [
  {
    id: "tier1",
    name: "1 Paieška",
    price: "1,99 €",
    credits: 1,
    icon: Search,
    badge: null,
  },
  {
    id: "tier2",
    name: "10 Paieškų",
    price: "9,99 €",
    credits: 10,
    icon: Zap,
    badge: "50% nuolaida",
    popular: true,
  },
  {
    id: "tier3",
    name: "30 Paieškų",
    price: "19,99 €",
    credits: 30,
    icon: Crown,
    badge: "67% nuolaida",
  },
];

const PricingModal = ({ open, onClose }: PricingModalProps) => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  if (!open) return null;

  const handleBuy = async (tierId: string) => {
    setLoadingTier(tierId);
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
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-panel rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-foreground">Įsigyti paieškų kreditų</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Kiekviena sėkminga sklypo paieška naudoja 1 kreditą. Pasirinkite planą:
        </p>

        <div className="space-y-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`relative rounded-xl border p-4 flex items-center gap-4 transition-all ${
                  tier.popular
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full premium-gradient text-primary-foreground">
                    {tier.badge}
                  </span>
                )}
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  tier.popular ? "premium-gradient" : "bg-muted"
                }`}>
                  <Icon className={`h-5 w-5 ${tier.popular ? "text-primary-foreground" : "text-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(parseFloat(tier.price.replace(",", ".").replace(" €", "")) / tier.credits).toFixed(2).replace(".", ",")} € / paieška
                  </p>
                </div>
                <button
                  onClick={() => handleBuy(tier.id)}
                  disabled={loadingTier !== null}
                  className={`shrink-0 font-semibold rounded-lg px-4 py-2 text-sm transition-opacity disabled:opacity-50 ${
                    tier.popular
                      ? "premium-gradient text-primary-foreground hover:opacity-90"
                      : "bg-foreground text-background hover:opacity-80"
                  }`}
                >
                  {loadingTier === tier.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    tier.price
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Saugus mokėjimas per Stripe · Kreditai niekada nenusibaigia
        </p>
      </div>
    </div>
  );
};

export default PricingModal;
