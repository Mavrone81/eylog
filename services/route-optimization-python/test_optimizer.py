import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data)['status'], 'healthy')

    def test_optimize_empty(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": []}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(json.loads(response.data)['optimized_route']), 0)

    def test_optimize_single(self):
        locations = [{"lat": 40.7128, "lng": -74.0060}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(json.loads(response.data)['optimized_route']), 1)

    def test_optimize_multiple(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060},
            {"lat": 34.0522, "lng": -118.2437},
            {"lat": 41.8781, "lng": -87.6298}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(json.loads(response.data)['optimized_route']), 3)

    def test_malformed_data(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": [{"invalid": "data"}]}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
