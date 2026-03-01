from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from resend import Resend

# ----------------------------
# Load environment variables
# ----------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "saltyfadez2025")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "booking@westcutz.no")
RESEND_API_KEY = os.environ["RESEND_API_KEY"]

# ----------------------------
# Database
# ----------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ----------------------------
# Logging
# ----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ----------------------------
# FastAPI app and router
# ----------------------------
app = FastAPI(title="WestCutz API")
api_router = APIRouter(prefix="/api")
security = HTTPBasic()

# ----------------------------
# CORS Middleware
# ----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://westcutz.netlify.app",
        "https://westcutz.no",
        "https://www.westcutz.no",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Barber configuration
# ----------------------------
BARBERS = {"marius": "Marius", "sivert": "Sivert"}
OPENING_HOUR = 9
CLOSING_HOUR = 18
SLOT_DURATION = 45  # minutes

BARBER_HOURS = {
    "sivert": {"weekday": (16, 21), "wednesday": (14, 21), "weekend": (OPENING_HOUR, CLOSING_HOUR)},
    "marius": {"weekday": (OPENING_HOUR, 20), "wednesday": (OPENING_HOUR, 20), "weekend": (OPENING_HOUR, CLOSING_HOUR)},
}

def get_open_close_hours(barber_id: str, date_str: str) -> tuple[int, int]:
    barber_id = (barber_id or "marius").lower()
    cfg = BARBER_HOURS.get(barber_id, BARBER_HOURS["marius"])
    d = datetime.strptime(date_str, "%Y-%m-%d")
    wd = d.weekday()
    if wd >= 5:
        return cfg["weekend"]
    if wd == 2:
        return cfg["wednesday"]
    return cfg["weekday"]

def generate_time_slots(open_hour: int, close_hour: int) -> list[str]:
    slots: list[str] = []
    start = datetime(2000, 1, 1, open_hour, 0)
    end = datetime(2000, 1, 1, close_hour, 0)
    step = timedelta(minutes=SLOT_DURATION)
    current = start
    while current + step <= end:
        slots.append(current.strftime("%H:%M"))
        current += step
    return slots

# ----------------------------
# Pydantic models
# ----------------------------
class BookingCreate(BaseModel):
    customer_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    barber_id: str = "marius"
    barber_name: Optional[str] = None
    date: str  # YYYY-MM-DD
    time_slot: str  # HH:MM
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
    amount: int = 300
    phone_number: Optional[str] = None

class Absence(BaseModel):
    barber_id: str
    date: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ----------------------------
# Admin authentication
# ----------------------------
def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not correct_password:
        raise HTTPException(status_code=401, detail="Feil passord", headers={"WWW-Authenticate": "Basic"})
    return True

# ----------------------------
# Email sending via Resend API
# ----------------------------
resend_client = Resend(RESEND_API_KEY)

