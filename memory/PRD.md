# Sharp Cuts - Barber Booking Website PRD

## Original Problem Statement
Build a barber website where you can book haircuts. Just haircuts for now, simple date/time selection, duration is about 30-45 min, guest booking with just phone number and/or email. Minimal design.

## User Personas
- **Primary**: Local customers looking to quickly book a haircut appointment
- **Secondary**: Barbershop owner managing appointments

## Core Requirements
- [x] Haircut booking with date/time selection
- [x] 30-45 minute appointment slots
- [x] Guest booking (no authentication required)
- [x] Contact via phone number OR email
- [x] Minimal, modern dark design

## What's Been Implemented (December 26, 2025)

### Backend (FastAPI)
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - List all bookings (optional date filter)
- `GET /api/bookings/{id}` - Get specific booking
- `DELETE /api/bookings/{id}` - Cancel booking
- `GET /api/time-slots/{date}` - Get available time slots for date
- Business hours: 9 AM - 6 PM, 45-min slots
- MongoDB storage for bookings

### Frontend (React)
- Hero section with "SHARP CUTS" branding
- Services section (Classic Cut, Fade & Style, Beard Trim)
- 4-step booking flow:
  1. Select Date (Calendar)
  2. Select Time (Available slots grid)
  3. Enter Details (Name, Phone/Email)
  4. Confirmation
- Toast notifications for feedback
- Mobile-responsive design
- Dark theme with red accents (Swiss brutalist style)

### Design System
- Fonts: Anton (headings), Manrope (body)
- Colors: Zinc-950 bg, Red-600 accent, Zinc-50 text
- Sharp edges (rounded-none)

## Testing Results
- Backend: 100% passed (16/16 tests)
- Frontend: 95% passed (booking flow end-to-end)

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Basic booking functionality
- [x] Date/time selection
- [x] Guest booking form

### P1 (High Priority)
- [ ] Email/SMS confirmation notifications
- [ ] Admin dashboard to view/manage bookings
- [ ] Multiple barbers support

### P2 (Medium Priority)
- [ ] Multiple service types with different durations
- [ ] Business hours configuration
- [ ] Blocked dates/holidays support
- [ ] Google Calendar integration

### P3 (Nice to Have)
- [ ] Customer reviews/testimonials
- [ ] Gallery/portfolio section
- [ ] Online payment option
- [ ] Waitlist for fully booked days

## Next Tasks
1. Add email confirmation using SendGrid/Resend
2. Build admin dashboard to manage appointments
3. Add multiple barber support
