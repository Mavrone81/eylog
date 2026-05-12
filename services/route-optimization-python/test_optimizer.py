import unittest
import json
from app import app, haversine_distance

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')

    def test_haversine(self):
        # New York to London (approx)
        nyc = {'lat': 40.7128, 'lng': -74.0060}
        london = {'lat': 51.5074, 'lng': -0.1278}
        dist = haversine_distance(nyc, london)
        self.assertGreater(dist, 5000)
        self.assertLess(dist, 6000)

    def test_optimize_route(self):
        locations = [
            {'lat': 40.7128, 'lng': -74.0060, 'address': 'NYC'},
            {'lat': 34.0522, 'lng': -118.2437, 'address': 'LA'},
            {'lat': 41.8781, 'lng': -87.6298, 'address': 'Chicago'}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({'locations': locations}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn('distance', data)

    def test_invalid_input(self):
        # Missing lat/lng
        locations = [{'lat': 40.7128}]
        response = self.app.post('/optimize',
                                 data=json.dumps({'locations': locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
