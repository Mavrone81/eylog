import unittest
import json
from app import app

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_health(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)

    def test_optimize_bad_input(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": "not a list"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_optimize_single_location(self):
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": [{"lat": 0, "lng": 0}]}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['optimized_route']), 1)

    def test_optimize_multiple_locations(self):
        locations = [
            {"lat": 0, "lng": 0},
            {"lat": 1, "lng": 1},
            {"lat": 2, "lng": 2}
        ]
        response = self.app.post('/optimize',
                                 data=json.dumps({"locations": locations}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['optimized_route']), 3)

if __name__ == '__main__':
    unittest.main()
