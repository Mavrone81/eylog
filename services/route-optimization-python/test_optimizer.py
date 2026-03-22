import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_route_empty(self):
        response = self.app.post('/optimize', json={"locations": []})
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['optimized_route'], [])

    def test_optimize_route_single(self):
        locations = [{"lat": 0.0, "lng": 0.0}]
        response = self.app.post('/optimize', json={"locations": locations})
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['optimized_route'], locations)

    def test_optimize_route_success(self):
        locations = [
            {"lat": 0.0, "lng": 0.0},
            {"lat": 1.0, "lng": 1.0},
            {"lat": 2.0, "lng": 2.0}
        ]
        response = self.app.post('/optimize', json={"locations": locations})
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertEqual(data['status'], 'success')

    def test_invalid_location_format(self):
        locations = [{"lat": "invalid", "lng": 0.0}]
        response = self.app.post('/optimize', json={"locations": locations})
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
