import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_optimize_endpoint_basic(self):
        payload = {
            "locations": [
                {"lat": 0, "lng": 0},
                {"lat": 1, "lng": 1},
                {"lat": 2, "lng": 2}
            ]
        }
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertEqual(data['status'], 'success')

    def test_optimize_endpoint_invalid_data(self):
        payload = {"locations": "not a list"}
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_endpoint_single_point(self):
        payload = {"locations": [{"lat": 0, "lng": 0}]}
        response = self.app.post('/optimize',
                                 data=json.dumps(payload),
                                 content_type='application/json')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)

if __name__ == '__main__':
    unittest.main()
