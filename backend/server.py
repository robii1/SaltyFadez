from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class BookingCreate(BaseModel):
    customer_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    date: str  # Format: YYYY-MM-DD
    time_slot: str  # Format: HH:MM

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    date: str
    time_slot: str
    duration: int = 45  # minutes
    status: str = "confirmed"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TimeSlot(BaseModel):
    time: str
    available: bool

# Business hours configuration
OPENING_HOUR = 9  # 9 AM
CLOSING_HOUR = 18  # 6 PM
SLOT_DURATION = 45  # minutes

def generate_time_slots():
    """Generate all possible time slots for a day"""
    slots = []
    current = datetime.strptime(f"{OPENING_HOUR}:00", "%H:%M")
    end = datetime.strptime(f"{CLOSING_HOUR}:00", "%H:%M")
    
    while current < end:
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=SLOT_DURATION)
    
    return slots

ALL_TIME_SLOTS = generate_time_slots()

@api_router.get("/")
async def root():
    return {"message": "Barber Booking API"}

@api_router.get("/time-slots/{date}", response_model=List[TimeSlot])
async def get_available_time_slots(date: str):
    """Get available time slots for a specific date"""
    # Get all bookings for the date
    existing_bookings = await db.bookings.find(
        {"date": date, "status": {"$ne": "cancelled"}},
        {"_id": 0, "time_slot": 1}
    ).to_list(100)
    
    booked_times = {b["time_slot"] for b in existing_bookings}
    
    # Check if date is in the past
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        
        if booking_date < today:
            # All slots unavailable for past dates
            return [TimeSlot(time=slot, available=False) for slot in ALL_TIME_SLOTS]
        
        # For today, filter out past time slots
        if booking_date == today:
            current_time = datetime.now(timezone.utc).strftime("%H:%M")
            return [
                TimeSlot(
                    time=slot, 
                    available=slot not in booked_times and slot > current_time
                ) 
                for slot in ALL_TIME_SLOTS
            ]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    return [
        TimeSlot(time=slot, available=slot not in booked_times) 
        for slot in ALL_TIME_SLOTS
    ]

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
    """Create a new booking"""
    # Validate that at least phone or email is provided
    if not booking_data.phone and not booking_data.email:
        raise HTTPException(
            status_code=400, 
            detail="Please provide either phone number or email"
        )
    
    # Check if slot is already booked
    existing = await db.bookings.find_one({
        "date": booking_data.date,
        "time_slot": booking_data.time_slot,
        "status": {"$ne": "cancelled"}
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="This time slot is already booked"
        )
    
    # Validate date is not in the past
    try:
        booking_date = datetime.strptime(booking_data.date, "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        
        if booking_date < today:
            raise HTTPException(
                status_code=400, 
                detail="Cannot book appointments in the past"
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Create booking
    booking = Booking(
        customer_name=booking_data.customer_name,
        phone=booking_data.phone,
        email=booking_data.email,
        date=booking_data.date,
        time_slot=booking_data.time_slot
    )
    
    doc = booking.model_dump()
    await db.bookings.insert_one(doc)
    
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(date: Optional[str] = None):
    """Get all bookings, optionally filtered by date"""
    query = {"status": {"$ne": "cancelled"}}
    if date:
        query["date"] = date
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    """Get a specific booking by ID"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    """Cancel a booking"""
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking cancelled successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
