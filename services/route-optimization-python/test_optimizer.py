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
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060},
                {"lat": 34.0522, "lng": -118.2437},
                {"lat": 41.8781, "lng": -87.6298}
            ]
        }
        response = self.app.post('/optimize', json=payload)
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertEqual(data['status'], 'success')

    def test_forecast(self):
        response = self.app.get('/forecast')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('forecast', data)
        self.assertEqual(len(data['forecast']), 7)

if __name__ == '__main__':
    unittest.main()
