import unittest
import json
from app import app, haversine

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_haversine(self):
        # Distance between London and Paris should be ~344km
        dist = haversine(51.5074, -0.1278, 48.8566, 2.3522)
        self.assertAlmostEqual(dist, 344, delta=10)

    def test_health_endpoint(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), {"status": "healthy"})

    def test_optimize_endpoint_single_point(self):
        locations = [{"lat": 51.5, "lng": -0.1}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['total_distance'], 0)

    def test_optimize_endpoint_multiple_points(self):
        locations = [
            {"lat": 51.5, "lng": -0.1},
            {"lat": 51.6, "lng": -0.2},
            {"lat": 51.7, "lng": -0.3}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertGreater(data['total_distance'], 0)

    def test_optimize_endpoint_invalid_data(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": [{"lat": "bad", "lng": -0.1}]}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
