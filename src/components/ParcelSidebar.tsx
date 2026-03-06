import { X, MapPin, Ruler, Target, FileText, Lock, CreditCard, ChevronRight, Globe, MapPinned } from "lucide-react";

// WGS84 to LKS94 (EPSG:3346) approximate conversion using Transverse Mercator projection
const wgs84ToLks94 = (lat: number, lng: number): { x: number; y: number } => {
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const lat0 = 0;
  const lng0 = 24.0;
  const k0 = 0.9998;
  const falseE = 500000;
  const falseN = 0;

  const e2 = 2 * f - f * f;
  const e4 = e2 * e2;
  const e6 = e4 * e2;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi = toRad(lat);
  const lambda = toRad(lng);
  const phi0 = toRad(lat0);
  const lambda0 = toRad(lng0);

  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = (e2 / (1 - e2)) * Math.cos(phi) ** 2;
  const A = Math.cos(phi) * (lambda - lambda0);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));
  const M0 =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi0 -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi0) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi0) -
      ((35 * e6) / 3072) * Math.sin(6 * phi0));

  const x =
    falseE +
    k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * (e2 / (1 - e2))) * A ** 5) / 120);
  const y =
    falseN +
    k0 *
      (M -
        M0 +
        N *
          Math.tan(phi) *
          (A ** 2 / 2 +
            ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
            ((61 - 58 * T + T ** 2 + 600 * C - 330 * (e2 / (1 - e2))) * A ** 6) / 720));

  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
};

export interface ParcelData {
  cadastralNumber: string;
  unikalusNr?: string;
  area?: number;
  purpose?: string;
  address?: string;
  lat?: number;
  lng?: number;
  coordinates?: number[][][] | number[][][][]; // GeoJSON polygon/multipolygon coords
  formavimoData?: string;
}

interface ParcelSidebarProps {
  parcel: ParcelData | null;
  onClose: () => void;
  searchInput?: string;
  onGoToReport?: () => void;
}

// Land use purpose code to Lithuanian description mapping
const PURPOSE_MAP: Record<string, string> = {
  "110": "Vienbučių",
  "120": "Dvibučių",
  "140": "Daugiabučių",
  "150": "Įvairių socialinių grupių",
  "160": "Gyvenamųjų (butų)",
  "170": "Gyvenamoji (gyvenamųjų patalpų)",
  "202": "Viešbučių",
  "210": "Administracinių",
  "212": "Prekybos",
  "214": "Paslaugų",
  "216": "Maitinimo",
  "218": "Transporto",
  "220": "Garažų",
  "222": "Gamybos, pramonės",
  "224": "Sandėliavimo",
  "225": "Kultūros",
  "226": "Kultūros ir švietimo",
  "228": "Gydymo",
  "230": "Viešojo poilsio",
  "232": "Sporto",
  "234": "Religinių",
  "236": "Specialiųjų",
  "240": "Pagalbinio ūkio",
  "262": "Žemės ūkio",
  "264": "Žemės ūkio produkcijai tvarkyti",
  "266": "Mėgėjų sodų",
  "268": "Augalams auginti",
  "270": "Kita (pagalbinio ūkio)",
  "290": "Negyvenamoji",
  "291": "Bendro gyvenimo namų",
  "292": "Mokslo",
  "293": "Specialiųjų paslaugų",
  "294": "Gyvūnams auginti",
  "295": "Energetikos",
  "296": "Kitų pagalbinių",
  "297": "Asmeninio poilsio",
  "298": "Gamybos, pramonės",
  "410": "Kelių",
  "412": "Gatvių",
  "414": "Geležinkelių",
  "416": "Oro uostų",
  "418": "Vandens uostų",
  "440": "Kitų transporto statinių",
  "450": "Naftos tinklų",
  "452": "Dujų tinklų",
  "454": "Vandentiekio tinklų",
  "456": "Nuotekų šalinimo tinklų",
  "458": "Elektros tinklų",
  "460": "Ryšių (telekomunikacijų) tinklų",
  "470": "Šilumos tinklų",
  "490": "Kitų inžinerinių tinklų statinių",
  "498": "Energijos iš atsinaujinančių išteklių gamybos",
  "510": "Sporto",
  "530": "Hidrotechninių",
  "570": "Kiti inžineriniai statiniai (kiemo įrenginiai)",
  "590": "Kitos paskirties",
  "595": "Kiti inžineriniai statiniai (degalinių)",
  "610": "Žemės ūkio",
  "611": "Žemės ūkio (sodų)",
  "612": "Žemės ūkio",
  "710": "Miškų ūkio",
  "810": "Konservacinė",
  "820": "Vandens ūkio",
  "910": "Valstybinio vandenų fondo",
  "920": "Laisvos valstybinės žemės fondo",
  "940": "Kita (gyvenamosios teritorijos)",
  "950": "Kita (individualiems namams)",
  "952": "Kita (mažaaukščių teritorija)",
  "953": "Kita (daugiaaukščių teritorija)",
  "954": "Kita (daugiabučiams namams)",
  "956": "Kita (socialiniams objektams)",
  "957": "Kita (nuotekų valymo teritorija)",
  "958": "Kita (komunikacijoms)",
  "959": "Kita (inžinerinės infrastruktūros teritorija)",
  "960": "Kita (naudingosios iškasenos)",
  "966": "Kita (krašto apsaugos tikslams)",
  "967": "Kita (valstybės sienos apsaugai)",
  "968": "Kita (rekreaciniams statiniams)",
  "970": "Kita (pramoniniams statiniams)",
  "972": "Kita (komercinei veiklai)",
  "978": "Kita (atliekų saugojimui, utilizacijai)",
  "980": "Kita (specialiai paskirčiai)",
  "982": "Kita (savivaldybių poreikiams)",
  "990": "Kita (ne žemės ir ne miškų ūkio)",
  "992": "Kita (vandens telkinys)",
  "993": "Kita (infrastruktūros teritorija)",
  "994": "Kita (visuomeninės paskirties teritorija)",
  "995": "Kita",
  "996": "Kita (bendro naudojimo teritorijos)",
  "997": "Kita (atskirų želdynų teritorija)",
  "999": "Tarpinė",
};

