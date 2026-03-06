import { MapPin, Ruler, Building2, Map, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ParcelPreviewData {
  cadastralNumber: string;
  unikalusNr?: string;
  area?: number;
  purpose?: string;
  address?: string;
  lat?: number;
  lng?: number;
  coordinates?: number[][][] | number[][][][];
  formavimoData?: string;
}

interface ParcelPreviewProps {
  parcel: ParcelPreviewData;
  onUnlock: () => void;
  isUnlocking: boolean;
  credits: number;
  onClose: () => void;
  onBuyCredits: () => void;
}

const REPORT_FEATURES = [
  { icon: MapPin, label: "Tikslus adresas", desc: "Artimiausias registruotas adresas" },
  { icon: Ruler, label: "Tikslus plotas", desc: "Juridinis sklypo plotas hektarais" },
  { icon: Building2, label: "Žemės paskirtis", desc: "Oficiali žemės naudojimo paskirtis" },
  { icon: Map, label: "Ribų koordinatės", desc: "GeoJSON poligonas su visomis ribomis" },
];

const ParcelPreview = ({ parcel, onUnlock, isUnlocking, credits, onClose, onBuyCredits }: ParcelPreviewProps) => {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Success header */}
        <div className="premium-gradient px-6 py-5 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary-foreground/20 mb-3">
            <CheckCircle2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-primary-foreground">
            Sklypas rastas registre!
          </h2>
          <p className="text-primary-foreground/80 text-sm mt-1">
            Kadastrinis numeris patvirtintas
          </p>
        </div>

        {/* Parcel summary */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kadastrinis numeris</p>
            <p className="text-lg font-display font-bold text-foreground">{parcel.cadastralNumber}</p>
            {parcel.unikalusNr && (
              <p className="text-xs text-muted-foreground mt-1">Unikalus Nr: {parcel.unikalusNr}</p>
            )}
          </div>

          {/* Blurred preview hint */}
          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4 relative overflow-hidden">
            <div className="absolute inset-0 backdrop-blur-md bg-muted/60 z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Duomenys paslėpti</span>
              </div>
            </div>
            <div className="space-y-2 select-none" aria-hidden>
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>

        {/* Report includes */}
        <div className="px-6 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Ataskaitoje rasite:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_FEATURES.map((feat) => (
              <div
                key={feat.label}
                className="flex items-start gap-2.5 rounded-lg bg-muted/30 border border-border/50 p-3"
              >
                <feat.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{feat.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          {credits > 0 ? (
            <>
              <Button
                onClick={onUnlock}
                disabled={isUnlocking}
                className="w-full premium-gradient text-primary-foreground font-semibold rounded-xl py-6 text-base hover:opacity-90 transition-opacity border-0"
              >
                {isUnlocking ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Atrakinti pilną ataskaitą (1 kreditas)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Jūs turite <span className="font-semibold text-foreground">{credits}</span> {credits === 1 ? "kreditą" : "kreditų"}
              </p>
            </>
          ) : (
            <>
              <Button
                onClick={onBuyCredits}
                className="w-full premium-gradient text-primary-foreground font-semibold rounded-xl py-6 text-base hover:opacity-90 transition-opacity border-0"
              >
                Įsigyti kreditų
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Neturite kreditų. Įsigykite, kad galėtumėte atrakinti ataskaitą.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParcelPreview;
