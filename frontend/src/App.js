import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import axios from "axios";
import { format, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Scissors, Calendar as CalendarIcon, Clock, Phone, Mail, Check, MapPin, Settings } from "lucide-react";
import AdminPage from "@/AdminPage";

const BACKEND_URL = process.env.REACT_APP_API_URL;
const API = `${BACKEND_URL}/api`;

const BARBERS = [
  { id: "marius", name: "Marius" },
  { id: "sivert", name: "Sivert" }
];

// Services data
const SERVICES = [
  { id: "fade-uten-topp", name: "FADE - UTEN TOPP", price: 300, duration: 25, desc: "Fade på sidene, toppen røres ikke" },
  { id: "fade-med-topp", name: "FADE - MED TOPP", price: 350, duration: 30, desc: "Sidene og forming av toppen" },
  { id: "sakseklipp", name: "SAKSEKLIPP", price: 300, duration: 30, desc: "Presis sakseklipp topp og sider" },
  { id: "klipp-skjegg", name: "KLIPP OG SKJEGG", price: 400, duration: 45, desc: "Valgfri klipp og skjeggtrim og forming" },
  { id: "lineup", name: "LINE UP", price: 150, duration: 15, desc: "Rene linjer rundt hårfeste og skjegg" }
];

// Step indicator component
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { num: 1, label: "Dato" },
    { num: 2, label: "Tid" },
    { num: 3, label: "Info" },
    { num: 4, label: "Ferdig" }
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div
            className={`step-indicator ${
              currentStep === step.num
                ? "active"
                : currentStep > step.num
                ? "completed"
                : "pending"
            }`}
          >
            {currentStep > step.num ? <Check className="w-4 h-4" /> : step.num}
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-8 h-px mx-1 ${
                currentStep > step.num ? "bg-zinc-600" : "bg-zinc-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Time slot button component
const TimeSlotButton = ({ time, available, selected, onClick }) => (
  <button
    onClick={() => available && onClick(time)}
    disabled={!available}
    data-testid={`time-slot-${time}`}
    className={`
      p-3 text-sm font-medium transition-all duration-200 border
      ${selected
        ? "bg-red-600 border-red-600 text-white"
        : available
        ? "bg-transparent border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
        : "bg-zinc-900/50 border-zinc-800/50 text-zinc-600 cursor-not-allowed"
      }
    `}
  >
    {time}
  </button>
);

// Booking form component
const BookingForm = ({ selectedService, onServiceChange }) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState("marius");
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(null);

  const service = SERVICES.find(s => s.id === selectedService) || SERVICES[0];

 // Fetch time slots when date is selected
useEffect(() => {
  if (!(selectedDate instanceof Date)) return;

  const dateStr = format(selectedDate, "yyyy-MM-dd");
fetchTimeSlots(dateStr, selectedBarber);
}, [selectedDate, selectedBarber]);

const fetchTimeSlots = async (date, barberId) => {
  setLoadingSlots(true);
  try {
    const response = await axios.get(`${API}/time-slots/${date}`, { params: { barber_id: barberId } });
    const data = response.data;

    setTimeSlots(Array.isArray(data) ? data : []);
    if (!Array.isArray(data)) {
      console.error("Expected array from /time-slots, got:", data);
    }
  } catch (error) {
    console.error("Error fetching time slots:", error);
    setTimeSlots([]); // <- viktig så .map aldri krasjer
    toast.error("Kunne ikke laste ledige tider");
  } finally {
    setLoadingSlots(false);
  }
};

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep(2);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.phone && !formData.email) {
      toast.error("Vennligst oppgi telefon eller e-post");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Vennligst skriv inn navnet ditt");
      document.getElementById("name")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/bookings`, {
        customer_name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        barber_id: selectedBarber,
        barber_name: BARBERS.find(b => b.id === selectedBarber)?.name,
        date: format(selectedDate, "yyyy-MM-dd"),
        time_slot: selectedTime,
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        service_duration: service.duration
      });
      
      setBookingConfirmed(response.data);
      setStep(4);
      toast.success("Bestilling bekreftet!");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(error.response?.data?.detail || "Kunne ikke opprette bestilling");
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setFormData({ name: "", phone: "", email: "" });
    setBookingConfirmed(null);
    onServiceChange(SERVICES[0].id);
  };

  // Disable past dates
  const disabledDays = { before: new Date() };

  return (
    <div className="max-w-md mx-auto p-6 border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm animate-fade-in">
      <StepIndicator currentStep={step} />

      {/* Service selector */}
      <div className="mb-6">
        <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2 text-center">Valgt tjeneste</p>
        <div className="bg-zinc-800/50 p-3 border border-zinc-700 flex justify-between items-center">
          <div>
            <span className="text-zinc-50 font-medium">{service.name}</span>
            <span className="text-zinc-500 text-sm ml-2">({service.duration} min)</span>
          </div>
          <span className="text-red-500 font-bold">{service.price} kr</span>
        </div>
      </div>

      {/* Step 1: Select Date */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="heading-font text-xl text-center text-zinc-50 mb-6">VELG DATO</h3>
              <div className="flex justify-center gap-2 mb-6" data-testid="barber-selector">
            {BARBERS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBarber(b.id);
                  setSelectedTime(null);
                  if (selectedDate) setStep(2);
                }}
                className={`px-4 py-2 text-sm font-medium border transition-colors
                  ${selectedBarber === b.id
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-transparent border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                  }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={disabledDays}
              className="rounded-none border border-zinc-800"
              data-testid="booking-calendar"
            />
          </div>
        </div>
      )}

      {/* Step 2: Select Time */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep(1)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              ← Tilbake
            </button>
            <h3 className="heading-font text-xl text-zinc-50">VELG TID</h3>
            <div className="w-12"></div>
          </div>
          
          <p className="text-zinc-400 text-center text-sm mb-4">
            {selectedDate && format(selectedDate, "EEEE d. MMMM yyyy", { locale: nb })} • Frisør: {BARBERS.find(b => b.id === selectedBarber)?.name}}
          </p>

          {loadingSlots ? (
            <div className="text-center text-zinc-400 py-8">Laster ledige tider...</div>
          ) : (
            <div className="time-slot-grid" data-testid="time-slots-grid">
              {timeSlots.map((slot) => (
                <TimeSlotButton
                  key={slot.time}
                  time={slot.time}
                  available={slot.available}
                  selected={selectedTime === slot.time}
                  onClick={handleTimeSelect}
                />
              ))}
            </div>
          )}

          {timeSlots.length > 0 && timeSlots.every(s => !s.available) && (
            <p className="text-zinc-500 text-center text-sm mt-4">
              Ingen ledige tider denne dagen. Vennligst velg en annen dato.
            </p>
          )}
        </div>
      )}

      {/* Step 3: Contact Details */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep(2)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              ← Tilbake
            </button>
            <h3 className="heading-font text-xl text-zinc-50">DINE DETALJER</h3>
            <div className="w-12"></div>
          </div>

          <div className="bg-zinc-800/50 p-4 mb-6 border border-zinc-700">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CalendarIcon className="w-4 h-4 text-red-500" />
              <span>{selectedDate && format(selectedDate, "d. MMMM yyyy", { locale: nb })}</span>
              <Clock className="w-4 h-4 text-red-500 ml-4" />
              <span>{selectedTime}</span>
              <Scissors className="w-4 h-4 text-red-500 ml-4" />
              <span>Frisør: {BARBERS.find(b => b.id === selectedBarber)?.name}</span>
             </div>
            </div>
            <p className="text-zinc-500 text-xs mt-2">
              {service.name} ({service.duration} min) | Pris: {service.price} kr
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-zinc-300 text-sm">Navn *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ditt navn"
                className="input-sharp mt-1"
                required
                data-testid="input-name"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-zinc-300 text-sm">
                <Phone className="w-3 h-3 inline mr-1" />
                Telefon
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="123 45 678"
                className="input-sharp mt-1"
                data-testid="input-phone"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-zinc-300 text-sm">
                <Mail className="w-3 h-3 inline mr-1" />
                E-post
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="din@epost.no"
                className="input-sharp mt-1"
                data-testid="input-email"
              />
            </div>

            <p className="text-zinc-500 text-xs">* Telefon eller e-post kreves for bekreftelse</p>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full btn-sharp bg-red-600 hover:bg-red-700 text-white"
              data-testid="submit-booking-btn"
            >
              {submitting ? "BOOKER..." : "BEKREFT BESTILLING"}
            </Button>
          </form>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && bookingConfirmed && (
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 mx-auto bg-red-600 flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="heading-font text-2xl text-zinc-50">BESTILLING BEKREFTET</h3>
          
          <div className="bg-zinc-800/50 p-6 border border-zinc-700 text-left space-y-3">
            <div className="flex items-center gap-3 text-zinc-300">
              <Scissors className="w-4 h-4 text-red-500" />
              <span>{service.name} ({service.duration} min) — {service.price} kr</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <CalendarIcon className="w-4 h-4 text-red-500" />
              <span>{selectedDate && format(selectedDate, "EEEE d. MMMM yyyy", { locale: nb })}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <Clock className="w-4 h-4 text-red-500" />
              <span>{selectedTime}</span>
            </div>
          </div>

          <p className="text-zinc-400 text-sm">
            {bookingConfirmed.email 
              ? `Bekreftelse sendt til ${bookingConfirmed.email}`
              : bookingConfirmed.phone 
              ? `Vi sender SMS til ${bookingConfirmed.phone}`
              : "Vi sees!"
            }
          </p>

          <Button
            onClick={resetBooking}
            variant="outline"
            className="btn-sharp border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            data-testid="book-another-btn"
          >
            BESTILL NY TIME
          </Button>
        </div>
      )}
    </div>
  );
};

