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

    def test_optimize_route(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060}, # NYC
            {"lat": 34.0522, "lng": -118.2437}, # LA
            {"lat": 41.8781, "lng": -87.6298}  # Chicago
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["optimized_route"]), 3)

if __name__ == '__main__':
    unittest.main()
