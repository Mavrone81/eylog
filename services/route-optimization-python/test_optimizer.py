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
        response = self.app.post('/optimize', json={"locations": []})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["optimized_route"], [])
        self.assertEqual(data["distance"], 0.0)

    def test_optimize_route_single(self):
        loc = {"lat": 40.7128, "lng": -74.0060}
        response = self.app.post('/optimize', json={"locations": [loc]})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["optimized_route"], [loc])
        self.assertEqual(data["distance"], 0.0)

    def test_optimize_route_invalid(self):
        response = self.app.post('/optimize', json={"locations": [{"lat": "invalid", "lng": -74.0060}]})
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
