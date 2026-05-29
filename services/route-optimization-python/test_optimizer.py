import unittest
import json
from app import app, haversine, solve_tsp

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_haversine(self):
        # Distance between London and Paris is approx 344km
        dist = haversine(51.5074, -0.1278, 48.8566, 2.3522)
        self.assertAlmostEqual(dist, 344, delta=10)

    def test_solve_tsp_empty(self):
        route, dist = solve_tsp([])
        self.assertEqual(route, [])
        self.assertEqual(dist, 0.0)

    def test_solve_tsp_single(self):
        locs = [{"lat": 0, "lng": 0, "address": "A"}]
        route, dist = solve_tsp(locs)
        self.assertEqual(route, locs)
        self.assertEqual(dist, 0.0)

    def test_optimize_endpoint(self):
        locs = [
            {"lat": 51.5, "lng": -0.1, "address": "London"},
            {"lat": 48.8, "lng": 2.3, "address": "Paris"},
            {"lat": 52.5, "lng": 13.4, "address": "Berlin"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locs}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('optimized_route', data)
        self.assertIn('distance', data)

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

if __name__ == '__main__':
    unittest.main()
