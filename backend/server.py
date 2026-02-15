from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import secrets
import resend
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend email config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Admin password
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'saltyfadez2025')

# Create the main app
app = FastAPI()

# Create routers
api_router = APIRouter(prefix="/api")
security = HTTPBasic()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define Models
class BookingCreate(BaseModel):
    customer_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    barber_id: str = "marius"  # marius | sivert
    barber_name: Optional[str] = None  # optional, derived from barber_id if missing
    date: str  # Format: YYYY-MM-DD
    time_slot: str  # Format: HH:MM
    service_id: Optional[str] = "fade"
    service_name: Optional[str] = "VANLIG KLIPP (FADE)"
    service_price: Optional[int] = 300
    service_duration: Optional[int] = 45

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    barber_id: str = "marius"
    barber_name: Optional[str] = None
    date: str
    time_slot: str
    service_id: str = "fade"
    service_name: str = "VANLIG KLIPP (FADE)"
    service_price: int = 300
    service_duration: int = 45
    status: str = "confirmed"
    payment_status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TimeSlot(BaseModel):
    time: str
    available: bool

class AdminLogin(BaseModel):
    password: str

class VippsPaymentRequest(BaseModel):
    booking_id: str
    amount: int = 300  # NOK
    phone_number: Optional[str] = None

# Business hours configuration (default)
OPENING_HOUR = 9   # 09:00
CLOSING_HOUR = 18  # 18:00
SLOT_DURATION = 45  # minutes

# Per-barber opening rules
# weekday = Man–Fre, wednesday = Ons, weekend = Lør–Søn
BARBER_HOURS = {
    "sivert": {
        "weekday": (16, 21),            # Man–Fre: 16–21
        "wednesday": (14, 21),          # Ons: 14–21
        "weekend": (OPENING_HOUR, CLOSING_HOUR),  # Lør–Søn: 09–18
    },
    "marius": {
        "weekday": (OPENING_HOUR, 20),  # Man–Fre: 09–20
        "wednesday": (OPENING_HOUR, 20),# Ons: 09–20
        "weekend": (OPENING_HOUR, CLOSING_HOUR),  # Lør–Søn: 09–18
    },
}

def get_open_close_hours(barber_id: str, date_str: str) -> tuple[int, int]:
    barber_id = (barber_id or "marius").lower()
    cfg = BARBER_HOURS.get(barber_id, BARBER_HOURS["marius"])

    d = datetime.strptime(date_str, "%Y-%m-%d")
    wd = d.weekday()  # 0=Mon ... 6=Sun

    if wd >= 5:       # Sat/Sun
        return cfg["weekend"]
    if wd == 2:       # Wednesday
        return cfg["wednesday"]
    return cfg["weekday"]

def generate_time_slots(open_hour: int, close_hour: int) -> list[str]:
    """
    Genererer start-tider i 45-min slots.
    Regelen: siste start må ha plass til 45 min før close_hour.
    Eks: open=16, close=21 => siste start 20:15.
    """
    slots: list[str] = []
    start = datetime(2000, 1, 1, open_hour, 0)
    end = datetime(2000, 1, 1, close_hour, 0)
    step = timedelta(minutes=SLOT_DURATION)

    current = start
    while current + step <= end:
        slots.append(current.strftime("%H:%M"))
        current += step

    return slots

@api_router.get("/time-slots/{date}", response_model=List[TimeSlot])
async def get_available_time_slots(date: str, barber_id: str = "marius"):
    """
    Returnerer ledige tider for gitt dato og frisør.
    """
    # Validate date format
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Ugyldig datoformat. Bruk YYYY-MM-DD")

    # Hours per barber/day
    open_h, close_h = get_open_close_hours(barber_id, date)
    all_slots = generate_time_slots(open_h, close_h)

    logger.info(f"time-slots: date={date} barber_id={barber_id} hours={open_h}-{close_h} slots={len(all_slots)}")

    # Existing bookings for this barber/date
    existing_bookings = await db.bookings.find(
        {"date": date, "status": {"$ne": "cancelled"}, "barber_id": barber_id},
        {"_id": 0, "time_slot": 1}
    ).to_list(100)

    booked_times = {b["time_slot"] for b in existing_bookings}

    today = datetime.now(timezone.utc).date()

    if booking_date < today:
        return [TimeSlot(time=s, available=False) for s in all_slots]

    if booking_date == today:
        now_hhmm = datetime.now(timezone.utc).strftime("%H:%M")
        return [
            TimeSlot(time=s, available=(s not in booked_times and s > now_hhmm))
            for s in all_slots
        ]

    return [TimeSlot(time=s, available=(s not in booked_times)) for s in all_slots]

