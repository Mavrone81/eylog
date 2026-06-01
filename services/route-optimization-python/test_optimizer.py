import unittest
from app import solve_tsp

class TestOptimizer(unittest.TestCase):
    def test_solve_tsp_minimal_locations(self):
        locations = [{"lat": 0, "lng": 0, "address": "Start"}]
        optimized, distance = solve_tsp(locations)
        self.assertEqual(len(optimized), 1)
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_multiple_locations(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NY"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "CHI"}
        ]
        optimized, distance = solve_tsp(locations)
        self.assertEqual(len(optimized), 3)
        self.assertGreater(distance, 0.0)

if __name__ == '__main__':
    unittest.main()
