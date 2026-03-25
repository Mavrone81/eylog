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

    def test_optimize_endpoint_basic(self):
        locations = [
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 37.7749, "lng": -122.4194, "address": "SF"},
            {"lat": 40.7128, "lng": -74.0060, "address": "NYC"}
        ]
        response = self.app.post('/optimize',
                                data=json.dumps({"locations": locations}),
                                content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)

    def test_optimize_no_locations(self):
        response = self.app.post('/optimize',
                                data=json.dumps({"locations": []}),
                                content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_forecast_endpoint(self):
        response = self.app.get('/forecast')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('forecast', data)

if __name__ == '__main__':
    unittest.main()
