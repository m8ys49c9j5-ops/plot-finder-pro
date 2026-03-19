import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Layers, MapPin, Bookmark,
  BookmarkCheck, Trash2, ExternalLink, Loader2, Clock,
} from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";
const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";

interface HistoryEntry {
  id: string;
  cadastral_number: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_unlocked: boolean;
  search_method: string | null;
  created_at: string;
}

interface BookmarkEntry {
  cadastral_number: string;
}

const METHOD_LABELS: Record<string, string> = {
  cadastral: "Kadastras",
  map_click: "Žemėlapis",
  coordinates: "Koordinatės",
};

function MapThumb({ lat, lng }: { lat: number; lng: number }) {
  const toMerc = (lat: number, lng: number) => {
    const x = (lng * 20037508.34) / 180;
    const y =
      (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) *
      20037508.34 /
      180;
    return { x, y };
  };
  const center = toMerc(lat, lng);
  const span = 600;
  const bbox = `${center.x - span},${center.y - span},${center.x + span},${center.y + span}`;
  const baseUrl = `${GEOPORTAL_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=192,192&format=jpg&transparent=false&f=image`;
  const kadUrl = `${KADASTRAS_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=192,192&format=png32&transparent=true&f=image&layers=${encodeURIComponent("show:15,21,27,33")}`;
  const proxyBase = `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(baseUrl)}`;
  const proxyKad = `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(kadUrl)}`;

  return (
    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative bg-muted">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${proxyBase})` }} />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${proxyKad})` }} />
    </div>
  );
}

export default function UserHistory() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<"all" | "unlocked" | "bookmarked">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [historyRes, bookmarksRes] = await Promise.all([
        supabase
          .from("search_history")
          .select("id, cadastral_number, address, lat, lng, is_unlocked, search_method, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("bookmarks")
          .select("cadastral_number")
          .eq("user_id", user.id),
      ]);

      if (historyRes.data) setEntries(historyRes.data as HistoryEntry[]);
      if (bookmarksRes.data) {
        setBookmarks(new Set(bookmarksRes.data.map((b: BookmarkEntry) => b.cadastral_number)));
      }
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);
    if (error) {
      toast.error("Nepavyko ištrinti įrašo");
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Įrašas ištrintas");
    }
    setDeletingId(null);
  };

  const handleBookmarkToggle = async (entry: HistoryEntry) => {
    const isBookmarked = bookmarks.has(entry.cadastral_number);
    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user!.id)
        .eq("cadastral_number", entry.cadastral_number);
      setBookmarks((prev) => {
        const next = new Set(prev);
        next.delete(entry.cadastral_number);
        return next;
      });
      toast.success("Išsaugojimas pašalintas");
    } else {
      await supabase.from("bookmarks").upsert({
        user_id: user!.id,
        cadastral_number: entry.cadastral_number,
        address: entry.address,
        lat: entry.lat,
        lng: entry.lng,
      });
      setBookmarks((prev) => new Set([...prev, entry.cadastral_number]));
      toast.success("Išsaugota");
    }
  };

  const handleOpenReport = (entry: HistoryEntry) => {
    navigate("/", {
      state: {
        openReport: {
          cadastralNumber: entry.cadastral_number,
          address: entry.address,
          lat: entry.lat,
          lng: entry.lng,
        },
      },
    });
  };

  const filtered = entries.filter((e) => {
    if (filter === "unlocked") return e.is_unlocked;
    if (filter === "bookmarked") return bookmarks.has(e.cadastral_number);
    return true;
  });

  const grouped: Record<string, HistoryEntry[]> = {};
  for (const entry of filtered) {
    const month = new Date(entry.created_at).toLocaleDateString("lt-LT", {
      year: "numeric",
      month: "long",
    });
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(entry);
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </button>
          <h1 className="text-lg font-bold text-foreground">Mano Paieškos</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "Visos" },
            { key: "unlocked", label: "Atrakinta" },
            { key: "bookmarked", label: "Išsaugota" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} įrašai
          </span>
        </div>

        {/* Grouped entries */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Paieškų istorija tuščia</h2>
            <p className="text-sm text-muted-foreground">Pradėkite ieškoti sklypų žemėlapyje</p>
          </div>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <div key={month} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {month}
              </h3>
              <div className="space-y-2">
                {items.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
                  >
                    {entry.lat && entry.lng ? (
                      <MapThumb lat={entry.lat} lng={entry.lng} />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-foreground text-sm">
                          {entry.cadastral_number}
                        </span>
                        {entry.is_unlocked && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            Atrakinta
                          </span>
                        )}
                        {entry.search_method && (
                          <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {METHOD_LABELS[entry.search_method] ?? entry.search_method}
                          </span>
                        )}
                      </div>
                      {entry.address && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.address}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleString("lt-LT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleBookmarkToggle(entry)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title={bookmarks.has(entry.cadastral_number) ? "Pašalinti iš išsaugotų" : "Išsaugoti"}
                      >
                        {bookmarks.has(entry.cadastral_number) ? (
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenReport(entry)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Atidaryti ataskaitą"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Ištrinti"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
