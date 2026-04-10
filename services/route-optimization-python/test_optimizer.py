import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_single_point(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['message'], "Route optimization not needed for single point")

    def test_optimize_multiple_points(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertEqual(data['status'], 'success')

    def test_invalid_input(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
