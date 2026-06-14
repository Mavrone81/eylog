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

    def test_solve_tsp(self):
        route, distance = solve_tsp(self.locations)
        self.assertEqual(len(route), 3)
        self.assertGreater(distance, 0)
        # Check if all locations are present in route
        route_addresses = [loc['address'] for loc in route]
        for loc in self.locations:
            self.assertIn(loc['address'], route_addresses)

    def test_solve_tsp_single_location(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        route, distance = solve_tsp(locations)
        self.assertEqual(len(route), 1)
        self.assertEqual(distance, 0.0)

    def test_optimize_endpoint(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": self.locations}),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn('total_distance_km', data)

    def test_health_endpoint(self):
        response = self.app.get('/health')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

if __name__ == '__main__':
    unittest.main()
