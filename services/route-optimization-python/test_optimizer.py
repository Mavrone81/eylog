import unittest
import json
from app import app, solve_tsp

class TestRouteOptimization(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_solve_tsp_empty(self):
        locations = []
        optimized, distance = solve_tsp(locations)
        self.assertEqual(optimized, [])
        self.assertEqual(distance, 0.0)

    def test_solve_tsp_single(self):
        locations = [{"lat": 10.0, "lng": 20.0, "address": "A"}]
        optimized, distance = solve_tsp(locations)
        self.assertEqual(optimized, locations)
        self.assertEqual(distance, 0.0)

    def test_optimize_endpoint(self):
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
                {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
                {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
            ]
        }
        response = self.app.post('/optimize',
                                data=json.dumps(payload),
                                content_type='application/json')
        data = json.loads(response.data)
        if response.status_code != 200:
            print(f"Error response: {data}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn('total_distance', data)
        self.assertEqual(data['status'], 'success')

if __name__ == '__main__':
    unittest.main()
