import { X, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import type { SznsZone } from "@/lib/sznsPolygonSampling";

interface SznsModalProps {
  open: boolean;
  onClose: () => void;
  zones: SznsZone[] | null;
  loading: boolean;
  failed?: boolean;
  pointsQueried?: number;
}

const SznsModal = ({ open, onClose, zones, loading, failed, pointsQueried }: SznsModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed top-[340px] left-4 z-[1100] w-[340px] max-h-[50vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl animate-fade-in max-sm:left-2 max-sm:right-2 max-sm:w-auto max-sm:top-auto max-sm:bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-sm font-display font-bold text-foreground truncate">
            Specialiosios sąlygos
          </h2>
          {!loading && zones && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tikrinta taškų: {pointsQueried ?? 0}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 ml-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Skenuojamas sklypas...</span>
          </div>
        )}

        {!loading && failed && (
          <div className="flex items-center gap-2 py-6 justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-muted-foreground">
              Užklausa nepavyko. Bandykite dar kartą.
            </span>
          </div>
        )}

        {!loading && !failed && zones && zones.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              Šiame sklype specialiųjų sąlygų nerasta.
            </p>
          </div>
        )}

        {!loading && !failed && zones && zones.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Rasta zonų: {zones.length}
            </p>
            {zones.map((zone) => {
              const r = zone.restrictions || {};
              const kodas = r["KODAS"] || r["UNIK_NR"] || r["UNIKALUS_NR"] || r["OBJECTID"] || "";
              const plotas = r["PLOTAS_HA"] || r["PLOTAS"] || "";
              const nuoroda = r["NUORODA"] || "";
              const statusas = r["STATUSAS"] || "";

              return (
                <div
                  key={zone.id}
                  className="rounded-lg bg-muted/40 p-2.5 space-y-1"
                >
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {zone.name}
                  </p>
                  {zone.type && zone.type !== zone.name && (
                    <p className="text-[10px] text-muted-foreground">{zone.type}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    {kodas && (
                      <span className="bg-muted rounded px-1.5 py-0.5">
                        Nr. {kodas}
                      </span>
                    )}
                    {plotas && (
                      <span className="bg-muted rounded px-1.5 py-0.5">
                        {plotas} ha
                      </span>
                    )}
                    {statusas && (
                      <span className={`rounded px-1.5 py-0.5 ${statusas === "Patvirtinta" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {statusas}
                      </span>
                    )}
                  </div>
                  {nuoroda && (
                    <a
                      href={nuoroda}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Aprašas
                    </a>
                  )}
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground mt-1">
              © NŽT / Registrų centras
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SznsModal;