// Hero section
const HeroSection = ({ onBookClick }) => (
  <section className="min-h-screen flex flex-col lg:flex-row">
    {/* Left: Text */}
    <div className="flex-1 flex flex-col justify-center p-6 md:p-12 lg:p-24">
      <h1 className="heading-font text-5xl sm:text-6xl lg:text-8xl text-zinc-50 mb-6">
        WEST<br />CUTZ
      </h1>
      <p className="text-zinc-400 text-base md:text-lg max-w-md mb-8">
        Premium fades med presisjon og stil. 
        Se gjennom tjenestene og bestill det som passer deg.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={onBookClick}
          className="btn-sharp bg-red-600 hover:bg-red-700 text-white"
          data-testid="book-now-btn"
        >
          <Scissors className="w-4 h-4 mr-2" />
          BESTILL NÅ
        </Button>
        <Button 
          variant="outline"
          onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
          className="btn-sharp border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          SE TJENESTER
        </Button>
      </div>
      
      {/* Quick info */}
      <div className="flex flex-wrap gap-6 mt-12 text-zinc-400 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-500" />
          <span>Man-Lør 9-18</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500" />
          <span>Hans Blomgate 10, 6905 Florø</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-red-500" />
          <span>453 92 948</span>
        </div>
      </div>
    </div>

    {/* Right: Image */}
    <div className="flex-1 relative min-h-[50vh] lg:min-h-screen">
      <img
        src="https://images.unsplash.com/photo-1625038032200-648fbcd800d0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
        alt="Frisørverktøy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent lg:bg-gradient-to-l" />
    </div>
  </section>
);

