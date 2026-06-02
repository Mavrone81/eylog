import unittest
from app import haversine, solve_tsp

class TestOptimizer(unittest.TestCase):
    def test_haversine(self):
        # New York to London (approx)
        lat1, lon1 = 40.7128, -74.0060
        lat2, lon2 = 51.5074, -0.1278
        distance = haversine(lat1, lon1, lat2, lon2)
        # Should be around 5570 km
        self.assertAlmostEqual(distance, 5570, delta=100)

    def test_solve_tsp_empty(self):
        locations = []
        optimized, dist = solve_tsp(locations)
        self.assertEqual(optimized, [])
        self.assertEqual(dist, 0.0)

    def test_solve_tsp_single(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "NY"}]
        optimized, dist = solve_tsp(locations)
        self.assertEqual(optimized, locations)
        self.assertEqual(dist, 0.0)

    def test_solve_tsp_basic(self):
        locations = [
            {"lat": 0, "lng": 0, "address": "Origin"},
            {"lat": 0, "lng": 1, "address": "A"},
            {"lat": 1, "lng": 1, "address": "B"},
            {"lat": 1, "lng": 0, "address": "C"}
        ]
        optimized, dist = solve_tsp(locations)
        self.assertEqual(len(optimized), 4)
        # Perimeter of a 1-degree square at equator is approx 111km * 4 = 444km
        self.assertGreater(dist, 400)
        self.assertLess(dist, 500)

if __name__ == "__main__":
    unittest.main()
