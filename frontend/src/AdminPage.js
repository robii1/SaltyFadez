import { useState, useEffect } from "react";
import axios from "axios";
import { format, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { User, Trash2, Lock } from "lucide-react";
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
// ADMIN DASHBOARD MED MULTI-DATO
// =========================
const AdminDashboard = ({ onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(3); // Vis 3 dager fremover
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBarber, setFilterBarber] = useState("all");
  const [absenceBarber, setAbsenceBarber] = useState("marius");
  const [absenceDate, setAbsenceDate] = useState(new Date());

  const fetchBookings = async () => {
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
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, daysToShow]);

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

      <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-[300px_1fr] gap-8">

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

          {/* Velg antall dager som vises */}
          <div className="mt-4 space-y-1">
            <Label className="text-zinc-400 text-sm">Vis antall dager fremover</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 5, 7].map(n => (
                <button
                  key={n}
                  onClick={() => setDaysToShow(n)}
                  className={`px-2 py-1 text-sm border rounded-none
                    ${daysToShow === n ? "bg-red-600 border-red-600 text-white" : "bg-transparent border-zinc-800 text-zinc-300"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HØYRE: Bookinger */}
        <div>
          <h2 className="mb-4 flex items-center justify-between">
            <span>Bookinger {daysToShow} dager fra {format(selectedDate, "d. MMM yyyy", { locale: nb })}</span>
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
