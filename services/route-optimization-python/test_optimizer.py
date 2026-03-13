import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)

    def test_optimize(self):
        payload = {
            "locations": [[40.7128, -74.0060], [34.0522, -118.2437], [41.8781, -87.6298]]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['optimized_route']), 3)

    def test_forecast(self):
        response = self.app.get('/forecast')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['forecast'], "LSTM placeholder")

if __name__ == '__main__':
    unittest.main()
