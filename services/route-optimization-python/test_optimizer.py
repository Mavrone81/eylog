import unittest
import json
from app import app, haversine

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_haversine(self):
        # Distance between NY and LA is approx 3944 km
        ny = (40.7128, -74.0060)
        la = (34.0522, -118.2437)
        dist = haversine(ny[0], ny[1], la[0], la[1])
        self.assertAlmostEqual(dist, 3944, delta=100)

    def test_health(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), {"status": "healthy"})

    def test_optimize_short_circuit(self):
        locations = [{"lat": 40.7128, "lng": -74.0060, "address": "NY"}]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 1)
        self.assertEqual(data['total_distance_km'], 0.0)

    def test_optimize_tsp(self):
        locations = [
            {"lat": 40.7128, "lng": -74.0060, "address": "NY"},
            {"lat": 34.0522, "lng": -118.2437, "address": "LA"},
            {"lat": 41.8781, "lng": -87.6298, "address": "Chicago"}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertGreater(data['total_distance_km'], 0.0)

if __name__ == '__main__':
    unittest.main()
