import unittest
import json
from app import app

class OptimizerTest(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), {"status": "healthy"})

    def test_optimize_minimal(self):
        locations = [{"lat": 0, "lng": 0}, {"lat": 1, "lng": 1}]
        response = self.app.post('/optimize',
                                data=json.dumps({"locations": locations}),
                                content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(len(data['optimized_route']), 2)

    def test_optimize_single_location(self):
        locations = [{"lat": 0, "lng": 0}]
        response = self.app.post('/optimize',
                                data=json.dumps({"locations": locations}),
                                content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(data['message'], "Insufficient locations for optimization")

if __name__ == '__main__':
    unittest.main()
