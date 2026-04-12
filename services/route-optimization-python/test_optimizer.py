import unittest
import json
from app import app

class TestRouteOptimization(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_route_insufficient_locations(self):
        payload = {"locations": [{"lat": 40.7128, "lng": -74.0060}]}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], 'Insufficient locations for optimization')
        self.assertEqual(len(data['optimized_route']), 1)

    def test_optimize_route_multiple_locations(self):
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060},
                {"lat": 34.0522, "lng": -118.2437},
                {"lat": 41.8781, "lng": -87.6298}
            ]
        }
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)

    def test_optimize_route_invalid_data(self):
        payload = {"locations": [{"lat": "invalid", "lng": -74.0060}]}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
