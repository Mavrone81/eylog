import unittest
import json
from app import app, haversine

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_haversine(self):
        # Distance between London and Paris should be approx 344km
        dist = haversine(51.5074, -0.1278, 48.8566, 2.3522)
        self.assertAlmostEqual(dist, 344, delta=5)

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_route_basic(self):
        locations = [
            {"lat": 0, "lng": 0, "address": "Start"},
            {"lat": 1, "lng": 1, "address": "Point A"},
            {"lat": 0, "lng": 1, "address": "Point B"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn('total_distance', data)
        self.assertGreater(data['total_distance'], 0)

    def test_optimize_route_single_location(self):
        locations = [{"lat": 0, "lng": 0, "address": "Only One"}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['total_distance'], 0.0)

if __name__ == '__main__':
    unittest.main()
