import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data)['status'], 'healthy')

    def test_optimize_route_basic(self):
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
                {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
                {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
            ]
        }
        response = self.app.post('/optimize', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)

    def test_optimize_route_single(self):
        payload = {
            "locations": [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        }
        response = self.app.post('/optimize', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['message'], "Route optimized successfully (single location)")

    def test_invalid_input(self):
        response = self.app.post('/optimize', json={"locations": "invalid"})
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
