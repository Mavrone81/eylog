import unittest
from app import solve_tsp

class TestOptimizer(unittest.TestCase):
    def test_solve_tsp_empty(self):
        locations = []
        optimized, distance = solve_tsp(locations)
        self.assertEqual(optimized, [])
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_single(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        optimized, distance = solve_tsp(locations)
        self.assertEqual(optimized, locations)
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_multiple(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        optimized, distance = solve_tsp(locations)
        self.assertEqual(len(optimized), 3)
        self.assertGreater(distance, 0.0)
        # Check if all locations are present in the optimized route
        for loc in locations:
            self.assertIn(loc, optimized)

if __name__ == '__main__':
    unittest.main()
