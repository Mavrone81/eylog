import unittest
import json
from app import app, haversine, validate_locations, solve_tsp

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_haversine(self):
        # Distance between NY and LA is approx 3940km
        dist = haversine(40.7128, -74.0060, 34.0522, -118.2437)
        self.assertAlmostEqual(dist, 3940, delta=100)

    def test_validation(self):
        valid, msg = validate_locations([{"lat": 0, "lng": 0}])
        self.assertTrue(valid)

        valid, msg = validate_locations("not a list")
        self.assertFalse(valid)

        valid, msg = validate_locations([{"lat": "string", "lng": 0}])
        self.assertFalse(valid)

    def test_solve_tsp(self):
        locations = [
            {"lat": 0, "lng": 0},
            {"lat": 1, "lng": 1},
            {"lat": 0, "lng": 1},
            {"lat": 1, "lng": 0}
        ]
        optimized, dist = solve_tsp(locations)
        self.assertEqual(len(optimized), 4)
        self.assertGreater(dist, 0)

    def test_optimize_endpoint(self):
        payload = {
            "locations": [
                {"lat": 0, "lng": 0, "address": "A"},
                {"lat": 1, "lng": 1, "address": "B"}
            ]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('total_distance', data)

if __name__ == '__main__':
    unittest.main()
