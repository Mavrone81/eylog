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

    def test_optimize_empty_locations(self):
        response = self.app.post('/optimize', json={"locations": []})
        self.assertEqual(response.status_code, 400)

    def test_optimize_single_location(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        response = self.app.post('/optimize', json={"locations": locations})
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['total_distance'], 0)

    def test_optimize_multiple_locations(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NY"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize', json={"locations": locations})
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertGreater(data['total_distance'], 0)

if __name__ == '__main__':
    unittest.main()
