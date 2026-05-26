import unittest
from app import solve_tsp, haversine

class TestOptimizer(unittest.TestCase):
    def test_haversine(self):
        # New York to London approx 5570 km
        ny = (40.7128, -74.0060)
        london = (51.5074, -0.1278)
        dist = haversine(ny, london)
        self.assertGreater(dist, 5500)
        self.assertLess(dist, 5600)

    def test_solve_tsp_short(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "NY"}]
        optimized, dist = solve_tsp(locations)
        self.assertEqual(len(optimized), 1)
        self.assertEqual(dist, 0.0)

    def test_solve_tsp_multi(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NY"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        optimized, dist = solve_tsp(locations)
        self.assertEqual(len(optimized), 3)
        self.assertGreater(dist, 0.0)
        # Check all locations are present
        addresses = [loc['address'] for loc in optimized]
        self.assertIn("NY", addresses)
        self.assertIn("LA", addresses)
        self.assertIn("Chicago", addresses)

if __name__ == '__main__':
    unittest.main()
