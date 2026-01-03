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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Services data
const SERVICES = [
  { id: "fade", name: "VANLIG KLIPP (FADE)", price: 300, duration: 45, desc: "Moderne fade med presisjon" },
  { id: "skjegg", name: "SKJEGG TRIM", price: 150, duration: 20, desc: "Rene linjer og forming" },
  { id: "fade-skjegg", name: "KLIPP OG SKJEGG", price: 400, duration: 60, desc: "Komplett pakke" },
  { id: "dame", name: "DAMEKLIPP", price: 300, duration: 45, desc: "Styling og klipp" }
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
    if (selectedDate) {
      fetchTimeSlots(format(selectedDate, "yyyy-MM-dd"));
    }
  }, [selectedDate]);

  const fetchTimeSlots = async (date) => {
    setLoadingSlots(true);
    try {
      const response = await axios.get(`${API}/time-slots/${date}`);
      setTimeSlots(response.data);
    } catch (error) {
      console.error("Error fetching time slots:", error);
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
        date: format(selectedDate, "yyyy-MM-dd"),
        time_slot: selectedTime
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
  };

  // Disable past dates
  const disabledDays = { before: new Date() };

  return (
    <div className="max-w-md mx-auto p-6 border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm animate-fade-in">
      <StepIndicator currentStep={step} />

      {/* Step 1: Select Date */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="heading-font text-xl text-center text-zinc-50 mb-6">VELG DATO</h3>
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
            {selectedDate && format(selectedDate, "EEEE d. MMMM yyyy", { locale: nb })}
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
            </div>
            <p className="text-zinc-500 text-xs mt-2">Varighet: 45 min | Pris: 300 kr</p>
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
              <span>Fade (45 min) — 300 kr</span>
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
        SALTY<br />FADEZ
      </h1>
      <p className="text-zinc-400 text-base md:text-lg max-w-md mb-8">
        Premium fades med presisjon og stil. 
        Bestill time på sekunder.
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
const ServicesSection = () => (
  <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24 border-t border-zinc-800">
    <h2 className="heading-font text-3xl md:text-4xl text-zinc-50 mb-12 text-center">
      VÅRE TJENESTER
    </h2>
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[
        { name: "FADE", price: "300 kr", duration: "45 min", desc: "Moderne fade med presisjon" },
        { name: "KLASSISK KLIPP", price: "250 kr", duration: "30 min", desc: "Tradisjonell herreklipp" },
        { name: "SKJEGG TRIM", price: "150 kr", duration: "20 min", desc: "Rene linjer og forming" }
      ].map((service) => (
        <div key={service.name} className="card-sharp group">
          <h3 className="heading-font text-xl text-zinc-50 mb-2">{service.name}</h3>
          <p className="text-zinc-400 text-sm mb-4">{service.desc}</p>
          <div className="flex justify-between items-center">
            <span className="text-red-500 font-bold text-lg">{service.price}</span>
            <span className="text-zinc-500 text-sm">{service.duration}</span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// Booking section
const BookingSection = ({ bookingRef }) => (
  <section 
    ref={bookingRef}
    id="booking"
    className="py-16 md:py-24 px-6 md:px-12 lg:px-24 border-t border-zinc-800"
  >
    <h2 className="heading-font text-3xl md:text-4xl text-zinc-50 mb-12 text-center">
      BESTILL TIME
    </h2>
    <BookingForm />
  </section>
);

// Main Home component
const Home = () => {
  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 noise-overlay" data-testid="home-page">
      <HeroSection onBookClick={scrollToBooking} />
      <ServicesSection />
      <BookingSection />
      
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm">© 2025 Salty Fadez. Alle rettigheter reservert.</p>
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
