import unittest
from app import solve_tsp, haversine

class TestOptimizer(unittest.TestCase):
    def test_haversine(self):
        # Distance between London and Paris should be ~344km
        dist = haversine(51.5074, -0.1278, 48.8566, 2.3522)
        self.assertAlmostEqual(dist, 344, delta=5)

    def test_solve_tsp(self):
        locations = [
            {'lat': 0, 'lng': 0},
            {'lat': 1, 'lng': 1},
            {'lat': 2, 'lng': 2}
        ]
        optimized, distance = solve_tsp(locations)
        self.assertEqual(len(optimized), 3)
        self.assertGreater(distance, 0)

if __name__ == '__main__':
    unittest.main()
