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

    def test_optimize_empty(self):
        response = self.app.post('/optimize', json={"locations": []})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["optimized_route"], [])

    def test_optimize_single_point(self):
        locations = [{"lat": 1.0, "lng": 1.0, "address": "Test"}]
        response = self.app.post('/optimize', json={"locations": locations})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["optimized_route"], locations)

    def test_optimize_multiple_points(self):
        locations = [
            {"lat": 0.0, "lng": 0.0},
            {"lat": 1.0, "lng": 1.0},
            {"lat": 0.0, "lng": 1.0},
            {"lat": 1.0, "lng": 0.0}
        ]
        response = self.app.post('/optimize', json={"locations": locations})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data["optimized_route"]), 4)
        self.assertEqual(data["status"], "success")

    def test_invalid_input(self):
        response = self.app.post('/optimize', json={"locations": [{"lat": "invalid", "lng": 1.0}]})
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
