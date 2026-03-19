import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ArrowLeft, Layers, Users, Search, TrendingUp, Euro, ShoppingCart, Percent, Loader2, ChevronLeft, ChevronRight, X, Mail, CheckCircle2, XCircle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── CHANGE THIS LIST to your actual admin emails ──────────────────────────────
const ADMIN_EMAILS = ["admin@zemepro.lt", "aidasaleksonis@gmail.com"];

interface KPI {
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  total_searches: number;
  searches_today: number;
  registered_searches: number;
  anonymous_searches: number;
  total_revenue: number;
  revenue_this_month: number;
  users_who_purchased: number;
  conversion_rate: number;
}

interface DailySearch {
  day: string;
  registered_count: number;
  anonymous_count: number;
}
interface DailySignup {
  day: string;
  signups: number;
}
interface DailyRevenue {
  day: string;
  revenue: number;
  credits_sold: number;
}
interface TierRevenue {
  tier: string;
  total_sold: number;
  total_revenue: number;
}
interface TopLocation {
  address: string;
  search_count: number;
}
interface TopCadastral {
  cadastral_number: string;
  search_count: number;
}

interface UserRow {
  user_id: string;
  email: string;
  registered_at: string;
  last_active: string;
  total_searches: number;
  searches_last_30d: number;
  credits_remaining: number;
  total_spent: number;
  ever_purchased: boolean;
  total_count: number;
}

interface UserSearchEntry {
  id: string;
  cadastral_number: string;
  address: string | null;
  is_unlocked: boolean;
  search_method: string | null;
  created_at: string;
}

