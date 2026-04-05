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

    def test_optimize_route_success(self):
        payload = {
            "locations": [
                {"lat": 34.05, "lng": -118.24},
                {"lat": 34.14, "lng": -118.14},
                {"lat": 33.94, "lng": -118.40}
            ]
        }
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)

    def test_optimize_route_invalid_payload(self):
        payload = {"locations": "not a list"}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_route_invalid_location_format(self):
        payload = {"locations": [{"lat": 34.05}]} # Missing lng
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_route_invalid_coordinates(self):
        payload = {"locations": [{"lat": "invalid", "lng": -118.24}]}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_route_single_location(self):
        payload = {"locations": [{"lat": 34.05, "lng": -118.24}]}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)

    def test_optimize_route_empty_locations(self):
        payload = {"locations": []}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_forecast_demand(self):
        response = self.app.get('/forecast')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('forecast', data)

if __name__ == '__main__':
    unittest.main()
