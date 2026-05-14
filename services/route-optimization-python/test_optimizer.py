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

    def test_optimize_route_single_point(self):
        payload = {
            "locations": [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['total_distance'], 0.0)

    def test_optimize_route_multi_point(self):
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060, "address": "Point A"},
                {"lat": 34.0522, "lng": -118.2437, "address": "Point B"},
                {"lat": 41.8781, "lng": -87.6298, "address": "Point C"}
            ]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertGreater(data['total_distance'], 0)

    def test_invalid_input(self):
        # Test malformed data (string instead of list)
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

        # Test malformed location object
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": [{"lat": "invalid", "lng": -74.0060}]}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
