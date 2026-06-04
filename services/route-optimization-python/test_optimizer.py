import unittest
import json
from app import app, solve_tsp

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_endpoint_empty(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": []}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['optimized_route'], [])

    def test_solve_tsp_single_location(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        route, distance = solve_tsp(locations)
        self.assertEqual(len(route), 1)
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_multiple_locations(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NY"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        route, distance = solve_tsp(locations)
        self.assertEqual(len(route), 3)
        self.assertGreater(distance, 0)
        # Verify all original locations are in the route
        route_addresses = [loc['address'] for loc in route]
        for loc in locations:
            self.assertIn(loc['address'], route_addresses)

if __name__ == '__main__':
    unittest.main()
