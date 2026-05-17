import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health(self):
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
        self.assertEqual(data['total_distance'], 0.0)

    def test_optimize_single(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "New York"}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['optimized_route'], locations)
        self.assertEqual(data['total_distance'], 0.0)

    def test_optimize_multiple(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertGreater(data['total_distance'], 0.0)

if __name__ == '__main__':
    unittest.main()
