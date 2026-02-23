import { X, MapPin, Ruler, Target, FileText, Lock, CreditCard, ChevronRight, Triangle } from "lucide-react";
import { useMemo } from "react";

export interface ParcelData {
  cadastralNumber: string;
  unikalusNr?: string;
  area?: number;
  purpose?: string;
  address?: string;
  lat?: number;
  lng?: number;
  coordinates?: number[][][] | number[][][][]; // GeoJSON polygon/multipolygon coords
}

interface ParcelSidebarProps {
  parcel: ParcelData | null;
  onClose: () => void;
}

// Compute geodesic area from WGS84 polygon coordinates using the spherical excess formula
const computeGeodesicArea = (coords: number[][][]): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  let totalArea = 0;

  for (const ring of coords) {
    const n = ring.length;
    if (n < 3) continue;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[(i + 1) % n];
      sum += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
    }
    totalArea += Math.abs(sum) / 2;
  }

  const R = 6371000; // Earth radius in meters
  return totalArea * R * R;
};

const ParcelSidebar = ({ parcel, onClose }: ParcelSidebarProps) => {
  const calculatedArea = useMemo(() => {
    if (!parcel?.coordinates) return null;
    // Handle both Polygon and MultiPolygon
    const isMulti = Array.isArray(parcel.coordinates[0]?.[0]?.[0]);
    if (isMulti) {
      return (parcel.coordinates as number[][][][]).reduce(
        (sum, poly) => sum + computeGeodesicArea(poly),
        0
      );
    }
    return computeGeodesicArea(parcel.coordinates as number[][][]);
  }, [parcel?.coordinates]);

  if (!parcel) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] z-[1000] animate-slide-in-right">
      <div className="h-full bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sklypas</p>
            <h2 className="text-lg font-display font-bold text-foreground mt-1">
              {parcel.unikalusNr || parcel.cadastralNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Free Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-md premium-gradient flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground">Nemokama informacija</h3>
            </div>

            <div className="space-y-3">
              <InfoRow icon={<Target className="h-4 w-4" />} label="Kadastrinis Nr." value={parcel.cadastralNumber} />
              {parcel.area && (
                <InfoRow
                  icon={<Ruler className="h-4 w-4" />}
                  label="Juridinis sklypo plotas"
                  value={`${parcel.area.toLocaleString("lt-LT")} m²`}
                />
              )}
              {calculatedArea !== null && (
                <InfoRow
                  icon={<Triangle className="h-4 w-4" />}
                  label="Plotas pagal koordinates"
                  value={`${Math.round(calculatedArea).toLocaleString("lt-LT")} m²`}
                />
              )}
              {parcel.purpose && (
                <InfoRow icon={<FileText className="h-4 w-4" />} label="Paskirtis" value={parcel.purpose} />
              )}
              {parcel.address && (
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Adresas" value={parcel.address} />
              )}
              {parcel.lat && parcel.lng && (
                <InfoRow
                  icon={<Target className="h-4 w-4" />}
                  label="Koordinatės"
                  value={`${parcel.lat.toFixed(5)}, ${parcel.lng.toFixed(5)}`}
                />
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Premium Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <h3 className="font-display font-semibold text-foreground">Išsami analizė</h3>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gaukite aktualią ir išsamią sklypo informaciją: savininko apribojimai, specialiosios naudojimo sąlygos,
                naujausi pokyčiai ir kt.
              </p>

              <ul className="space-y-2">
                {[
                  "Savininko apribojimai",
                  "Specialiosios žemės naudojimo sąlygos",
                  "Naujausi įregistruoti pokyčiai",
                  "Detalūs teritorijų planavimo duomenys",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <ChevronRight className="h-3.5 w-3.5 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <button className="w-full premium-gradient text-primary-foreground font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-3 hover:opacity-90 transition-opacity text-sm">
                <CreditCard className="h-4 w-4" />
                Atrakinti už 2,99 €
              </button>

              <p className="text-xs text-muted-foreground text-center">Saugus mokėjimas per Stripe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
    <div className="text-primary mt-0.5">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-all">{value}</p>
    </div>
  </div>
);

export default ParcelSidebar;
