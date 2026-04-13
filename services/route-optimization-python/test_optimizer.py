import unittest
import json
from app import app, haversine

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_haversine(self):
        # Distance between London and Paris approx 344km
        dist = haversine(51.5074, -0.1278, 48.8566, 2.3522)
        self.assertAlmostEqual(dist, 344, delta=10)

    def test_optimize_endpoint_single_location(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)

    def test_optimize_endpoint_multiple_locations(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NY"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn("Genetic Algorithm", data['message'])

    def test_invalid_input(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
