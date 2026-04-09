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

    def test_optimize_route_too_few_locations(self):
        payload = {"locations": [{"lat": 1.0, "lng": 1.0}]}
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)

    def test_optimize_route_success(self):
        payload = {
            "locations": [
                {"lat": 1.0, "lng": 1.0},
                {"lat": 2.0, "lng": 2.0},
                {"lat": 3.0, "lng": 3.0}
            ]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertEqual(data['status'], 'success')

    def test_optimize_route_invalid_format(self):
        payload = {"locations": [{"lat": 1.0}]} # Missing lng
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
