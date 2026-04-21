import unittest
import json
from app import app, haversine_distance

class TestRouteOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_haversine_distance(self):
        coord1 = {'lat': 40.7128, 'lng': -74.0060}  # NYC
        coord2 = {'lat': 34.0522, 'lng': -118.2437} # LA
        dist = haversine_distance(coord1, coord2)
        # NYC to LA is approx 3940 km
        self.assertGreater(dist, 3900)
        self.assertLess(dist, 4000)

    def test_optimize_endpoint_validation(self):
        # Empty payload
        response = self.app.post('/optimize', data=json.dumps({}), content_type='application/json')
        self.assertEqual(response.status_code, 400)

        # Invalid location format
        payload = {'locations': [{'lat': 'invalid', 'lng': -74.0}]}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_single_location(self):
        payload = {'locations': [{'lat': 40.7128, 'lng': -74.0060, 'address': 'NYC'}]}
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['total_distance'], 0.0)

    def test_optimize_multiple_locations(self):
        payload = {
            'locations': [
                {'lat': 40.7128, 'lng': -74.0060, 'address': 'NYC'},
                {'lat': 34.0522, 'lng': -118.2437, 'address': 'LA'},
                {'lat': 41.8781, 'lng': -87.6298, 'address': 'Chicago'}
            ]
        }
        response = self.app.post('/optimize', data=json.dumps(payload), content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertGreater(data['total_distance'], 0.0)

if __name__ == '__main__':
    unittest.main()
