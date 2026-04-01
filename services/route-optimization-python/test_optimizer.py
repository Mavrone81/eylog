import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), {"status": "healthy"})

    def test_optimize_route_validation(self):
        # Invalid format
        response = self.app.post('/optimize', json={"locations": "invalid"})
        self.assertEqual(response.status_code, 400)

        # Invalid location object
        response = self.app.post('/optimize', json={"locations": [{"lat": 40.7128}]})
        self.assertEqual(response.status_code, 400)

        # Non-numeric coordinates
        response = self.app.post('/optimize', json={"locations": [{"lat": "40.7128", "lng": -74.0060}]})
        self.assertEqual(response.status_code, 400)

    def test_optimize_route_success(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize', json={"locations": locations})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["optimized_route"]), 3)

if __name__ == '__main__':
    unittest.main()
