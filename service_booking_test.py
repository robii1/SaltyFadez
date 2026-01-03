import requests
import sys
from datetime import datetime, timedelta
import json
import time

class ServiceBookingTester:
    def __init__(self, base_url="https://trim-time-109.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Services to test
        self.services = [
            {"id": "fade", "name": "VANLIG KLIPP (FADE)", "price": 300, "duration": 45},
            {"id": "skjegg", "name": "SKJEGG TRIM", "price": 150, "duration": 20},
            {"id": "fade-skjegg", "name": "KLIPP OG SKJEGG", "price": 400, "duration": 60},
            {"id": "dame", "name": "DAMEKLIPP", "price": 300, "duration": 45}
        ]

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, None

    def find_available_time_slot(self, date):
        """Find an available time slot for the given date"""
        try:
            response = requests.get(f"{self.api_url}/time-slots/{date}", timeout=10)
            if response.status_code == 200:
                slots = response.json()
                for slot in slots:
                    if slot.get('available', False):
                        return slot['time']
            return None
        except:
            return None

    def test_service_booking_with_correct_data(self):
        """Test booking with each service and verify correct data is stored"""
        future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        for i, service in enumerate(self.services):
            # Find an available time slot
            available_time = self.find_available_time_slot(future_date)
            if not available_time:
                # Try next day if no slots available
                future_date = (datetime.now() + timedelta(days=6 + i)).strftime("%Y-%m-%d")
                available_time = self.find_available_time_slot(future_date)
            
            if not available_time:
                self.log_test(f"Service {service['id']} - Find Available Slot", False, "No available slots found")
                continue
            
            booking_data = {
                "customer_name": f"Test Customer {service['id']}",
                "phone": f"555-{100 + i:03d}-{200 + i:03d}",
                "email": f"test_{service['id']}@example.com",
                "date": future_date,
                "time_slot": available_time,
                "service_id": service["id"],
                "service_name": service["name"],
                "service_price": service["price"],
                "service_duration": service["duration"]
            }
            
            success, response = self.run_test(
                f"Book {service['name']} Service",
                "POST",
                "bookings",
                200,
                data=booking_data
            )
            
            if success and response:
                try:
                    booking_response = response.json()
                    
                    # Verify service data is correctly stored
                    checks = [
                        (booking_response.get('service_id') == service['id'], "Service ID"),
                        (booking_response.get('service_name') == service['name'], "Service Name"),
                        (booking_response.get('service_price') == service['price'], "Service Price"),
                        (booking_response.get('service_duration') == service['duration'], "Service Duration"),
                        (booking_response.get('date') == future_date, "Date"),
                        (booking_response.get('time_slot') == available_time, "Time Slot"),
                        (booking_response.get('customer_name') == booking_data['customer_name'], "Customer Name")
                    ]
                    
                    for check_result, check_name in checks:
                        self.log_test(f"{service['id']} - {check_name} Correct", check_result, 
                                    f"Expected vs Actual mismatch" if not check_result else "")
                    
                    # Store booking ID for later tests
                    setattr(self, f'booking_id_{service["id"]}', booking_response.get('id'))
                    
                except Exception as e:
                    self.log_test(f"{service['id']} - Response Parse", False, str(e))

    def test_double_booking_prevention(self):
        """Test that double booking is prevented"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        available_time = self.find_available_time_slot(future_date)
        
        if not available_time:
            self.log_test("Double Booking Test - Find Slot", False, "No available slots")
            return
        
        # Create first booking
        booking_data_1 = {
            "customer_name": "First Customer",
            "phone": "555-111-1111",
            "email": "first@example.com",
            "date": future_date,
            "time_slot": available_time,
            "service_id": "fade",
            "service_name": "VANLIG KLIPP (FADE)",
            "service_price": 300,
            "service_duration": 45
        }
        
        success1, response1 = self.run_test(
            "Create First Booking for Double Booking Test",
            "POST",
            "bookings",
            200,
            data=booking_data_1
        )
        
        if success1:
            # Try to create second booking for same slot
            booking_data_2 = {
                "customer_name": "Second Customer",
                "phone": "555-222-2222",
                "email": "second@example.com",
                "date": future_date,
                "time_slot": available_time,
                "service_id": "skjegg",
                "service_name": "SKJEGG TRIM",
                "service_price": 150,
                "service_duration": 20
            }
            
            success2, response2 = self.run_test(
                "Attempt Double Booking (Should Fail)",
                "POST",
                "bookings",
                400,
                data=booking_data_2
            )
            
            if success2 and response2:
                try:
                    error_response = response2.json()
                    expected_error = "Denne tiden er allerede booket"
                    if error_response.get('detail') == expected_error:
                        self.log_test("Double Booking Error Message Correct", True)
                    else:
                        self.log_test("Double Booking Error Message Correct", False, 
                                    f"Expected '{expected_error}', got '{error_response.get('detail')}'")
                except Exception as e:
                    self.log_test("Double Booking Error Parse", False, str(e))

    def test_time_slot_availability_update(self):
        """Test that time slots show as unavailable after booking"""
        future_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        
        # Get initial time slots
        success1, response1 = self.run_test(
            "Get Time Slots Before Booking",
            "GET",
            f"time-slots/{future_date}",
            200
        )
        
        if not success1 or not response1:
            return
        
        try:
            initial_slots = response1.json()
            available_slots = [slot for slot in initial_slots if slot.get('available', False)]
            
            if not available_slots:
                self.log_test("Time Slot Update Test - Available Slots", False, "No available slots found")
                return
            
            # Book the first available slot
            test_slot = available_slots[0]['time']
            booking_data = {
                "customer_name": "Slot Test Customer",
                "phone": "555-333-3333",
                "email": "slottest@example.com",
                "date": future_date,
                "time_slot": test_slot,
                "service_id": "fade",
                "service_name": "VANLIG KLIPP (FADE)",
                "service_price": 300,
                "service_duration": 45
            }
            
            success2, response2 = self.run_test(
                "Book Slot for Availability Test",
                "POST",
                "bookings",
                200,
                data=booking_data
            )
            
            if success2:
                # Wait a moment for the booking to be processed
                time.sleep(1)
                
                # Get time slots again
                success3, response3 = self.run_test(
                    "Get Time Slots After Booking",
                    "GET",
                    f"time-slots/{future_date}",
                    200
                )
                
                if success3 and response3:
                    try:
                        updated_slots = response3.json()
                        booked_slot = next((slot for slot in updated_slots if slot['time'] == test_slot), None)
                        
                        if booked_slot:
                            if not booked_slot.get('available', True):
                                self.log_test("Time Slot Marked Unavailable After Booking", True)
                            else:
                                self.log_test("Time Slot Marked Unavailable After Booking", False, 
                                            "Slot still shows as available")
                        else:
                            self.log_test("Time Slot Found in Updated List", False, "Booked slot not found")
                    except Exception as e:
                        self.log_test("Time Slot Update Parse", False, str(e))
        
        except Exception as e:
            self.log_test("Time Slot Update Test Setup", False, str(e))

    def test_email_sending_indication(self):
        """Test that email sending is attempted (check for no errors)"""
        future_date = (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%d")
        available_time = self.find_available_time_slot(future_date)
        
        if not available_time:
            self.log_test("Email Test - Find Slot", False, "No available slots")
            return
        
        booking_data = {
            "customer_name": "Email Test Customer",
            "phone": "555-444-4444",
            "email": "emailtest@example.com",
            "date": future_date,
            "time_slot": available_time,
            "service_id": "fade-skjegg",
            "service_name": "KLIPP OG SKJEGG",
            "service_price": 400,
            "service_duration": 60
        }
        
        success, response = self.run_test(
            "Create Booking with Email",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        if success and response:
            try:
                booking_response = response.json()
                # If booking succeeds, email sending was attempted
                # The actual email sending is async, so we can't directly verify it here
                # But we can check that the booking was created successfully with email
                if booking_response.get('email') == booking_data['email']:
                    self.log_test("Booking Created with Email Address", True)
                    print("📧 Note: Email sending is async. Check backend logs for Resend API calls.")
                else:
                    self.log_test("Booking Created with Email Address", False, "Email not stored correctly")
            except Exception as e:
                self.log_test("Email Booking Response Parse", False, str(e))

    def run_all_tests(self):
        """Run all service booking tests"""
        print("🧪 Starting Service Booking Tests...")
        print(f"🌐 Testing against: {self.api_url}")
        print("=" * 60)

        # Test service booking with correct data
        print("\n📋 Testing Service Booking with Correct Data...")
        self.test_service_booking_with_correct_data()
        
        # Test double booking prevention
        print("\n🚫 Testing Double Booking Prevention...")
        self.test_double_booking_prevention()
        
        # Test time slot availability updates
        print("\n⏰ Testing Time Slot Availability Updates...")
        self.test_time_slot_availability_update()
        
        # Test email sending indication
        print("\n📧 Testing Email Sending...")
        self.test_email_sending_indication()

        # Print summary
        print("=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All service booking tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = ServiceBookingTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())