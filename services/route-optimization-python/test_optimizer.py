import unittest
import json
from app import app, haversine

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_haversine(self):
        # Distance between London and Paris should be approx 344km
        dist = haversine(51.5074, -0.1278, 48.8566, 2.3522)
        self.assertAlmostEqual(dist, 344, delta=5)

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), {"status": "healthy"})

    def test_optimize_endpoint_validation(self):
        # Missing locations
        response = self.app.post('/optimize', json={})
        self.assertEqual(response.status_code, 400)

        # Invalid format
        response = self.app.post('/optimize', json={"locations": ["invalid"]})
        self.assertEqual(response.status_code, 400)

    def test_optimize_logic(self):
        locations = [
            {"lat": 51.5074, "lng": -0.1278},
            {"lat": 48.8566, "lng": 2.3522},
            {"lat": 41.3851, "lng": 2.1734}
        ]
        response = self.app.post('/optimize', json={"locations": locations})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['optimized_route']), 3)
        self.assertIn('total_distance', data)
        self.assertEqual(data['status'], 'success')

if __name__ == '__main__':
    unittest.main()
