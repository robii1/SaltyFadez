import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { User, Trash2, Lock, Eye, TrendingUp, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_API_URL;
const API = `${BACKEND_URL}/api`;

const BARBERS = [
  { id: "all", name: "Alle" },
  { id: "marius", name: "Marius" },
  { id: "sivert", name: "Sivert" }
];

// =========================
// ADMIN LOGIN
// =========================
const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API}/admin/login`, { password });
      if (res.data.success) {
        localStorage.setItem("admin_authenticated", "true");
        onLogin();
      }
    } catch {
      setError("Feil passord");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-zinc-800 bg-zinc-900/50 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-red-600 mx-auto mb-4 flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-50" style={{ fontFamily: "Anton, sans-serif" }}>
            WESTCUTZ
          </h1>
          <p className="text-zinc-500 text-sm">Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-zinc-400 text-sm">Passord</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 bg-zinc-900 border-zinc-800 rounded-none h-12"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-none h-12 bg-red-600 hover:bg-red-700 font-bold"
          >
            {loading ? "Logger inn..." : "LOGG INN"}
          </Button>
        </form>

        <Link to="/" className="block text-center text-zinc-500 text-sm mt-6">
          ← Tilbake
        </Link>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

// =========================
// BOOKING CARD
// =========================
const BookingCard = ({ booking, onCancel }) => {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm("Kansellere bestilling?")) return;
    setCancelling(true);
    try {
      await axios.delete(`${API}/bookings/${booking.id}`);
      onCancel(booking.id);
      toast.success("Bestilling kansellert");
    } catch {
      toast.error("Kunne ikke kansellere");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-4 mb-2">
      <div className="flex justify-between">
        <div>
          <div className="flex items-center gap-2 text-zinc-50">
            <User className="w-4 h-4 text-red-500" />
            <span className="font-semibold">{booking.customer_name}</span>
          </div>
          <div className="flex gap-4 text-sm text-zinc-400 mt-1">
            <span>{booking.date}</span>
            <span>{booking.time_slot}</span>
          </div>
          <div className="flex gap-4 text-sm text-zinc-500 mt-1">
            {booking.phone && <a href={`tel:${booking.phone}`}>{booking.phone}</a>}
            {booking.email && <a href={`mailto:${booking.email}`}>{booking.email}</a>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={cancelling}
          className="text-zinc-500 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// =========================
// VISITOR STATS
// =========================
const VisitorStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/track-visit")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-500 text-sm p-4">Laster besøksstatistikk...</div>;
  if (!stats) return null;

  const last7 = stats.days ? stats.days.slice(0, 7) : [];
  const last30 = stats.days || [];
  const week = last7.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...(expanded ? last30 : last7).map((d) => d.count), 1);
  const displayDays = expanded ? last30 : last7;

  return (
    <div className="border border-zinc-800 bg-zinc-900/30 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-red-500" />
        <h2 className="text-sm text-zinc-400 uppercase tracking-wider">Besøksstatistikk</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <Eye className="w-3 h-3" /> I dag
          </div>
          <p className="text-2xl font-bold text-zinc-50">{stats.today}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" /> Siste 7 dager
          </div>
          <p className="text-2xl font-bold text-zinc-50">{week}</p>
        </div>
        <div className="text-center">
          <div className="text-zinc-500 text-xs mb-1">Totalt</div>
          <p className="text-2xl font-bold text-zinc-50">{stats.total}</p>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-20">
        {[...displayDays].reverse().map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full bg-red-600/80 hover:bg-red-500 transition-colors rounded-sm cursor-default"
              style={{ height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 4 : 0)}%` }}
              title={`${d.date}: ${d.count} besøk`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
        <span>{displayDays.length > 0 ? displayDays[displayDays.length - 1].date.slice(5) : ""}</span>
        <span>{displayDays.length > 0 ? displayDays[0].date.slice(5) : ""}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 transition-colors"
      >
        {expanded ? "Vis 7 dager" : "Vis 30 dager"}
      </button>
    </div>
  );
};

