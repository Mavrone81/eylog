import unittest
from app import haversine, solve_tsp

class TestOptimizer(unittest.TestCase):
    def test_haversine(self):
        # Distance between NYC and London is roughly 5570 km
        nyc = (40.7128, -74.0060)
        london = (51.5074, -0.1278)
        dist = haversine(nyc[0], nyc[1], london[0], london[1])
        self.assertAlmostEqual(dist, 5570, delta=50)

    def test_solve_tsp_empty(self):
        locations, distance = solve_tsp([])
        self.assertEqual(locations, [])
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_single(self):
        locs = [{'lat': 40.7128, 'lng': -74.0060, 'address': 'NYC'}]
        locations, distance = solve_tsp(locs)
        self.assertEqual(locations, locs)
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_multiple(self):
        locs = [
            {'lat': 40.7128, 'lng': -74.0060, 'address': 'NYC'},
            {'lat': 34.0522, 'lng': -118.2437, 'address': 'LA'},
            {'lat': 41.8781, 'lng': -87.6298, 'address': 'Chicago'}
        ]
        optimized_route, distance = solve_tsp(locs)
        self.assertEqual(len(optimized_route), 3)
        self.assertGreater(distance, 0)

if __name__ == '__main__':
    unittest.main()
