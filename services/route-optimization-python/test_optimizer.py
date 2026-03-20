import unittest
from app import solve_tsp, haversine

class TestOptimizer(unittest.TestCase):
    def test_haversine(self):
        # New York to London (approx)
        nyc = {'lat': 40.7128, 'lng': -74.0060}
        london = {'lat': 51.5074, 'lng': -0.1278}
        dist = haversine(nyc, london)
        self.assertAlmostEqual(dist, 5570, delta=100)

    def test_solve_tsp(self):
        locations = [
            {'lat': 40.7128, 'lng': -74.0060}, # NYC
            {'lat': 34.0522, 'lng': -118.2437}, # LA
            {'lat': 41.8781, 'lng': -87.6298}, # Chicago
            {'lat': 29.7604, 'lng': -95.3698}  # Houston
        ]
        optimized = solve_tsp(locations)
        self.assertEqual(len(optimized), 4)
        for loc in locations:
            self.assertIn(loc, optimized)

    def test_empty_locations(self):
        self.assertEqual(solve_tsp([]), [])

if __name__ == '__main__':
    unittest.main()
