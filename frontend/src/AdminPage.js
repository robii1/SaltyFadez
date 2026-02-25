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
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_API_URL;
const API = `${BACKEND_URL}/api`;

const BARBERS = [
  { id: "all", name: "Alle" },
  { id: "marius", name: "Marius" },
  { id: "sivert", name: "Sivert" }
];


// ================= LOGIN =================

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
    } catch {
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
              WESTCUTZ
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
                className="mt-1 bg-zinc-900 border-zinc-800 rounded-none h-12"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-none h-12 bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {loading ? "Logger inn..." : "LOGG INN"}
            </Button>
          </form>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};


// ================= DASHBOARD =================

const AdminDashboard = ({ onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [absenceBarber, setAbsenceBarber] = useState("marius");
  const [absenceDate, setAbsenceDate] = useState(new Date());

  const toggleAbsence = async () => {
    if (!(absenceDate instanceof Date)) return;

    const dateStr = format(absenceDate, "yyyy-MM-dd");

    try {
      await axios.post(
        `${API}/admin/absence`,
        {
          barber_id: absenceBarber,
          date: dateStr,
        },
        {
          auth: {
            username: "admin",
            password: prompt("Admin passord"),
          },
        }
      );

      toast.success("Fravær oppdatert");
    } catch {
      toast.error("Kunne ikke oppdatere fravær");
    }
  };

  const fetchBookings = async (date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await axios.get(`${API}/bookings?date=${dateStr}`);
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error("Kunne ikke laste bestillinger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">WESTCUTZ ADMIN</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logg ut
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-[300px_1fr] gap-8">

        {/* FRAVÆR */}
        <div className="border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
          <h2 className="text-sm text-zinc-400 uppercase tracking-wider">Fravær</h2>

          <div className="flex gap-2">
            {BARBERS.filter(b => b.id !== "all").map((b) => (
              <button
                key={b.id}
                onClick={() => setAbsenceBarber(b.id)}
                className={`px-3 py-2 text-sm border rounded-none
                  ${absenceBarber === b.id
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-transparent border-zinc-800 text-zinc-300"}
                `}
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
        </div>

        {/* BOOKINGS */}
        <div>
          <h2 className="mb-4">
            Bestillinger for {format(selectedDate, "d. MMMM yyyy", { locale: nb })}
          </h2>

          {loading ? (
            <p>Laster...</p>
          ) : bookings.length === 0 ? (
            <p>Ingen bestillinger</p>
          ) : (
            bookings
              .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
              .map((booking) => (
                <div key={booking.id} className="border border-zinc-800 p-4 mb-3">
                  <p>{booking.customer_name}</p>
                  <p>{booking.time_slot}</p>
                </div>
              ))
          )}
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
};


// ================= WRAPPER =================

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
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