const TIER_LABELS: Record<string, string> = {
  tier1: "Starteris (1kr)",
  tier2: "Populiarus (10kr)",
  tier3: "Profesionalus (30kr)",
};

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-foreground mt-8 mb-4">{children}</h2>;
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [kpi, setKpi] = useState<KPI | null>(null);
  const [dailySearches, setDailySearches] = useState<DailySearch[]>([]);
  const [dailySignups, setDailySignups] = useState<DailySignup[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [tierRevenue, setTierRevenue] = useState<TierRevenue[]>([]);
  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);
  const [topCadastral, setTopCadastral] = useState<TopCadastral[]>([]);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");

  // User table state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userFilter, setUserFilter] = useState<boolean | null>(null);
  const [userSort, setUserSort] = useState("last_active");
  const [usersLoading, setUsersLoading] = useState(false);
  // Slide-in panel state
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userSearches, setUserSearches] = useState<UserSearchEntry[]>([]);
  const [userSearchesLoading, setUserSearchesLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
      navigate("/");
      return;
    }
    setAuthorized(true);
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      setFetching(true);
      const [kpiRes, searchRes, signupRes, revenueRes, tierRes, locationRes, cadastralRes] = await Promise.all([
        supabase.rpc("admin_kpi_summary"),
        supabase.rpc("admin_daily_searches", { p_days: 30 }),
        supabase.rpc("admin_daily_signups", { p_days: 30 }),
        supabase.rpc("admin_daily_revenue", { p_days: 30 }),
        supabase.rpc("admin_credits_by_tier"),
        supabase.rpc("admin_top_locations", { p_limit: 10 }),
        supabase.rpc("admin_top_cadastral", { p_limit: 10 }),
      ]);

      if (kpiRes.data?.[0]) setKpi(kpiRes.data[0] as KPI);
      if (searchRes.data) setDailySearches(searchRes.data as DailySearch[]);
      if (signupRes.data) setDailySignups(signupRes.data as DailySignup[]);
      if (revenueRes.data) setDailyRevenue(revenueRes.data as DailyRevenue[]);
      if (tierRes.data) setTierRevenue(tierRes.data as TierRevenue[]);
      if (locationRes.data) setTopLocations(locationRes.data as TopLocation[]);
      if (cadastralRes.data) setTopCadastral(cadastralRes.data as TopCadastral[]);
      setFetching(false);
    })();
  }, [authorized]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data } = await supabase.rpc("admin_user_list", {
      p_limit: 25,
      p_offset: userPage * 25,
      p_search_email: userSearch || null,
      p_filter_purchased: userFilter,
      p_sort_by: userSort,
    } as any);
    if (data) {
      setUsers(data as unknown as UserRow[]);
      setUserTotal((data as unknown as UserRow[])[0]?.total_count ?? 0);
    }
    setUsersLoading(false);
  }, [userPage, userSearch, userFilter, userSort]);

  useEffect(() => {
    if (authorized) fetchUsers();
  }, [authorized, fetchUsers]);

  const openUserPanel = async (u: UserRow) => {
    setSelectedUser(u);
    setUserSearchesLoading(true);
    const { data } = await supabase.rpc("admin_user_searches", {
      p_user_id: u.user_id,
      p_limit: 50,
      p_offset: 0,
    } as any);
    setUserSearches((data ?? []) as unknown as UserSearchEntry[]);
    setUserSearchesLoading(false);
  };

  const aggregateSearches = (data: DailySearch[], mode: string) => {
    if (mode === "daily")
      return data.map((d) => ({
        label: d.day.slice(5),
        Registruoti: d.registered_count,
        Anonimai: d.anonymous_count,
      }));
    const buckets: Record<string, { registered: number; anonymous: number }> = {};
    for (const d of data) {
      const date = new Date(d.day);
      const key =
        mode === "weekly"
          ? `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { registered: 0, anonymous: 0 };
      buckets[key].registered += d.registered_count;
      buckets[key].anonymous += d.anonymous_count;
    }
    return Object.entries(buckets).map(([k, v]) => ({
      label: k,
      Registruoti: v.registered,
      Anonimai: v.anonymous,
    }));
  };

  if (loading || !authorized || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const searchChartData = aggregateSearches(dailySearches, granularity);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
          <h1 className="text-lg font-bold text-foreground">Administravimas · Analitika</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* KPI Cards */}
        <SectionTitle>Bendri rodikliai</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={<Users className="h-4 w-4" />}
            label="Viso vartotojų"
            value={kpi?.total_users ?? 0}
            sub={`+${kpi?.new_users_today ?? 0} šiandien · +${kpi?.new_users_this_week ?? 0} šią savaitę`}
          />
          <KpiCard
            icon={<Search className="h-4 w-4" />}
            label="Viso paieškų"
            value={kpi?.total_searches ?? 0}
            sub={`${kpi?.searches_today ?? 0} šiandien`}
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Reg. / Anon."
            value={`${kpi?.registered_searches ?? 0} / ${kpi?.anonymous_searches ?? 0}`}
            sub="Registruoti vs Anonimai"
          />
          <KpiCard
            icon={<Euro className="h-4 w-4" />}
            label="Pajamos iš viso"
            value={`${Number(kpi?.total_revenue ?? 0).toFixed(2)} €`}
            sub={`${Number(kpi?.revenue_this_month ?? 0).toFixed(2)} € šį mėnesį`}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <KpiCard
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Pirkusių vartotojų"
            value={kpi?.users_who_purchased ?? 0}
          />
          <KpiCard
            icon={<Percent className="h-4 w-4" />}
            label="Konversijų rodiklis"
            value={`${kpi?.conversion_rate ?? 0}%`}
            sub="Registruotų, kurie pirko"
          />
          <KpiCard icon={<Search className="h-4 w-4" />} label="Paieškos šiandien" value={kpi?.searches_today ?? 0} />
        </div>

        {/* Search volume chart */}
        <SectionTitle>Paieškų aktyvumas</SectionTitle>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-foreground">Paieškos per dieną</p>
            <div className="flex gap-1">
              {(["daily", "weekly", "monthly"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    granularity === g
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {{ daily: "Diena", weekly: "Savaitė", monthly: "Mėnuo" }[g]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={searchChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Registruoti" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="Anonimai" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Signups chart */}
        <div className="bg-card border border-border rounded-xl p-4 mt-4">
          <p className="font-semibold text-foreground mb-4">Nauji vartotojai per dieną (30d.)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailySignups.map((d) => ({ label: d.day.slice(5), Registracijos: d.signups }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Registracijos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue */}
        <SectionTitle>Pajamos</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-4">Dienos pajamos (30d.), €</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyRevenue.map((d) => ({ label: d.day.slice(5), "Pajamos €": Number(d.revenue) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Pajamos €" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-4">Kreditai pagal planą</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={tierRevenue.map((t) => ({
                  label: TIER_LABELS[t.tier] ?? t.tier,
                  "Parduota kreditų": t.total_sold,
                  "Pajamos €": Number(t.total_revenue),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Parduota kreditų" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pajamos €" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic breakdown */}
        <SectionTitle>Geografija</SectionTitle>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50 font-semibold text-sm">
            Dažniausiai ieškomi rajonai / miestai (Top 10)
          </div>
          <div className="divide-y divide-border">
            {topLocations.map((loc, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm text-foreground">{loc.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${Math.min(100, (loc.search_count / (topLocations[0]?.search_count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">{loc.search_count}</span>
                </div>
              </div>
            ))}
            {topLocations.length === 0 && <p className="p-4 text-sm text-muted-foreground">Duomenų nėra</p>}
          </div>
        </div>

        {/* Top cadastral numbers */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
          <div className="p-4 border-b border-border bg-muted/50 font-semibold text-sm">
            Dažniausiai ieškomi sklypai (Top 10)
          </div>
          <div className="divide-y divide-border">
            {topCadastral.map((c, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm font-mono text-foreground">{c.cadastral_number}</span>
                </div>
                <span className="text-xs text-muted-foreground">{c.search_count}×</span>
              </div>
            ))}
            {topCadastral.length === 0 && <p className="p-4 text-sm text-muted-foreground">Duomenų nėra</p>}
          </div>
        </div>

        {/* ── Users section ───────────────────────────── */}
        <SectionTitle>Vartotojai</SectionTitle>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={userSearchInput}
              onChange={e => setUserSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  setUserSearch(userSearchInput);
                  setUserPage(0);
                }
              }}
              placeholder="Ieškoti pagal el. paštą..."
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1"
            />
            {userSearchInput && (
              <button onClick={() => { setUserSearchInput(""); setUserSearch(""); setUserPage(0); }}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex gap-1">
            {([
              { label: "Visi", value: null },
              { label: "Pirko", value: true },
              { label: "Nepirko", value: false },
            ] as const).map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => { setUserFilter(opt.value); setUserPage(0); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  userFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={userSort}
            onChange={e => { setUserSort(e.target.value); setUserPage(0); }}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
          >
            <option value="last_active">Paskutinis aktyvumas</option>
            <option value="most_searches">Daugiausia paieškų</option>
            <option value="highest_spend">Didžiausios išlaidos</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden relative">
          {usersLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["El. paštas", "Registracija", "Pask. aktyvumas", "Paieškos", "30d.", "Kreditai", "Išleista €", "Pirko"].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr
                    key={u.user_id}
                    onClick={() => openUserPanel(u)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium text-foreground">{u.email}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(u.registered_at).toLocaleDateString("lt-LT")}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.last_active ? new Date(u.last_active).toLocaleDateString("lt-LT") : "—"}</td>
                    <td className="px-3 py-2.5 text-foreground">{u.total_searches}</td>
                    <td className="px-3 py-2.5 text-foreground">{u.searches_last_30d}</td>
                    <td className="px-3 py-2.5 text-foreground">{u.credits_remaining}</td>
                    <td className="px-3 py-2.5 text-foreground">{Number(u.total_spent).toFixed(2)} €</td>
                    <td className="px-3 py-2.5">
                      {u.ever_purchased
                        ? <CheckCircle2 className="h-4 w-4 text-primary" />
                        : <XCircle className="h-4 w-4 text-muted-foreground/40" />
                      }
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !usersLoading && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Vartotojų nerasta</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 mb-8">
          <p className="text-xs text-muted-foreground">
            {userTotal} vartotojų iš viso · puslapis {userPage + 1} iš {Math.max(1, Math.ceil(userTotal / 25))}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setUserPage(p => Math.max(0, p - 1))}
              disabled={userPage === 0}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setUserPage(p => p + 1)}
              disabled={(userPage + 1) * 25 >= userTotal}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Slide-in user detail panel */}
        {selectedUser && (
          <>
            <div
              className="fixed inset-0 bg-foreground/20 z-[1000]"
              onClick={() => setSelectedUser(null)}
            />
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-l border-border z-[1001] overflow-y-auto animate-slide-in-right">
              <div className="flex items-start justify-between p-4 border-b border-border">
                <div>
                  <p className="font-semibold text-foreground">Vartotojas</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="h-3.5 w-3.5" /> {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4">
                {[
                  { label: "Viso paieškų", value: selectedUser.total_searches },
                  { label: "Per 30d.", value: selectedUser.searches_last_30d },
                  { label: "Kreditai", value: selectedUser.credits_remaining },
                  { label: "Išleista", value: `${Number(selectedUser.total_spent).toFixed(2)} €` },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="px-4 pb-2 text-xs text-muted-foreground space-y-1">
                <p>Registruotas: {new Date(selectedUser.registered_at).toLocaleDateString("lt-LT")}</p>
                <p>Pirko: {selectedUser.ever_purchased ? "✅ Taip" : "❌ Ne"}</p>
              </div>

              <div className="p-4">
                <p className="text-sm font-semibold text-foreground mb-3">Paieškų istorija</p>
                {userSearchesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : userSearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Paieškų nėra</p>
                ) : (
                  <div className="space-y-2">
                    {userSearches.map(s => (
                      <div key={s.id} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {s.cadastral_number}
                          </span>
                          {s.is_unlocked && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              Atrakinta
                            </span>
                          )}
                        </div>
                        {s.address && (
                          <p className="text-xs text-muted-foreground mt-0.5">{s.address}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          {new Date(s.created_at).toLocaleString("lt-LT", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                          {s.search_method && ` · ${s.search_method}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
