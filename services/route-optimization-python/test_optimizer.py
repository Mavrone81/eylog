import unittest
from app import solve_tsp

class TestOptimizer(unittest.TestCase):
    def test_solve_tsp_empty(self):
        locations, distance = solve_tsp([])
        self.assertEqual(locations, [])
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_single(self):
        locs = [{'lat': 40.7128, 'lng': -74.0060}]
        locations, distance = solve_tsp(locs)
        self.assertEqual(locations, locs)
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_multiple(self):
        locs = [
            {'lat': 40.7128, 'lng': -74.0060},
            {'lat': 34.0522, 'lng': -118.2437},
            {'lat': 41.8781, 'lng': -87.6298}
        ]
        locations, distance = solve_tsp(locs)
        self.assertEqual(len(locations), 3)
        self.assertGreater(distance, 0.0)

if __name__ == '__main__':
    unittest.main()