# Email sending function
async def send_booking_confirmation_email(booking: Booking):
    """Send booking confirmation email"""
    if not booking.email or not RESEND_API_KEY:
        logger.info(f"Skipping email: email={booking.email}, has_key={bool(RESEND_API_KEY)}")
        return None

    # Format date nicely
    try:
        date_obj = datetime.strptime(booking.date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d. %B %Y")
    except Exception:
        formatted_date = booking.date

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #fafafa; padding: 40px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 30px; border: 1px solid #27272a;">
            <h1 style="font-size: 28px; margin: 0 0 20px 0; color: #fafafa;">West Cutz</h1>
            <h2 style="font-size: 20px; color: #dc2626; margin: 0 0 20px 0;">Bestilling bekreftet!</h2>

            <p style="color: #a1a1aa; margin-bottom: 20px;">Hei {booking.customer_name},</p>
            <p style="color: #a1a1aa; margin-bottom: 30px;">Din time er bekreftet. Her er detaljene:</p>

            <div style="background-color: #27272a; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #fafafa;"><strong>Tjeneste:</strong> {booking.service_name} ({booking.service_duration} min)</p>
                <p style="margin: 0 0 10px 0; color: #fafafa;"><strong>Dato:</strong> {formatted_date}</p>
                <p style="margin: 0 0 10px 0; color: #fafafa;"><strong>Tid:</strong> {booking.time_slot}</p>
                <strong>Frisør:</strong> {booking.barber_name or BARBERS.get(booking.barber_id, booking.barber_id)}<br>
                <p style="margin: 0; color: #dc2626;"><strong>Pris:</strong> {booking.service_price} kr</p>
            </div>

            <div style="background-color: #27272a; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 5px 0; color: #a1a1aa; font-size: 14px;">Adresse:</p>
                <p style="margin: 0; color: #fafafa;">Hans Blomgate 10, 6905 Florø</p>
            </div>

            <p style="color: #a1a1aa; font-size: 14px;">
                Trenger du å endre eller kansellere? Ring oss på <strong style="color: #fafafa;">453 92 948</strong>
            </p>

            <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
                © 2025 WestCutz | Hans Blomgate 10, 6905 Florø
            </p>
        </div>
    </body>
    </html>
    """

    params = {
        "from": SENDER_EMAIL,
        "to": [booking.email],
        "subject": f"Bekreftelse - WestCutz {formatted_date} kl. {booking.time_slot}",
        "html": html_content
    }

    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Confirmation email sent to {booking.email}")
        return email
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return None

# Admin authentication
def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin password"""
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not correct_password:
        raise HTTPException(
            status_code=401,
            detail="Feil passord",
            headers={"WWW-Authenticate": "Basic"},
        )
    return True

@api_router.get("/")
async def root():
    return {"message": "WestCutz API"}

@api_router.get("/barbers")
async def list_barbers():
    """List supported barbers"""
    return [{"id": bid, "name": name} for bid, name in BARBERS.items()]

@api_router.post("/admin/login")
async def admin_login(login: AdminLogin):
    """Verify admin password"""
    if secrets.compare_digest(login.password, ADMIN_PASSWORD):
        return {"success": True, "message": "Innlogget"}
    raise HTTPException(status_code=401, detail="Feil passord")

@api_router.get("/time-slots/{date}", response_model=List[TimeSlot])
async def get_available_time_slots(date: str, barber_id: str = "marius"):
    """Get available time slots for a specific date (per barber hours)."""

    # Validate date format early
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Ugyldig datoformat. Bruk YYYY-MM-DD")

    # Determine hours for this barber/day and generate slots
    open_h, close_h = get_open_close_hours(barber_id, date)
    all_slots = generate_time_slots(open_h, close_h)

    existing_bookings = await db.bookings.find(
        {"date": date, "status": {"$ne": "cancelled"}, "barber_id": barber_id},
        {"_id": 0, "time_slot": 1}
    ).to_list(100)

    booked_times = {b["time_slot"] for b in existing_bookings}

    today = datetime.now(timezone.utc).date()

    # Past dates: no available
    if booking_date < today:
        return [TimeSlot(time=slot, available=False) for slot in all_slots]

    # Today: filter out past times
    if booking_date == today:
        current_time = datetime.now(timezone.utc).strftime("%H:%M")
        return [
            TimeSlot(time=slot, available=(slot not in booked_times and slot > current_time))
            for slot in all_slots
        ]

    # Future
    return [TimeSlot(time=slot, available=(slot not in booked_times)) for slot in all_slots]

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
    """Create a new booking"""
    if not booking_data.phone and not booking_data.email:
        raise HTTPException(status_code=400, detail="Vennligst oppgi telefon eller e-post")

    # Validate date format and not in the past
    try:
        booking_date = datetime.strptime(booking_data.date, "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        if booking_date < today:
            raise HTTPException(status_code=400, detail="Kan ikke booke tid i fortiden")
    except ValueError:
        raise HTTPException(status_code=400, detail="Ugyldig datoformat. Bruk YYYY-MM-DD")

     # Validate time_slot is within barber/day allowed hours
    open_h, close_h = get_open_close_hours(booking_data.barber_id, booking_data.date)
    valid_slots = set(generate_time_slots(open_h, close_h))
    if booking_data.time_slot not in valid_slots:
        raise HTTPException(status_code=400, detail="Tiden er ikke tilgjengelig for valgt frisør/dato")

    # Check if slot already booked
    existing = await db.bookings.find_one({
        "date": booking_data.date,
        "time_slot": booking_data.time_slot,
        "barber_id": booking_data.barber_id,
        "status": {"$ne": "cancelled"}
    })

    if existing:
        raise HTTPException(status_code=400, detail="Denne tiden er allerede booket")

    booking = Booking(
        customer_name=booking_data.customer_name,
        phone=booking_data.phone,
        email=booking_data.email,
        barber_id=booking_data.barber_id,
        barber_name=booking_data.barber_name or BARBERS.get(booking_data.barber_id, booking_data.barber_id),
        date=booking_data.date,
        time_slot=booking_data.time_slot,
        service_id=booking_data.service_id,
        service_name=booking_data.service_name,
        service_price=booking_data.service_price,
        service_duration=booking_data.service_duration
    )

    doc = booking.model_dump()
    await db.bookings.insert_one(doc)

    asyncio.create_task(send_booking_confirmation_email(booking))

    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(date: Optional[str] = None, barber_id: Optional[str] = None):
    """Get all bookings, optionally filtered by date and barber."""
    query = {"status": {"$ne": "cancelled"}}
    if date:
        query["date"] = date
    if barber_id:
        query["barber_id"] = barber_id

    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    """Get a specific booking by ID"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Bestilling ikke funnet")
    return booking

@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    """Cancel a booking"""
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled"}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bestilling ikke funnet")

    return {"message": "Bestilling kansellert"}

# Vipps Payment Endpoints (Placeholder - ready for real integration)
@api_router.post("/vipps/initiate")
async def initiate_vipps_payment(payment: VippsPaymentRequest):
    """
    Initiate Vipps payment for a booking.
    NOTE: This is a placeholder.
    """
    booking = await db.bookings.find_one({"id": payment.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Bestilling ikke funnet")

    vipps_client_id = os.environ.get('VIPPS_CLIENT_ID')
    if not vipps_client_id:
        return {
            "status": "mock",
            "message": "Vipps er ikke konfigurert ennå. Legg til VIPPS_CLIENT_ID i .env",
            "booking_id": payment.booking_id,
            "amount": payment.amount,
            "payment_url": None,
            "instructions": "For å aktivere Vipps, registrer deg på Vipps Portal og legg til nøklene i backend/.env"
        }

    return {
        "status": "pending",
        "booking_id": payment.booking_id,
        "amount": payment.amount,
        "payment_url": f"https://api.vipps.no/checkout/{payment.booking_id}"
    }

@api_router.post("/vipps/callback")
async def vipps_callback(data: dict):
    booking_id = data.get("reference")
    status = data.get("status")

    if booking_id and status == "SALE":
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"payment_status": "paid"}}
        )
        return {"message": "Payment recorded"}

    return {"message": "Callback received"}

@api_router.get("/vipps/status/{booking_id}")
async def get_vipps_status(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0, "payment_status": 1})
    if not booking:
        raise HTTPException(status_code=404, detail="Bestilling ikke funnet")

    return {"booking_id": booking_id, "payment_status": booking.get("payment_status", "pending")}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