// Services section
const ServicesSection = ({ onServiceSelect }) => (
  <section id="services" className="py-16 md:py-24 px-6 md:px-12 lg:px-24 border-t border-zinc-800">
    <h2 className="heading-font text-3xl md:text-4xl text-zinc-50 mb-3 text-center">
      VÅRE TJENESTER
    </h2>
    <p className="text-center mb-12">
      <a 
        href="https://www.tiktok.com/@salty_fadez" 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-red-500 transition-colors text-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
        Se resultater på TikTok
      </a>
    </p>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
      {SERVICES.map((service) => (
        <button
          key={service.id}
          onClick={() => onServiceSelect(service.id)}
          className="card-sharp group text-left hover:border-red-600 transition-colors cursor-pointer"
          data-testid={`service-${service.id}`}
        >
          <h3 className="heading-font text-lg text-zinc-50 mb-2">{service.name}</h3>
          <p className="text-zinc-400 text-sm mb-4">{service.desc}</p>
          <div className="flex justify-between items-center">
            <span className="text-red-500 font-bold text-lg">{service.price} kr</span>
            <span className="text-zinc-500 text-sm">{service.duration} min</span>
          </div>
          <div className="mt-4 text-center">
            <span className="text-xs uppercase tracking-wider text-zinc-600 group-hover:text-red-500 transition-colors">
              Velg & bestill →
            </span>
          </div>
        </button>
      ))}
    </div>
  </section>
);

// Booking section
const BookingSection = ({ selectedService, onServiceChange }) => (
  <section 
    id="booking"
    className="py-16 md:py-24 px-6 md:px-12 lg:px-24 border-t border-zinc-800"
  >
    <h2 className="heading-font text-3xl md:text-4xl text-zinc-50 mb-12 text-center">
      BESTILL TIME
    </h2>
    <BookingForm selectedService={selectedService} onServiceChange={onServiceChange} />
  </section>
);

// Main Home component
const Home = () => {
  const [selectedService, setSelectedService] = useState(SERVICES[0].id);

  const handleServiceSelect = (serviceId) => {
    setSelectedService(serviceId);
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 noise-overlay" data-testid="home-page">
      <HeroSection onBookClick={scrollToBooking} />
      <ServicesSection onServiceSelect={handleServiceSelect} />
      <BookingSection selectedService={selectedService} onServiceChange={setSelectedService} />
      
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm">© 2025 WestCutz. Alle rettigheter reservert.</p>
          <div className="flex items-center gap-6">
            <a 
              href="https://www.tiktok.com/@salty_fadez" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
              data-testid="tiktok-link"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              <span className="text-sm">@salty_fadez</span>
            </a>
            <a 
              href="tel:45392948" 
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">453 92 948</span>
            </a>
            <Link 
              to="/admin" 
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              data-testid="admin-link"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </footer>
      
      <Toaster position="top-center" />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
