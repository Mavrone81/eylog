import unittest
from app import app
import json

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), {"status": "healthy"})

    def test_optimize_route_basic(self):
        locations = [
            {"lat": 0, "lng": 0, "address": "A"},
            {"lat": 1, "lng": 1, "address": "B"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertIn("optimized_route", data)

if __name__ == '__main__':
    unittest.main()
