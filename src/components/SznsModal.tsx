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
    <div className="fixed top-0 left-0 bottom-0 w-[380px] z-[1100] flex flex-col bg-card border-r border-border shadow-2xl animate-slide-in-left max-sm:w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SŽNS</p>
          <h2 className="text-base font-display font-bold text-foreground mt-0.5">
            Specialiosios žemės naudojimo sąlygos
          </h2>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Ieškoma sąlygų...</span>
          </div>
        )}

        {!loading && results && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Šiame sklype specialiųjų sąlygų nerasta.
            </p>
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Rasta sąlygų: {results.length}
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
                  className="rounded-lg bg-muted/40 p-3 space-y-1.5"
                >
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {salyga}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Atidaryti aprašą
                    </a>
                  )}
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground mt-2">
              © NŽT / Registrų centras
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SznsModal;
