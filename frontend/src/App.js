import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Scissors, Calendar as CalendarIcon, Clock, Phone, Mail, Check, MapPin } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Step indicator component
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { num: 1, label: "Date" },
    { num: 2, label: "Time" },
    { num: 3, label: "Details" },
    { num: 4, label: "Done" }
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
const BookingForm = () => {
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
      toast.error("Failed to load available times");
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
      toast.error("Please provide either phone number or email");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter your name");
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
      toast.success("Booking confirmed!");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(error.response?.data?.detail || "Failed to create booking");
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
          <h3 className="heading-font text-xl text-center text-zinc-50 mb-6">SELECT DATE</h3>
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
              ← Back
            </button>
            <h3 className="heading-font text-xl text-zinc-50">SELECT TIME</h3>
            <div className="w-12"></div>
          </div>
          
          <p className="text-zinc-400 text-center text-sm mb-4">
            {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>

          {loadingSlots ? (
            <div className="text-center text-zinc-400 py-8">Loading available times...</div>
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
              No available slots for this date. Please select another date.
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
              ← Back
            </button>
            <h3 className="heading-font text-xl text-zinc-50">YOUR DETAILS</h3>
            <div className="w-12"></div>
          </div>

          <div className="bg-zinc-800/50 p-4 mb-6 border border-zinc-700">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <CalendarIcon className="w-4 h-4 text-red-500" />
              <span>{selectedDate && format(selectedDate, "MMMM d, yyyy")}</span>
              <Clock className="w-4 h-4 text-red-500 ml-4" />
              <span>{selectedTime}</span>
            </div>
            <p className="text-zinc-500 text-xs mt-2">Duration: 45 min</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-zinc-300 text-sm">Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="input-sharp mt-1"
                required
                data-testid="input-name"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-zinc-300 text-sm">
                <Phone className="w-3 h-3 inline mr-1" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="input-sharp mt-1"
                data-testid="input-phone"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-zinc-300 text-sm">
                <Mail className="w-3 h-3 inline mr-1" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="input-sharp mt-1"
                data-testid="input-email"
              />
            </div>

            <p className="text-zinc-500 text-xs">* Phone or email required for confirmation</p>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full btn-sharp bg-red-600 hover:bg-red-700 text-white"
              data-testid="submit-booking-btn"
            >
              {submitting ? "BOOKING..." : "CONFIRM BOOKING"}
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
          
          <h3 className="heading-font text-2xl text-zinc-50">BOOKING CONFIRMED</h3>
          
          <div className="bg-zinc-800/50 p-6 border border-zinc-700 text-left space-y-3">
            <div className="flex items-center gap-3 text-zinc-300">
              <Scissors className="w-4 h-4 text-red-500" />
              <span>Haircut (45 min)</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <CalendarIcon className="w-4 h-4 text-red-500" />
              <span>{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <Clock className="w-4 h-4 text-red-500" />
              <span>{selectedTime}</span>
            </div>
          </div>

          <p className="text-zinc-400 text-sm">
            {bookingConfirmed.email 
              ? `Confirmation sent to ${bookingConfirmed.email}`
              : bookingConfirmed.phone 
              ? `We'll text you at ${bookingConfirmed.phone}`
              : "See you soon!"
            }
          </p>

          <Button
            onClick={resetBooking}
            variant="outline"
            className="btn-sharp border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            data-testid="book-another-btn"
          >
            BOOK ANOTHER
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
        SHARP<br />CUTS
      </h1>
      <p className="text-zinc-400 text-base md:text-lg max-w-md mb-8">
        Premium haircuts with precision and style. 
        Book your appointment in seconds.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={onBookClick}
          className="btn-sharp bg-red-600 hover:bg-red-700 text-white"
          data-testid="book-now-btn"
        >
          <Scissors className="w-4 h-4 mr-2" />
          BOOK NOW
        </Button>
        <Button 
          variant="outline"
          className="btn-sharp border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          VIEW SERVICES
        </Button>
      </div>
      
      {/* Quick info */}
      <div className="flex flex-wrap gap-6 mt-12 text-zinc-400 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-500" />
          <span>Mon-Sat 9AM-6PM</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500" />
          <span>123 Main Street</span>
        </div>
      </div>
    </div>

    {/* Right: Image */}
    <div className="flex-1 relative min-h-[50vh] lg:min-h-screen">
      <img
        src="https://images.unsplash.com/photo-1520338661084-680395057c93?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
        alt="Barber focusing on a cut"
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
      OUR SERVICES
    </h2>
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[
        { name: "CLASSIC CUT", price: "$35", duration: "30-45 min", desc: "Traditional precision haircut" },
        { name: "FADE & STYLE", price: "$45", duration: "45 min", desc: "Modern fade with styling" },
        { name: "BEARD TRIM", price: "$20", duration: "20 min", desc: "Clean lines and shaping" }
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
      BOOK YOUR CUT
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
      <footer className="py-8 px-6 border-t border-zinc-800 text-center text-zinc-500 text-sm">
        <p>© 2025 Sharp Cuts. All rights reserved.</p>
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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
