import unittest
import json
from app import app, solve_tsp

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_endpoint(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": self.locations}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn('distance', data)

    def test_solve_tsp_single_location(self):
        locs = [{"lat": 40.7128, "lng": -74.0060}]
        route, dist = solve_tsp(locs)
        self.assertEqual(len(route), 1)
        self.assertEqual(dist, 0.0)

if __name__ == '__main__':
    unittest.main()
