import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_optimize_route(self):
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
                {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
                {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
            ]
        }
        response = self.app.post('/optimize', json=payload)
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertEqual(data['status'], 'success')
        self.assertIn('Genetic Algorithm', data['message'])

    def test_invalid_input(self):
        payload = {"locations": "not a list"}
        response = self.app.post('/optimize', json=payload)
        self.assertEqual(response.status_code, 400)

    def test_invalid_location_format(self):
        payload = {"locations": [{"lat": "invalid", "lng": -74.0060}]}
        response = self.app.post('/optimize', json=payload)
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
