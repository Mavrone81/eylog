import unittest
from app import solve_tsp

class TestOptimizer(unittest.TestCase):
    def test_solve_tsp_empty(self):
        locations = []
        route, distance = solve_tsp(locations)
        self.assertEqual(route, [])
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_single(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "NYC"}]
        route, distance = solve_tsp(locations)
        self.assertEqual(route, locations)
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_multiple(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NYC"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        route, distance = solve_tsp(locations)
        self.assertEqual(len(route), 3)
        self.assertGreater(distance, 0)
        # Verify all locations are present in the route
        route_addresses = [loc['address'] for loc in route]
        for loc in locations:
            self.assertIn(loc['address'], route_addresses)

if __name__ == '__main__':
    unittest.main()
