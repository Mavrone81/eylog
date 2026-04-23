import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'healthy')

    def test_optimize_route_empty(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({'locations': []}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['optimized_route']), 0)
        self.assertEqual(response.json['distance'], 0)

    def test_optimize_route_single(self):
        locations = [{'lat': 40.7128, 'lng': -74.0060}]
        response = self.app.post('/optimize',
                                 data=json.dumps({'locations': locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['optimized_route']), 1)
        self.assertEqual(response.json['distance'], 0)

    def test_optimize_route_multi(self):
        locations = [
            {'lat': 40.7128, 'lng': -74.0060},
            {'lat': 34.0522, 'lng': -118.2437},
            {'lat': 41.8781, 'lng': -87.6298}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({'locations': locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['optimized_route']), 3)
        self.assertGreater(response.json['distance'], 0)

    def test_invalid_input(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({'locations': "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
