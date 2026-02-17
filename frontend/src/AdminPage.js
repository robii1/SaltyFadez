import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { 
  Scissors, 
  Calendar as CalendarIcon, 
  Clock, 
  Phone, 
  Mail, 
  Trash2, 
  ArrowLeft,
  User,
  RefreshCw,
  Lock,
  CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_API_URL;
const API = `${BACKEND_URL}/api`;

const BARBERS = [
  { id: "all", name: "Alle" },
  { id: "marius", name: "Marius" },
  { id: "sivert", name: "Sivert" }
];

const ABSENCE_KEY = "westcutz_absence_v1";

const loadAbsence = () => {
  try {
    return JSON.parse(localStorage.getItem(ABSENCE_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveAbsence = (data) => {
  localStorage.setItem(ABSENCE_KEY, JSON.stringify(data));
};

const isAbsent = (absence, barberId, dateStr) => {
  return !!absence?.[barberId]?.[dateStr];
};

// Login component
const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API}/admin/login`, { password });
      if (response.data.success) {
        localStorage.setItem("admin_authenticated", "true");
        onLogin();
      }
    } catch (err) {
      setError("Feil passord");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="border border-zinc-800 bg-zinc-900/50 p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-red-600 mx-auto mb-4 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-50" style={{ fontFamily: 'Anton, sans-serif' }}>
              SALTY FADEZ
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Admin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-zinc-400 text-sm">Passord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Skriv inn passord"
                className="mt-1 bg-zinc-900 border-zinc-800 rounded-none h-12"
                data-testid="admin-password-input"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-none h-12 bg-red-600 hover:bg-red-700 text-white font-bold"
              data-testid="admin-login-btn"
            >
              {loading ? "Logger inn..." : "LOGG INN"}
            </Button>
          </form>

          <Link 
            to="/" 
            className="block text-center text-zinc-500 text-sm mt-6 hover:text-zinc-300"
          >
            ← Tilbake til forsiden
          </Link>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

// Booking card component
const BookingCard = ({ booking, onCancel }) => {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm("Er du sikker på at du vil kansellere denne bestillingen?")) {
      return;
    }
    
    setCancelling(true);
    try {
      await axios.delete(`${API}/bookings/${booking.id}`);
      toast.success("Bestilling kansellert");
      onCancel(booking.id);
    } catch (error) {
      toast.error("Kunne ikke kansellere bestilling");
    } finally {
      setCancelling(false);
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case "paid":
        return <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5">Betalt</span>;
      case "failed":
        return <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5">Feilet</span>;
      default:
        return <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5">Venter</span>;
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-50">
            <User className="w-4 h-4 text-red-500" />
            <span className="font-semibold">{booking.customer_name}</span>
            {getPaymentBadge(booking.payment_status)}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              <span>{format(parseISO(booking.date + "T00:00:00"), "d. MMM yyyy", { locale: nb })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{booking.time_slot}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-zinc-500">
            {booking.phone && (
              <a href={`tel:${booking.phone}`} className="flex items-center gap-1 hover:text-white">
                <Phone className="w-3 h-3" />
                <span>{booking.phone}</span>
              </a>
            )}
            {booking.email && (
              <a href={`mailto:${booking.email}`} className="flex items-center gap-1 hover:text-white">
                <Mail className="w-3 h-3" />
                <span>{booking.email}</span>
              </a>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={cancelling}
          className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
          data-testid={`cancel-booking-${booking.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Admin dashboard component
const AdminDashboard = ({ onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("date");
  const [barberFilter, setBarberFilter] = useState("all");
  // --- Absence (frontend-only) ---
  const [absence, setAbsence] = useState(loadAbsence());
  const [absenceBarber, setAbsenceBarber] = useState("marius");
  const [absenceDate, setAbsenceDate] = useState(new Date());

  const toggleAbsence = () => {
    if (!(absenceDate instanceof Date)) return;
    const dateStr = format(absenceDate, "yyyy-MM-dd");

    const next = { ...absence };
    next[absenceBarber] = { ...(next[absenceBarber] || {}) };

    if (next[absenceBarber][dateStr]) {
      delete next[absenceBarber][dateStr];
      toast.success("Fravær fjernet");
    } else {
      next[absenceBarber][dateStr] = true;
      toast.success("Fravær registrert");
    }

    setAbsence(next);
    saveAbsence(next);
  };

  const clearAbsenceDate = (barberId, dateStr) => {
    const next = { ...absence };
    next[barberId] = { ...(next[barberId] || {}) };
    delete next[barberId][dateStr];
    setAbsence(next);
    saveAbsence(next);
    toast.success("Fravær fjernet");
  };

  const fetchBookings = async (date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await axios.get(`${API}/bookings?date=${dateStr}`);
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Kunne ikke laste bestillinger");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
     const response = await axios.get(`${API}/bookings`);
const arr = Array.isArray(response.data) ? response.data : [];
const sorted = arr.slice().sort((a, b) => {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;
  return a.time_slot.localeCompare(b.time_slot);
});
setAllBookings(sorted);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Kunne ikke laste bestillinger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "date") {
      fetchBookings(selectedDate);
    } else {
      fetchAllBookings();
    }
  }, [selectedDate, viewMode]);

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      setViewMode("date");
    }
  };

  const handleCancelBooking = (bookingId) => {
    setBookings(bookings.filter(b => b.id !== bookingId));
    setAllBookings(allBookings.filter(b => b.id !== bookingId));
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    onLogout();
  };

  const displayBookings = Array.isArray(viewMode === "date" ? bookings : allBookings)
  ? (viewMode === "date" ? bookings : allBookings)
  : [];
  const filteredBookings = barberFilter === "all"
    ? displayBookings
    : displayBookings.filter(b => (b.barber_id || "marius") === barberFilter);

  const groupedBookings = viewMode === "all" 
    ? displayBookings.reduce((acc, booking) => {
        if (!acc[booking.date]) acc[booking.date] = [];
        acc[booking.date].push(booking);
        return acc;
      }, {})
    : null;

  // Calculate stats
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayBookings = allBookings.filter(b => b.date === todayStr).length;
  const totalRevenue = allBookings.filter(b => b.payment_status === "paid").length * 300;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50" data-testid="admin-dashboard">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-zinc-400 hover:text-white transition-colors"
              data-testid="back-to-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Anton, sans-serif' }}>
              WESTCUTZ ADMIN
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "date" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("date")}
                className="rounded-none"
              >
                Per Dag
              </Button>
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("all")}
                className="rounded-none"
                data-testid="view-all-btn"
              >
                Alle
              </Button>
            </div>
                  <div className="flex items-center gap-2">
         <label className="text-xs text-zinc-500" htmlFor="barber-filter">Frisør</label>
              <select
                id="barber-filter"
                value={barberFilter}
                onChange={(e) => setBarberFilter(e.target.value)}
                className="bg-transparent border border-zinc-800 text-zinc-200 text-sm px-2 py-1 rounded-none"
                data-testid="barber-filter"
              >
                {BARBERS.map(b => (
                  <option key={b.id} value={b.id} className="bg-zinc-950">{b.name}</option>
                ))}
              </select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-zinc-500 hover:text-white"
              data-testid="logout-btn"
            >
              Logg ut
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-zinc-800 p-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">I dag</p>
            <p className="text-2xl font-bold text-zinc-50">{todayBookings}</p>
          </div>
          <div className="border border-zinc-800 p-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Totalt aktive</p>
            <p className="text-2xl font-bold text-zinc-50">{allBookings.length}</p>
          </div>
          <div className="border border-zinc-800 p-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Betalt</p>
            <p className="text-2xl font-bold text-green-500">{totalRevenue} kr</p>
          </div>
          <div className="border border-zinc-800 p-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Venter betaling</p>
            <p className="text-2xl font-bold text-yellow-500">
              {allBookings.filter(b => b.payment_status !== "paid").length * 300} kr
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8">
          {/* Calendar sidebar */}
       <div className="space-y-6">
  {/* Kalender (eksisterende) */}
  <div className="space-y-4">
    <h2 className="text-sm text-zinc-400 uppercase tracking-wider">Velg Dato</h2>
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={handleDateSelect}
      className="rounded-none border border-zinc-800"
      data-testid="admin-calendar"
    />

    <Button
      variant="outline"
      className="w-full rounded-none border-zinc-700"
      onClick={() => viewMode === "date" ? fetchBookings(selectedDate) : fetchAllBookings()}
      data-testid="refresh-btn"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Oppdater
    </Button>
  </div>

  {/* Fravær (NY) */}
  <div className="border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
    <h2 className="text-sm text-zinc-400 uppercase tracking-wider">Fravær</h2>

    <div className="flex gap-2">
      {BARBERS.filter(b => b.id !== "all").map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setAbsenceBarber(b.id)}
          className={`px-3 py-2 text-sm border transition-colors rounded-none
            ${absenceBarber === b.id
              ? "bg-red-600 border-red-600 text-white"
              : "bg-transparent border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
            }`}
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
      data-testid="absence-calendar"
    />

    <Button
      onClick={toggleAbsence}
      className="w-full rounded-none bg-red-600 hover:bg-red-700 text-white"
      data-testid="toggle-absence-btn"
    >
      {absenceDate instanceof Date &&
      isAbsent(absence, absenceBarber, format(absenceDate, "yyyy-MM-dd"))
        ? "Fjern fravær"
        : "Sett fravær"}
    </Button>

    <div className="pt-2">
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">
        Registrert fravær ({BARBERS.find(b => b.id === absenceBarber)?.name})
      </p>

      {Object.keys(absence?.[absenceBarber] || {}).length === 0 ? (
        <p className="text-zinc-600 text-sm">Ingen fravær registrert.</p>
      ) : (
        <div className="space-y-2">
          {Object.keys(absence[absenceBarber]).sort().map((d) => (
            <div key={d} className="flex items-center justify-between border border-zinc-800 p-2">
              <span className="text-zinc-300 text-sm">{d} — Fravær</span>
              <button
                type="button"
                onClick={() => clearAbsenceDate(absenceBarber, d)}
                className="text-sm text-red-500 hover:text-red-400"
              >
                Fjern
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

    <p className="text-zinc-600 text-xs">
      Merk: Dette er kun admin/visning i frontend. 
    </p>
  </div>
</div>

          {/* Bookings list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm text-zinc-400 uppercase tracking-wider">
                {viewMode === "date" 
                  ? `Bestillinger for ${format(selectedDate, "d. MMMM yyyy", { locale: nb })}`
                  : "Alle kommende bestillinger"
                }
              </h2>
              <span className="text-zinc-500 text-sm">
                {filteredBookings.length} bestilling{filteredBookings.length !== 1 ? "er" : ""}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-500">
                Laster bestillinger...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 border border-zinc-800 border-dashed">
                <Scissors className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-zinc-500">Ingen bestillinger</p>
              </div>
            ) : viewMode === "date" ? (
              <div className="space-y-3" data-testid="bookings-list">
                {filteredBookings
                  .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
                  .map((booking) => (
                    <BookingCard 
                      key={booking.id} 
                      booking={booking} 
                      onCancel={handleCancelBooking}
                    />
                  ))}
              </div>
            ) : (
              <div className="space-y-6" data-testid="bookings-list">
                {Object.entries(groupedBookings).map(([date, dateBookings]) => (
                  <div key={date}>
                    <h3 className="text-zinc-300 font-semibold mb-3 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-red-500" />
                      {format(parseISO(date + "T00:00:00"), "EEEE d. MMMM yyyy", { locale: nb })}
                    </h3>
                    <div className="space-y-3 pl-6 border-l border-zinc-800">
                      {dateBookings
                        .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
                        .map((booking) => (
                          <BookingCard 
                            key={booking.id} 
                            booking={booking} 
                            onCancel={handleCancelBooking}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
};

// Admin page wrapper
const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const auth = localStorage.getItem("admin_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />;
};

export default AdminPage;
