import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Layers, MapPin,
  Bookmark, BookmarkCheck, Trash2, ExternalLink,
  Loader2, Clock, Search as SearchIcon, User,
  Calendar, BarChart2, LogOut, Coins, ChevronDown, ChevronUp, Navigation, Share2,
} from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";
const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";

function buildMapThumbUrls(lat: number, lng: number) {
  const toMerc = (lat: number, lng: number) => {
    const x = lng * 20037508.34 / 180;
    const y = Math.log(Math.tan((90 + lat) * Math.PI / 360))
      / (Math.PI / 180) * 20037508.34 / 180;
    return { x, y };
  };
  const c = toMerc(lat, lng);
  const span = 600;
  const bbox = `${c.x - span},${c.y - span},${c.x + span},${c.y + span}`;
  const size = "128,128";
  const proxy = (url: string) =>
    `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(url)}`;
  return {
    base: proxy(`${GEOPORTAL_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size}&format=jpg&transparent=false&f=image`),
    kad: proxy(`${KADASTRAS_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size}&format=png32&transparent=true&f=image&layers=${encodeURIComponent("show:15,21,27,33")}`),
  };
}

function MapThumb({ lat, lng }: { lat: number; lng: number }) {
  const { base, kad } = buildMapThumbUrls(lat, lng);
  return (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
      <img src={base} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <img src={kad} alt="" className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
}

interface AccountSummary {
  email: string;
  registered_at: string;
  total_searches: number;
  credits_remaining: number;
}

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
  id: string;
  cadastral_number: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

const METHOD_LABELS: Record<string, string> = {
  cadastral: "Kadastras",
  map_click: "Žemėlapis",
  coordinates: "Koordinatės",
};

type TabType = "history" | "bookmarks";
type FilterType = "all" | "unlocked";

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signOut, credits } = useAuth();

  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [bookmarkSet, setBookmarkSet] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [filter, setFilter] = useState<FilterType>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [summaryRes, historyRes, bookmarksRes] = await Promise.all([
        supabase.rpc("my_account_summary", { p_user_id: user.id } as any),
        supabase
          .from("search_history")
          .select("id, cadastral_number, address, lat, lng, is_unlocked, search_method, created_at")
          .eq("user_id", user.id)
          .eq("is_anonymous", false)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("bookmarks")
          .select("id, cadastral_number, address, lat, lng, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (summaryRes.data?.[0]) setSummary(summaryRes.data[0] as unknown as AccountSummary);
      if (historyRes.data) setHistory(historyRes.data as HistoryEntry[]);
      if (bookmarksRes.data) {
        setBookmarks(bookmarksRes.data as BookmarkEntry[]);
        setBookmarkSet(new Set(bookmarksRes.data.map((b: BookmarkEntry) => b.cadastral_number)));
      }
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteHistory = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);
    if (error) toast.error("Nepavyko ištrinti");
    else {
      setHistory(prev => prev.filter(e => e.id !== id));
      toast.success("Įrašas ištrintas");
    }
    setDeletingId(null);
  };

  const handleBookmarkToggle = async (entry: HistoryEntry) => {
    const isBookmarked = bookmarkSet.has(entry.cadastral_number);
    if (isBookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user!.id).eq("cadastral_number", entry.cadastral_number);
      setBookmarkSet(prev => { const n = new Set(prev); n.delete(entry.cadastral_number); return n; });
      setBookmarks(prev => prev.filter(b => b.cadastral_number !== entry.cadastral_number));
      toast.success("Išsaugojimas pašalintas");
    } else {
      await supabase.from("bookmarks").upsert({
        user_id: user!.id,
        cadastral_number: entry.cadastral_number,
        address: entry.address,
        lat: entry.lat,
        lng: entry.lng,
      });
      setBookmarkSet(prev => new Set([...prev, entry.cadastral_number]));
      setBookmarks(prev => [{
        id: crypto.randomUUID(),
        cadastral_number: entry.cadastral_number,
        address: entry.address,
        lat: entry.lat,
        lng: entry.lng,
        created_at: new Date().toISOString(),
      }, ...prev]);
      toast.success("Išsaugota");
    }
  };

  const handleRemoveBookmark = async (cadastral: string) => {
    await supabase.from("bookmarks").delete().eq("user_id", user!.id).eq("cadastral_number", cadastral);
    setBookmarkSet(prev => { const n = new Set(prev); n.delete(cadastral); return n; });
    setBookmarks(prev => prev.filter(b => b.cadastral_number !== cadastral));
    toast.success("Pašalinta iš išsaugotų");
  };

  const handleOpenReport = (cadastralNumber: string, lat?: number | null, lng?: number | null, address?: string | null) => {
    navigate("/map", { state: { openReport: { cadastralNumber, lat, lng, address } } });
  };

  const handleOpenOnMap = (cadastralNumber: string) => {
    navigate(`/map?q=${encodeURIComponent(cadastralNumber)}`);
  };

  const handleShare = (cadastralNumber: string) => {
    const url = `${window.location.origin}/map?q=${encodeURIComponent(cadastralNumber)}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Nuoroda nukopijuota!");
    }).catch(() => {
      toast.error("Nepavyko nukopijuoti nuorodos");
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredHistory = history.filter(e => filter === "unlocked" ? e.is_unlocked : true);

  const grouped: Record<string, HistoryEntry[]> = {};
  for (const e of filteredHistory) {
    const month = new Date(e.created_at).toLocaleDateString("lt-LT", { year: "numeric", month: "long" });
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(e);
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
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Atsijungti
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Profile card */}
        {summary && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{summary.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Registruotas {new Date(summary.registered_at).toLocaleDateString("lt-LT", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{summary.total_searches}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <BarChart2 className="h-3 w-3" /> Viso paieškų
                </p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-2xl font-bold text-foreground">{credits}</p>
                  <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full">🔒 Netrukus</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Coins className="h-3 w-3" /> Kreditai
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mokamos versijos funkcija (netrukus)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex border-b border-border mb-4">
          {([
            { key: "history" as const, label: "Paieškų istorija", icon: Clock },
            { key: "bookmarks" as const, label: "Išsaugota", icon: Bookmark },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* HISTORY tab */}
        {activeTab === "history" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              {([
                { key: "all" as const, label: "Visos" },
                { key: "unlocked" as const, label: "Atrakinta" },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
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
                {filteredHistory.length} įrašai
              </span>
            </div>

            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-foreground">Paieškų istorija tuščia</p>
                <p className="text-sm text-muted-foreground mt-1">Pradėkite ieškoti sklypų žemėlapyje</p>
                <button
                  onClick={() => navigate("/")}
                  className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Atidaryti žemėlapį
                </button>
              </div>
            ) : (
              Object.entries(grouped).map(([month, items]) => (
                <div key={month} className="mb-6">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {month}
                  </div>
                    {items.map(entry => {
                      const isExpanded = expandedId === entry.id;
                      return (
                      <div key={entry.id} className="rounded-xl hover:bg-muted/40 transition-colors mb-1.5 border border-transparent hover:border-border">
                        <div
                          className="flex items-center gap-3 p-3.5 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          {entry.lat && entry.lng
                            ? <MapThumb lat={entry.lat} lng={entry.lng} />
                            : (
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <MapPin className="h-5 w-5 text-muted-foreground/40" />
                              </div>
                            )
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-base font-semibold text-foreground">
                                {entry.cadastral_number}
                              </span>
                              {entry.is_unlocked && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                  Atrakinta
                                </span>
                              )}
                            </div>
                            {entry.address && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">{entry.address}</p>
                            )}
                            <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(entry.created_at).toLocaleString("lt-LT", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                              {entry.search_method && (
                                <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {METHOD_LABELS[entry.search_method] ?? entry.search_method}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            }
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-0 border-t border-border/50 mt-0">
                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                              {entry.lat != null && entry.lng != null && (
                                <div className="bg-muted/50 rounded-lg p-2">
                                  <span className="font-medium text-foreground block">Koordinatės</span>
                                  {entry.lat.toFixed(5)}, {entry.lng.toFixed(5)}
                                </div>
                              )}
                              <div className="bg-muted/50 rounded-lg p-2">
                                <span className="font-medium text-foreground block">Būsena</span>
                                {entry.is_unlocked ? "Atrakinta" : "Neperžiūrėta"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenOnMap(entry.cadastral_number); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                Rodyti žemėlapyje
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleShare(entry.cadastral_number); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                                Dalintis
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleBookmarkToggle(entry); }}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                title={bookmarkSet.has(entry.cadastral_number) ? "Pašalinti" : "Išsaugoti"}
                              >
                                {bookmarkSet.has(entry.cadastral_number)
                                  ? <BookmarkCheck className="h-4 w-4 text-primary" />
                                  : <Bookmark className="h-4 w-4 text-muted-foreground" />
                                }
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteHistory(entry.id); }}
                                disabled={deletingId === entry.id}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors ml-auto"
                                title="Ištrinti"
                              >
                                {deletingId === entry.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4 text-muted-foreground" />
                                }
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                </div>
              ))
            )}
          </div>
        )}

        {/* BOOKMARKS tab */}
        {activeTab === "bookmarks" && (
          <div>
            {bookmarks.length === 0 ? (
              <div className="text-center py-16">
                <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-foreground">Nėra išsaugotų sklypų</p>
                <p className="text-sm text-muted-foreground mt-1">Spauskite žymeklio ikoną paieškų istorijoje, kad išsaugotumėte</p>
              </div>
            ) : (
              bookmarks.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors mb-1">
                  {b.lat && b.lng
                    ? <MapThumb lat={b.lat} lng={b.lng} />
                    : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {b.cadastral_number}
                    </p>
                    {b.address && (
                      <p className="text-xs text-muted-foreground truncate">{b.address}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Išsaugota {new Date(b.created_at).toLocaleDateString("lt-LT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleOpenReport(b.cadastral_number, b.lat, b.lng, b.address)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Atidaryti ataskaitą"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleRemoveBookmark(b.cadastral_number)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Pašalinti"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
