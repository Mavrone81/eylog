import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'healthy')

    def test_forecast(self):
        response = self.app.get('/forecast')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Expected high demand', response.json['forecast'])

    def test_optimize_validation(self):
        # Missing locations
        response = self.app.post('/optimize', data=json.dumps({}), content_type='application/json')
        self.assertEqual(response.status_code, 400)

        # Non-numeric coords
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": [{"lat": "bad", "lng": 1.0}]}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_success(self):
        locations = [
            {"lat": 1.0, "lng": 1.0},
            {"lat": 2.0, "lng": 2.0},
            {"lat": 3.0, "lng": 3.0}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['optimized_route']), 3)
        self.assertEqual(response.json['status'], 'success')

if __name__ == '__main__':
    unittest.main()
