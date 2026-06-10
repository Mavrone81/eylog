import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'healthy')

    def test_optimize_empty(self):
        response = self.app.post('/optimize', json={"locations": []})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['optimized_route'], [])
        self.assertEqual(response.json['total_distance'], 0.0)

    def test_optimize_single(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "NYC"}]
        response = self.app.post('/optimize', json={"locations": locations})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['optimized_route']), 1)
        self.assertEqual(response.json['total_distance'], 0.0)

    def test_optimize_multiple(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NYC"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize', json={"locations": locations})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['optimized_route']), 3)
        self.assertIn('total_distance', response.json)
        self.assertGreater(response.json['total_distance'], 0)

if __name__ == '__main__':
    unittest.main()
