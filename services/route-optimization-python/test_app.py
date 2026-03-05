import unittest
import json
from app import app

class TestRouteOptimization(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_optimize_route(self):
        payload = {
            "locations": [
                {"lat": 40.7128, "lng": -74.0060},
                {"lat": 40.7306, "lng": -73.9352},
                {"lat": 40.7580, "lng": -73.9855},
                {"lat": 40.7484, "lng": -73.9857}
            ]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 4)
        print("✓ Route optimization endpoint works")

if __name__ == '__main__':
    unittest.main()
