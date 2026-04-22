import unittest
import json
from app import app, haversine

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_haversine(self):
        # Distance between NY and LA is approx 3944 km
        dist = haversine(40.7128, -74.0060, 34.0522, -118.2437)
        self.assertAlmostEqual(dist, 3944, delta=50)

    def test_optimize_endpoint_valid(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn('distance', data)

    def test_optimize_endpoint_invalid_format(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_endpoint_missing_coords(self):
        locations = [{"lat": 40.7128, "address": "Incomplete"}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