const ParcelSidebar = ({ parcel, onClose, searchInput, onGoToReport }: ParcelSidebarProps) => {
  if (!parcel) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] z-[1000] animate-slide-in-right">
      <div className="h-full bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sklypas</p>
            <h2 className="text-lg font-display font-bold text-foreground mt-1">
              {searchInput || parcel.unikalusNr || parcel.cadastralNumber}
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
          {/* Go to report button */}
          {onGoToReport && (
            <button
              onClick={onGoToReport}
              className="w-full premium-gradient text-primary-foreground font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
            >
              <FileText className="h-4 w-4" />
              📄 Atidaryti išsamią ataskaitą
            </button>
          )}

          {/* Free Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-md premium-gradient flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground">Nemokama informacija</h3>
            </div>

            <div className="space-y-3">
              <InfoRow icon={<Target className="h-4 w-4" />} label="Unikalus Nr." value={parcel.unikalusNr || "—"} />
              <InfoRow icon={<Target className="h-4 w-4" />} label="Kadastrinis Nr." value={parcel.cadastralNumber} />
              {parcel.area && (
                <InfoRow
                  icon={<Ruler className="h-4 w-4" />}
                  label="Juridinis sklypo plotas"
                  value={`${parcel.area.toLocaleString("lt-LT")} ha.`}
                />
              )}
              {parcel.purpose && (
                <InfoRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Paskirtis"
                  value={`${PURPOSE_MAP[parcel.purpose] || "Nežinoma"}`}
                />
              )}
              {parcel.lat &&
                parcel.lng &&
                (() => {
                  const lks = wgs84ToLks94(parcel.lat, parcel.lng);
                  return (
                    <>
                      <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                        <div className="text-primary mt-0.5"><Globe className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Koordinatės</p>
                          <p className="text-sm font-medium text-foreground">
                            WGS84: {parcel.lat.toFixed(5)}, {parcel.lng.toFixed(5)}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            LKS94: {Math.round(lks.x)}, {Math.round(lks.y)}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              {parcel.address && (
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Adresas" value={parcel.address} />
              )}
              {parcel.formavimoData && (
                <InfoRow icon={<FileText className="h-4 w-4" />} label="Duomenų data" value={parcel.formavimoData} />
              )}
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
