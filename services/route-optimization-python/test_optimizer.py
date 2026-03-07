import unittest
from app import solve_tsp, haversine_distance

class TestOptimizer(unittest.TestCase):
    def test_haversine_distance(self):
        # Distance between New York (40.7128, -74.0060) and Los Angeles (34.0522, -118.2437)
        # Should be approximately 3944 km
        dist = haversine_distance(40.7128, -74.0060, 34.0522, -118.2437)
        self.assertAlmostEqual(dist, 3944, delta=50)

    def test_solve_tsp(self):
        locations = [
            {'lat': 40.7128, 'lng': -74.0060},  # NY
            {'lat': 34.0522, 'lng': -118.2437}, # LA
            {'lat': 41.8781, 'lng': -87.6298},  # Chicago
        ]
        optimized_route, total_distance = solve_tsp(locations)
        self.assertEqual(len(optimized_route), 3)
        self.assertTrue(total_distance > 0)

if __name__ == '__main__':
    unittest.main()
