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

    def test_optimize_empty(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": []}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['optimized_route'], [])
        self.assertEqual(data['total_distance'], 0)

    def test_optimize_single(self):
        locations = [{"lat": 40.7128, "lng": -74.0060}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['optimized_route'], locations)

    def test_optimize_invalid_data(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
