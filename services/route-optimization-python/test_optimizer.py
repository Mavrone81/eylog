import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), {"status": "healthy"})

    def test_optimize_route_empty(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": []}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['optimized_route'], [])

    def test_optimize_route_single(self):
        locs = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locs}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['optimized_route'], locs)

    def test_optimize_route_invalid_input(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"wrong_key": []}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