async def send_booking_confirmation_email(booking: Booking):
    if not booking.email:
        logger.info(f"Skipping email: email={booking.email}")
        return None
    try:
        date_obj = datetime.strptime(booking.date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d. %B %Y")
    except Exception:
        formatted_date = booking.date

    html_content = f"""
    <html><body>
    Hei {booking.customer_name}, din time er bekreftet: {formatted_date} kl. {booking.time_slot}<br>
    Frisør: {booking.barber_name}<br>
    Tjeneste: {booking.service_name} ({booking.service_duration} min)
    </body></html>
    """
    try:
        resend_client.emails.send(
            from_email=SENDER_EMAIL,
            to=[booking.email],
            subject="Bekreftelse på booking",
            html=html_content
        )
        logger.info(f"Confirmation email sent to {booking.email}")
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {str(e)}")

# ----------------------------
# API Endpoints
# ----------------------------
@api_router.get("/")
async def root():
    return {"message": "WestCutz API"}

@api_router.get("/barbers")
async def list_barbers():
    return [{"id": bid, "name": name} for bid, name in BARBERS.items()]

@api_router.get("/time-slots/{date}", response_model=List[TimeSlot])
async def get_available_time_slots(date: str, barber_id: str = "marius"):
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Ugyldig datoformat. Bruk YYYY-MM-DD")

    absence = await db.absences.find_one({"barber_id": barber_id, "date": date})
    if absence:
        return []

    open_h, close_h = get_open_close_hours(barber_id, date)
    all_slots = generate_time_slots(open_h, close_h)

    existing_bookings = await db.bookings.find(
        {"date": date, "status": {"$ne": "cancelled"}, "barber_id": barber_id},
        {"_id": 0, "time_slot": 1},
    ).to_list(100)
    booked_times = {b["time_slot"] for b in existing_bookings}

    today = datetime.now(timezone.utc).date()
    if booking_date < today:
        return [TimeSlot(time=s, available=False) for s in all_slots]
    if booking_date == today:
        now_hhmm = datetime.now(timezone.utc).strftime("%H:%M")
        return [TimeSlot(time=s, available=(s not in booked_times and s > now_hhmm)) for s in all_slots]

    return [TimeSlot(time=s, available=(s not in booked_times)) for s in all_slots]

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
    if not booking_data.phone and not booking_data.email:
        raise HTTPException(status_code=400, detail="Vennligst oppgi telefon eller e-post")

    try:
        booking_date = datetime.strptime(booking_data.date, "%Y-%m-%d").date()
        if booking_date < datetime.now(timezone.utc).date():
            raise HTTPException(status_code=400, detail="Kan ikke booke tid i fortiden")
    except ValueError:
        raise HTTPException(status_code=400, detail="Ugyldig datoformat. Bruk YYYY-MM-DD")

    absence = await db.absences.find_one({"barber_id": booking_data.barber_id, "date": booking_data.date})
    if absence:
        raise HTTPException(status_code=400, detail="Frisøren er ikke tilgjengelig denne dagen")

    open_h, close_h = get_open_close_hours(booking_data.barber_id, booking_data.date)
    valid_slots = set(generate_time_slots(open_h, close_h))
    if booking_data.time_slot not in valid_slots:
        raise HTTPException(status_code=400, detail="Tiden er ikke tilgjengelig")

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
        barber_name=BARBERS.get(booking_data.barber_id, booking_data.barber_id),
        date=booking_data.date,
        time_slot=booking_data.time_slot,
        service_id=booking_data.service_id,
        service_name=booking_data.service_name,
        service_price=booking_data.service_price,
        service_duration=booking_data.service_duration
    )

    await db.bookings.insert_one(booking.model_dump())
    asyncio.create_task(send_booking_confirmation_email(booking))
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(date: Optional[str] = None, barber_id: Optional[str] = None):
    query = {"status": {"$ne": "cancelled"}}
    if date:
        query["date"] = date
    if barber_id:
        query["barber_id"] = barber_id
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Bestilling ikke funnet")
    return booking

@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bestilling ikke funnet")
    return {"message": "Bestilling kansellert"}

@api_router.post("/admin/login")
async def admin_login(login: AdminLogin):
    if secrets.compare_digest(login.password, ADMIN_PASSWORD):
        return {"success": True, "message": "Innlogget"}
    raise HTTPException(status_code=401, detail="Feil passord")

@api_router.post("/admin/absence")
async def toggle_absence(data: Absence, _: bool = Depends(verify_admin)):
    existing = await db.absences.find_one({"barber_id": data.barber_id, "date": data.date})
    if existing:
        await db.absences.delete_one({"_id": existing["_id"]})
        return {"status": "removed"}
    else:
        await db.absences.insert_one(data.model_dump())
        return {"status": "added"}

# ----------------------------
# Include router at the END
# ----------------------------
app.include_router(api_router)

# ----------------------------
# Shutdown database
# ----------------------------
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
