import React, { useState } from 'react';
import {
  CheckCircle2, Lock, Map, FileText, MapPin,
  Maximize, Calendar, Info, ShieldCheck, Unlock
} from 'lucide-react';

const MOCK_PARCEL = {
  cadastralNumber: "4400-1234-5678",
  unikalusNr: "4400-1234-5678-0001",
  area: "0.1500 ha",
  purpose: "Kitos paskirties žemė (Vienbučių ir dvibučių gyvenamųjų pastatų teritorijos)",
  address: "Gedimino pr. 1, Vilniaus m. sav.",
  formavimoData: "2015-05-20",
  coordinates: "54.687157, 25.279652"
};

function DataRow({ icon, label, value, isMono = false }: { icon: React.ReactNode; label: string; value: string; isMono?: boolean }) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/40 transition-colors">
      <div className="sm:w-1/3 flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <div className="w-4 h-4 opacity-70">{icon}</div>
        {label}
      </div>
      <div className={`sm:w-2/3 text-foreground ${isMono ? 'font-mono text-sm' : 'font-medium'}`}>
        {value || "N/A"}
      </div>
    </div>
  );
}

export default function Report1() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      setIsUnlocked(true);
      setIsUnlocking(false);
    }, 1500);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
          {/* Success Header */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900">Land Plot Found!</h2>
            <p className="text-emerald-700 font-medium">
              Record located in the National Registry for Cadastral No: <span className="font-bold">{MOCK_PARCEL.cadastralNumber}</span>
            </p>
          </div>

          {/* Teaser Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden relative">
            <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Report Preview
              </h3>
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Data
              </span>
            </div>

            {/* Blurred Content Area */}
            <div className="p-6 relative">
              <div className="filter blur-[6px] opacity-60 select-none pointer-events-none space-y-4">
                <div className="h-48 bg-muted rounded-lg w-full mb-6"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-muted/60 rounded"></div>
                  <div className="h-12 bg-muted/60 rounded"></div>
                  <div className="h-12 bg-muted/60 rounded"></div>
                  <div className="h-12 bg-muted/60 rounded"></div>
                </div>
              </div>

              {/* Overlay CTA */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-card via-card/90 to-transparent p-6 text-center">
                <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                <h4 className="text-xl font-bold text-foreground mb-2">Unlock Full Property Report</h4>
                <ul className="text-sm text-muted-foreground mb-6 space-y-2 text-left inline-block">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Exact Interactive Map Boundaries</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Registered Land Purpose & Area</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Exact Street Address & Coordinates</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unique Property Number</li>
                </ul>

                <button
                  onClick={handleUnlock}
                  disabled={isUnlocking}
                  className="w-full max-w-md premium-gradient text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isUnlocking ? (
                    <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Unlock className="w-5 h-5" />
                      Unlock Report (1 Credit)
                    </>
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-4">You have 12 credits remaining.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* Report Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Property Report</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Unlocked on {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="bg-muted/50 px-4 py-2 rounded-lg border border-border text-right">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Cadastral Number</p>
            <p className="text-lg font-mono font-bold text-primary">{MOCK_PARCEL.cadastralNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Map Placeholder */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[300px]">
              <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
                <Map className="w-4 h-4 text-muted-foreground" /> Map View
              </div>
              <div className="flex-1 bg-primary/5 flex items-center justify-center relative">
                <div className="text-center z-10">
                  <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Interactive Map Loaded</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Data Grid */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/50 font-semibold flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" /> Registry Details
            </div>

            <div className="divide-y divide-border">
              <DataRow icon={<FileText />} label="Unique Number" value={MOCK_PARCEL.unikalusNr} />
              <DataRow icon={<MapPin />} label="Exact Address" value={MOCK_PARCEL.address} />
              <DataRow icon={<Maximize />} label="Registered Area" value={MOCK_PARCEL.area} />
              <DataRow icon={<Info />} label="Land Purpose" value={MOCK_PARCEL.purpose} />
              <DataRow icon={<Calendar />} label="Formation Date" value={MOCK_PARCEL.formavimoData} />
              <DataRow icon={<Map />} label="Center Coordinates" value={MOCK_PARCEL.coordinates} isMono />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
