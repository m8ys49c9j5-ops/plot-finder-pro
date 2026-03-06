import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, MapPin, Ruler, Target, FileText, Globe, Calendar } from "lucide-react";
import type { ParcelPreviewData } from "./ParcelPreview";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";

// WGS84 to LKS94
const wgs84ToLks94 = (lat: number, lng: number): { x: number; y: number } => {
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi = toRad(lat);
  const lambda = toRad(lng);
  const phi0 = toRad(0);
  const lambda0 = toRad(24.0);
  const k0 = 0.9998;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = (e2 / (1 - e2)) * Math.cos(phi) ** 2;
  const A = Math.cos(phi) * (lambda - lambda0);
  const M = a * ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi - ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) - ((35 * e6) / 3072) * Math.sin(6 * phi));
  const M0 = a * ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi0 - ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi0) + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi0) - ((35 * e6) / 3072) * Math.sin(6 * phi0));
  const x = 500000 + k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * (e2 / (1 - e2))) * A ** 5) / 120);
  const y = 0 + k0 * (M - M0 + N * Math.tan(phi) * (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * (e2 / (1 - e2))) * A ** 6) / 720));
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
};

const PURPOSE_MAP: Record<string, string> = {
  "110": "Vienbučių", "120": "Dvibučių", "140": "Daugiabučių",
  "210": "Administracinių", "212": "Prekybos", "214": "Paslaugų",
  "222": "Gamybos, pramonės", "224": "Sandėliavimo", "262": "Žemės ūkio",
  "264": "Žemės ūkio produkcijai tvarkyti", "266": "Mėgėjų sodų",
  "290": "Negyvenamoji", "610": "Žemės ūkio", "710": "Miškų ūkio",
  "810": "Konservacinė", "820": "Vandens ūkio", "990": "Kita",
  "995": "Kita", "999": "Tarpinė",
};

interface ParcelReportProps {
  parcel: ParcelPreviewData;
  onClose: () => void;
  wasAlreadyUnlocked: boolean;
}

const KadastroTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    const tileSize = 256;
    const map = (this as any)._map as L.Map;
    const nwPoint = coords.scaleBy(new L.Point(tileSize, tileSize));
    const sePoint = nwPoint.add(new L.Point(tileSize, tileSize));
    const nw = map.unproject(nwPoint, coords.z);
    const se = map.unproject(sePoint, coords.z);
    const nwMerc = L.CRS.EPSG3857.project(nw);
    const seMerc = L.CRS.EPSG3857.project(se);
    const bbox = `${nwMerc.x},${seMerc.y},${seMerc.x},${nwMerc.y}`;
    const exportUrl = `${KADASTRAS_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${tileSize},${tileSize}&format=png32&transparent=true&f=image&layers=${encodeURIComponent("show:15,21,27,33")}`;
    return `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(exportUrl)}`;
  },
});

const ParcelReport = ({ parcel, onClose, wasAlreadyUnlocked }: ParcelReportProps) => {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!miniMapRef.current || mapInstanceRef.current) return;

    const center: L.LatLngExpression = parcel.lat && parcel.lng
      ? [parcel.lat, parcel.lng]
      : [55.17, 23.88];

    const map = L.map(miniMapRef.current, {
      center,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    new (KadastroTileLayer as any)("", { maxZoom: 19, opacity: 0.85 }).addTo(map);

    // Draw parcel boundary
    if (parcel.coordinates) {
      try {
        const geojsonFeature: any = {
          type: "Feature",
          geometry: {
            type: parcel.coordinates[0]?.[0]?.[0] !== undefined &&
              Array.isArray(parcel.coordinates[0]?.[0]?.[0])
              ? "MultiPolygon"
              : "Polygon",
            coordinates: parcel.coordinates,
          },
        };
        const layer = L.geoJSON(geojsonFeature, {
          style: { color: "hsl(0, 84%, 50%)", weight: 3, fillColor: "hsl(0, 84%, 50%)", fillOpacity: 0.12 },
        }).addTo(map);
        map.fitBounds(layer.getBounds(), { padding: [30, 30] });
      } catch (e) {
        console.error("Mini map GeoJSON error:", e);
      }
    }

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [parcel]);

  const lks = parcel.lat && parcel.lng ? wgs84ToLks94(parcel.lat, parcel.lng) : null;

  const dataRows = [
    { icon: Target, label: "Kadastrinis Nr.", value: parcel.cadastralNumber },
    { icon: Target, label: "Unikalus Nr.", value: parcel.unikalusNr || "—" },
    {
      icon: Ruler,
      label: "Juridinis plotas",
      value: parcel.area ? `${parcel.area.toLocaleString("lt-LT")} ha` : "—",
    },
    {
      icon: FileText,
      label: "Paskirtis",
      value: parcel.purpose ? (PURPOSE_MAP[parcel.purpose] || parcel.purpose) : "—",
    },
    { icon: MapPin, label: "Adresas", value: parcel.address || "—" },
    { icon: Calendar, label: "Formavimo data", value: parcel.formavimoData || "—" },
  ];

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-[1000] animate-in slide-in-from-right duration-300">
      <div className="h-full bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              {wasAlreadyUnlocked && (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Atrakinta anksčiau
                </span>
              )}
            </div>
            <h2 className="text-lg font-display font-bold text-foreground mt-1">
              Sklypo ataskaita
            </h2>
            <p className="text-xs text-muted-foreground">{parcel.cadastralNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Mini map */}
          <div className="h-56 w-full border-b border-border" ref={miniMapRef} />

          {/* Data grid */}
          <div className="p-5 space-y-2">
            {dataRows.map((row) => (
              <div key={row.label} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                <div className="text-primary mt-0.5">
                  <row.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-sm font-semibold text-foreground break-all">{row.value}</p>
                </div>
              </div>
            ))}

            {/* Coordinates */}
            {parcel.lat && parcel.lng && (
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                <div className="text-primary mt-0.5">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Koordinatės</p>
                  <p className="text-sm font-semibold text-foreground">
                    WGS84: {parcel.lat.toFixed(5)}, {parcel.lng.toFixed(5)}
                  </p>
                  {lks && (
                    <p className="text-sm font-semibold text-foreground">
                      LKS94: {Math.round(lks.x)}, {Math.round(lks.y)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParcelReport;
