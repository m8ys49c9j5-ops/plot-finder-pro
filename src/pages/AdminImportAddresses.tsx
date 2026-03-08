import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Database, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BATCH_SIZE = 500;

type UploadStatus = "idle" | "parsing" | "uploading" | "done" | "error";

export default function AdminImportAddresses() {
  const navigate = useNavigate();
  const [streetsFile, setStreetsFile] = useState<File | null>(null);
  const [addressesFile, setAddressesFile] = useState<File | null>(null);
  const [pointsFile, setPointsFile] = useState<File | null>(null);

  const [streetsStatus, setStreetsStatus] = useState<UploadStatus>("idle");
  const [addressesStatus, setAddressesStatus] = useState<UploadStatus>("idle");
  const [pointsStatus, setPointsStatus] = useState<UploadStatus>("idle");
  const [buildStatus, setBuildStatus] = useState<UploadStatus>("idle");

  const [streetsCount, setStreetsCount] = useState(0);
  const [addressesCount, setAddressesCount] = useState(0);
  const [pointsCount, setPointsCount] = useState(0);

  const uploadBatches = async (
    tableName: string,
    rows: Record<string, any>[],
    setStatus: (s: UploadStatus) => void,
    setCount: (n: number) => void,
  ) => {
    setStatus("uploading");
    let total = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await (supabase.from(tableName) as any).upsert(batch, {
        onConflict: Object.keys(batch[0])[0],
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`Batch error (${tableName}):`, error.message);
        toast.error(`Klaida įkeliant ${tableName}: ${error.message}`);
        setStatus("error");
        return;
      }
      total += batch.length;
      setCount(total);
    }
    setStatus("done");
    toast.success(`${tableName}: įkelta ${total} įrašų`);
  };

  const handleUploadStreets = useCallback(async () => {
    if (!streetsFile) return;
    setStreetsStatus("parsing");
    Papa.parse(streetsFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((r: any) => ({
          gat_kodas: r.GAT_KODAS || r.gat_kodas,
          tipas: r.TIPAS || r.tipas || null,
          tipo_santrumpa: r.TIPO_SANTRUMPA || r.tipo_santrumpa || null,
          vardas_k: r.VARDAS_K || r.vardas_k || null,
        })).filter((r: any) => r.gat_kodas);
        await uploadBatches("raw_streets", rows, setStreetsStatus, setStreetsCount);
      },
      error: () => { setStreetsStatus("error"); toast.error("CSV parsing klaida (gatvės)"); },
    });
  }, [streetsFile]);

  const handleUploadAddresses = useCallback(async () => {
    if (!addressesFile) return;
    setAddressesStatus("parsing");
    Papa.parse(addressesFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((r: any) => ({
          aob_kodas: r.AOB_KODAS || r.aob_kodas,
          gat_kodas: r.GAT_KODAS || r.gat_kodas || null,
          nr: r.NR || r.nr || null,
        })).filter((r: any) => r.aob_kodas);
        await uploadBatches("raw_addresses", rows, setAddressesStatus, setAddressesCount);
      },
      error: () => { setAddressesStatus("error"); toast.error("CSV parsing klaida (adresai)"); },
    });
  }, [addressesFile]);

  const handleUploadPoints = useCallback(async () => {
    if (!pointsFile) return;
    setPointsStatus("parsing");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const features = json.features || json;
        const rows = (Array.isArray(features) ? features : []).map((f: any) => {
          const p = f.properties || f;
          return {
            aob_kodas: String(p.AOB_KODAS || p.aob_kodas),
            x_koord: parseFloat(p.X_KOORD || p.x_koord || p.E_KOORD || p.e_koord),
            y_koord: parseFloat(p.Y_KOORD || p.y_koord || p.N_KOORD || p.n_koord),
          };
        }).filter((r: any) => r.aob_kodas && !isNaN(r.x_koord) && !isNaN(r.y_koord));
        await uploadBatches("raw_points", rows, setPointsStatus, setPointsCount);
      } catch {
        setPointsStatus("error");
        toast.error("JSON parsing klaida (taškai)");
      }
    };
    reader.readAsText(pointsFile);
  }, [pointsFile]);

  const handleBuild = async () => {
    setBuildStatus("uploading");
    try {
      const { error } = await (supabase.rpc as any)("build_official_addresses");
      if (error) throw error;
      setBuildStatus("done");
      toast.success("Official addresses lentelė sukurta sėkmingai!");
    } catch (err: any) {
      setBuildStatus("error");
      toast.error(err.message || "Klaida kuriant adresų lentelę");
    }
  };

  const StatusBadge = ({ status, count }: { status: UploadStatus; count?: number }) => {
    if (status === "idle") return null;
    if (status === "parsing") return <span className="text-xs text-amber-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Analizuojama...</span>;
    if (status === "uploading") return <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Įkeliama... {count || 0}</span>;
    if (status === "done") return <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Baigta ({count})</span>;
    if (status === "error") return <span className="text-xs text-red-600">Klaida</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Adresų importas</h1>
        </div>

        {/* Streets */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> 1. Gatvės (CSV)
            </h3>
            <StatusBadge status={streetsStatus} count={streetsCount} />
          </div>
          <p className="text-xs text-muted-foreground">Stulpeliai: GAT_KODAS, TIPAS, TIPO_SANTRUMPA, VARDAS_K</p>
          <input type="file" accept=".csv" onChange={(e) => setStreetsFile(e.target.files?.[0] || null)} className="text-sm" />
          <button onClick={handleUploadStreets} disabled={!streetsFile || streetsStatus === "uploading"}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
            Įkelti gatves
          </button>
        </div>

        {/* Addresses */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> 2. Adresai (CSV)
            </h3>
            <StatusBadge status={addressesStatus} count={addressesCount} />
          </div>
          <p className="text-xs text-muted-foreground">Stulpeliai: AOB_KODAS, GAT_KODAS, NR</p>
          <input type="file" accept=".csv" onChange={(e) => setAddressesFile(e.target.files?.[0] || null)} className="text-sm" />
          <button onClick={handleUploadAddresses} disabled={!addressesFile || addressesStatus === "uploading"}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
            Įkelti adresus
          </button>
        </div>

        {/* Points */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> 3. Taškai (JSON/GeoJSON)
            </h3>
            <StatusBadge status={pointsStatus} count={pointsCount} />
          </div>
          <p className="text-xs text-muted-foreground">Laukai: AOB_KODAS, X_KOORD, Y_KOORD</p>
          <input type="file" accept=".json,.geojson" onChange={(e) => setPointsFile(e.target.files?.[0] || null)} className="text-sm" />
          <button onClick={handleUploadPoints} disabled={!pointsFile || pointsStatus === "uploading"}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
            Įkelti taškus
          </button>
        </div>

        {/* Build */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" /> 4. Sukurti oficialių adresų lentelę
            </h3>
            <StatusBadge status={buildStatus} />
          </div>
          <p className="text-xs text-muted-foreground">Sujungia gatves + adresus + taškus į vieną erdvinę lentelę</p>
          <button onClick={handleBuild}
            disabled={buildStatus === "uploading"}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {buildStatus === "uploading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Build Official Addresses
          </button>
        </div>
      </div>
    </div>
  );
}
