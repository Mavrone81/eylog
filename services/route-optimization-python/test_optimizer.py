import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_route(self):
        locations = [
            {"lat": 34.0522, "lng": -118.2437}, # LA
            {"lat": 37.7749, "lng": -122.4194}, # SF
            {"lat": 32.7157, "lng": -117.1611}  # SD
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)

    def test_forecast_demand(self):
        response = self.app.post('/forecast',
                                 data=json.dumps({"region": "urban"}),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('forecast', data)

if __name__ == '__main__':
    unittest.main()