// =========================
// ADMIN DASHBOARD MED MULTI-DATO
// =========================
const AdminDashboard = ({ onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(7);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBarber, setFilterBarber] = useState("all");
  const [absenceBarber, setAbsenceBarber] = useState("marius");
  const [absenceDate, setAbsenceDate] = useState(new Date());

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let allBookings = [];
      for (let i = 0; i < daysToShow; i++) {
        const dateStr = format(addDays(selectedDate, i), "yyyy-MM-dd");
        const res = await axios.get(`${API}/bookings?date=${dateStr}`);
        allBookings = allBookings.concat(res.data || []);
      }
      setBookings(allBookings);
    } catch {
      toast.error("Kunne ikke hente bookinger");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, daysToShow]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = (id) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleAbsence = async () => {
    if (!(absenceDate instanceof Date)) return;

    try {
      await axios.post(`${API}/admin/absence`, {
        barber_id: absenceBarber,
        date: format(absenceDate, "yyyy-MM-dd"),
      }, {
        auth: {
          username: "admin",
          password: prompt("Admin passord"),
        },
      });
      toast.success("Fravær oppdatert");
    } catch {
      toast.error("Kunne ikke oppdatere fravær");
    }
  };

  const filteredBookings = filterBarber === "all"
    ? bookings
    : bookings.filter(b => b.barber_id === filterBarber);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 p-4 flex justify-between">
        <h1 className="font-bold">WESTCUTZ ADMIN</h1>
        <Button variant="ghost" onClick={onLogout}>Logg ut</Button>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <VisitorStats />
        <div className="grid lg:grid-cols-[300px_1fr] gap-8">

        {/* VENSTRE: Fravær */}
        <div className="border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
          <h2 className="text-sm text-zinc-400 uppercase tracking-wider">Fravær</h2>
          <div className="flex gap-2">
            {BARBERS.filter(b => b.id !== "all").map((b) => (
              <button
                key={b.id}
                onClick={() => setAbsenceBarber(b.id)}
                className={`px-3 py-2 text-sm border rounded-none
                  ${absenceBarber === b.id ? "bg-red-600 border-red-600 text-white" : "bg-transparent border-zinc-800 text-zinc-300"}`}
              >
                {b.name}
              </button>
            ))}
          </div>
          <Calendar
            mode="single"
            selected={absenceDate}
            onSelect={(d) => d && setAbsenceDate(d)}
            className="rounded-none border border-zinc-800"
          />
          <Button
            onClick={toggleAbsence}
            className="w-full rounded-none bg-red-600 hover:bg-red-700 text-white"
          >
            Sett / fjern fravær
          </Button>

          <div className="mt-4 space-y-1">
            <Label className="text-zinc-400 text-sm">Vis bookinger fremover</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { days: 1, label: "1 dag" },
                { days: 7, label: "1 uke" },
                { days: 30, label: "1 mnd" },
                { days: 90, label: "3 mnd" },
              ].map(({ days, label }) => (
                <button
                  key={days}
                  onClick={() => setDaysToShow(days)}
                  className={`px-2 py-1 text-sm border rounded-none
                    ${daysToShow === days ? "bg-red-600 border-red-600 text-white" : "bg-transparent border-zinc-800 text-zinc-300"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HØYRE: Bookinger */}
        <div>
          <h2 className="mb-4 flex items-center justify-between">
            <span>Bookinger {daysToShow === 1 ? "1 dag" : daysToShow === 7 ? "1 uke" : daysToShow === 30 ? "1 måned" : daysToShow === 90 ? "3 måneder" : `${daysToShow} dager`} fra {format(selectedDate, "d. MMM yyyy", { locale: nb })}</span>
            <div className="flex gap-2">
              {BARBERS.map(b => (
                <button
                  key={b.id}
                  onClick={() => setFilterBarber(b.id)}
                  className={`px-2 py-1 text-sm border rounded-none
                    ${filterBarber === b.id ? "bg-red-600 border-red-600 text-white" : "bg-transparent border-zinc-800 text-zinc-300"}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </h2>

          {loading ? (
            <p>Laster...</p>
          ) : filteredBookings.length === 0 ? (
            <p>Ingen bookinger</p>
          ) : (
            filteredBookings
              .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot))
              .map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancelBooking} />)
          )}
        </div>
      </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
};

// =========================
// ADMIN PAGE
// =========================
const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated");
    if (auth === "true") setIsAuthenticated(true);
  }, []);

  if (!isAuthenticated) return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;

  return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />;
};

export default AdminPage;