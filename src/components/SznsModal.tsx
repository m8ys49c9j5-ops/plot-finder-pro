import { X, ExternalLink, Loader2 } from "lucide-react";

interface SznsResult {
  layerName: string;
  attributes: Record<string, any>;
}

interface SznsModalProps {
  open: boolean;
  onClose: () => void;
  results: SznsResult[] | null;
  loading: boolean;
}

const SznsModal = ({ open, onClose, results, loading }: SznsModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed top-[340px] left-4 z-[1100] w-[340px] max-h-[50vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl animate-fade-in max-sm:left-2 max-sm:right-2 max-sm:w-auto max-sm:top-auto max-sm:bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-sm font-display font-bold text-foreground truncate">
            Specialiosios sąlygos
          </h2>
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
            <span className="text-sm text-muted-foreground">Ieškoma...</span>
          </div>
        )}

        {!loading && results && results.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              Šiame sklype specialiųjų sąlygų nerasta.
            </p>
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Rasta: {results.length}
            </p>
            {results.map((r, i) => {
              const p = r.attributes || {};
              const salyga =
                p["SPECIALIOJI_SALYGA"] ||
                p["SPEC_SALYGA"] ||
                p["PAVADINIMAS"] ||
                p["PAVADINIM"] ||
                r.layerName ||
                "—";
              const kodas = p["KODAS"] || p["UNIK_NR"] || p["OBJECTID"] || "";
              const plotas = p["PLOTAS_HA"] || p["PLOTAS"] || "";
              const nuoroda = p["NUORODA"] || "";

              return (
                <div
                  key={i}
                  className="rounded-lg bg-muted/40 p-2.5 space-y-1"
                >
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {salyga}
                  </p>
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
