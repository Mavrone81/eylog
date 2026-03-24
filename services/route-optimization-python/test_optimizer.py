import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data)['status'], 'healthy')

    def test_optimize_invalid_input(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_valid_input(self):
        locations = [
            {"lat": 0, "lng": 0},
            {"lat": 1, "lng": 1},
            {"lat": 2, "lng": 2}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)

    def test_forecast(self):
        response = self.app.post('/forecast',
                                 data=json.dumps({}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('forecast', json.loads(response.data))

if __name__ == '__main__':
    unittest.main()
