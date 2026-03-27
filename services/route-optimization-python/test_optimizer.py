import unittest
from optimizer import optimize_route_ga

class TestOptimizer(unittest.TestCase):
    def test_optimize_route_ga_basic(self):
        locations = [
            {'lat': 40.7128, 'lng': -74.0060}, # NY
            {'lat': 34.0522, 'lng': -118.2437}, # LA
            {'lat': 41.8781, 'lng': -87.6298}  # Chicago
        ]
        optimized = optimize_route_ga(locations)
        self.assertEqual(len(optimized), len(locations))
        # Each original location should be present in the optimized list
        for loc in locations:
            self.assertTrue(any(l['lat'] == loc['lat'] and l['lng'] == loc['lng'] for l in optimized))

    def test_single_location(self):
        locations = [{'lat': 40.7128, 'lng': -74.0060}]
        optimized = optimize_route_ga(locations)
        self.assertEqual(len(optimized), 1)
        self.assertEqual(optimized[0], locations[0])

if __name__ == '__main__':
    unittest.main()
