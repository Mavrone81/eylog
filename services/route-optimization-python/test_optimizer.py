import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_route_empty(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": []}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 0)

    def test_optimize_route_two_points(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 2)

    def test_invalid_location_data(self):
        locations = [{"lat": 40.7128}] # Missing lng
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
