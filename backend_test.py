import requests
import sys
from datetime import datetime, timedelta
import json

class BarberAPITester:
    def __init__(self, base_url="https://trim-time-109.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_get_time_slots_future_date(self):
        """Test getting time slots for a future date"""
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        success, response = self.run_test(
            f"Get Time Slots - Future Date ({future_date})",
            "GET",
            f"time-slots/{future_date}",
            200
        )
        
        if success and response:
            try:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if slots have required fields
                    first_slot = data[0]
                    if 'time' in first_slot and 'available' in first_slot:
                        self.log_test("Time Slots Structure Valid", True)
                        return True
                    else:
                        self.log_test("Time Slots Structure Valid", False, "Missing required fields")
                else:
                    self.log_test("Time Slots Data Valid", False, "Empty or invalid response")
            except Exception as e:
                self.log_test("Time Slots JSON Parse", False, str(e))
        
        return success

    def test_get_time_slots_past_date(self):
        """Test getting time slots for a past date (should be unavailable)"""
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        success, response = self.run_test(
            f"Get Time Slots - Past Date ({past_date})",
            "GET",
            f"time-slots/{past_date}",
            200
        )
        
        if success and response:
            try:
                data = response.json()
                # All slots should be unavailable for past dates
                all_unavailable = all(not slot['available'] for slot in data)
                self.log_test("Past Date Slots Unavailable", all_unavailable, 
                            "Past date slots should be unavailable")
            except Exception as e:
                self.log_test("Past Date Slots Check", False, str(e))
        
        return success

    def test_get_time_slots_invalid_date(self):
        """Test getting time slots with invalid date format"""
        success, response = self.run_test(
            "Get Time Slots - Invalid Date",
            "GET",
            "time-slots/invalid-date",
            400
        )
        return success

    def test_create_booking_valid(self):
        """Test creating a valid booking"""
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "Test Customer",
            "phone": "555-123-4567",
            "email": "test@example.com",
            "date": future_date,
            "time_slot": "10:00"
        }
        
        success, response = self.run_test(
            "Create Valid Booking",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        if success and response:
            try:
                data = response.json()
                # Store booking ID for later tests
                self.test_booking_id = data.get('id')
                self.log_test("Booking Response Valid", True, f"Booking ID: {self.test_booking_id}")
                return True, data
            except Exception as e:
                self.log_test("Booking Response Parse", False, str(e))
        
        return success, None

    def test_create_booking_no_contact(self):
        """Test creating booking without phone or email"""
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "Test Customer",
            "date": future_date,
            "time_slot": "11:00"
        }
        
        success, response = self.run_test(
            "Create Booking - No Contact Info",
            "POST",
            "bookings",
            400,
            data=booking_data
        )
        return success

    def test_create_booking_past_date(self):
        """Test creating booking for past date"""
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "Test Customer",
            "phone": "555-123-4567",
            "date": past_date,
            "time_slot": "10:00"
        }
        
        success, response = self.run_test(
            "Create Booking - Past Date",
            "POST",
            "bookings",
            400,
            data=booking_data
        )
        return success

    def test_create_duplicate_booking(self):
        """Test creating duplicate booking for same time slot"""
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "Test Customer 1",
            "phone": "555-111-1111",
            "date": future_date,
            "time_slot": "14:00"
        }
        
        # Create first booking
        success1, response1 = self.run_test(
            "Create First Booking",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        if success1:
            # Try to create duplicate booking
            booking_data["customer_name"] = "Test Customer 2"
            booking_data["phone"] = "555-222-2222"
            
            success2, response2 = self.run_test(
                "Create Duplicate Booking",
                "POST",
                "bookings",
                400,
                data=booking_data
            )
            return success2
        
        return False

    def test_get_bookings(self):
        """Test getting all bookings"""
        success, response = self.run_test(
            "Get All Bookings",
            "GET",
            "bookings",
            200
        )
        
        if success and response:
            try:
                data = response.json()
                self.log_test("Bookings List Valid", isinstance(data, list), 
                            f"Got {len(data) if isinstance(data, list) else 0} bookings")
            except Exception as e:
                self.log_test("Bookings List Parse", False, str(e))
        
        return success

    def test_get_booking_by_id(self):
        """Test getting specific booking by ID"""
        if hasattr(self, 'test_booking_id') and self.test_booking_id:
            success, response = self.run_test(
                f"Get Booking by ID",
                "GET",
                f"bookings/{self.test_booking_id}",
                200
            )
            return success
        else:
            self.log_test("Get Booking by ID", False, "No test booking ID available")
            return False

    def test_get_booking_invalid_id(self):
        """Test getting booking with invalid ID"""
        success, response = self.run_test(
            "Get Booking - Invalid ID",
            "GET",
            "bookings/invalid-id-123",
            404
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Barber API Tests...")
        print(f"🌐 Testing against: {self.api_url}")
        print("=" * 50)

        # Test API connectivity
        self.test_api_root()
        
        # Test time slots endpoints
        self.test_get_time_slots_future_date()
        self.test_get_time_slots_past_date()
        self.test_get_time_slots_invalid_date()
        
        # Test booking creation
        self.test_create_booking_valid()
        self.test_create_booking_no_contact()
        self.test_create_booking_past_date()
        self.test_create_duplicate_booking()
        
        # Test booking retrieval
        self.test_get_bookings()
        self.test_get_booking_by_id()
        self.test_get_booking_invalid_id()

        # Print summary
        print("=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = BarberAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())