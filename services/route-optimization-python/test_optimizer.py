import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_single_location(self):
        payload = {
            "locations": [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['total_distance'], 0.0)

    def test_optimize_multiple_locations(self):
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060, "address": "NY"},
                {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
                {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
            ]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertTrue(data['total_distance'] > 0)

    def test_invalid_input(self):
        # Missing lat/lng
        payload = {"locations": [{"lat": 40.7128}]}
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

        # Non-numeric lat/lng
        payload = {"locations": [{"lat": "invalid", "lng": -74.0060}]}
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
