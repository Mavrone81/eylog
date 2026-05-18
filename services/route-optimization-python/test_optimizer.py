import unittest
import json
from app import app, solve_tsp, haversine

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_haversine(self):
        # New York to London (approx 5570 km)
        dist = haversine(40.7128, -74.0060, 51.5074, -0.1278)
        self.assertAlmostEqual(dist, 5570, delta=50)

    def test_solve_tsp_empty(self):
        locations = []
        optimized, dist = solve_tsp(locations)
        self.assertEqual(len(optimized), 0)
        self.assertEqual(dist, 0.0)

    def test_solve_tsp_single(self):
        locations = [{"lat": 0, "lng": 0}]
        optimized, dist = solve_tsp(locations)
        self.assertEqual(len(optimized), 1)
        self.assertEqual(dist, 0.0)

    def test_optimize_endpoint(self):
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
        self.assertIn('total_distance', data)
        self.assertEqual(data['status'], 'success')

if __name__ == '__main__':
    unittest.main()
