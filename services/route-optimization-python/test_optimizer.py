import unittest
from app import haversine, solve_tsp

class TestOptimizer(unittest.TestCase):
    def test_haversine(self):
        # Distance between NYC and London should be roughly 5570 km
        dist = haversine(40.7128, -74.0060, 51.5074, -0.1278)
        self.assertAlmostEqual(dist, 5570, delta=50)

    def test_solve_tsp_single_location(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "NYC"}]
        route, dist = solve_tsp(locations)
        self.assertEqual(len(route), 1)
        self.assertEqual(dist, 0.0)

    def test_solve_tsp_multiple_locations(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NYC"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        route, dist = solve_tsp(locations)
        self.assertEqual(len(route), 3)
        self.assertGreater(dist, 0.0)
        # Ensure all locations are in the route
        route_addresses = [loc['address'] for loc in route]
        for loc in locations:
            self.assertIn(loc['address'], route_addresses)

if __name__ == '__main__':
    unittest.main()
