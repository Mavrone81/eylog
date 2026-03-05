from flask import Flask, jsonify, request
from optimizer import optimize_route_ga

app = Flask(__name__)

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations or not isinstance(locations, list):
        return jsonify({
            "status": "error",
            "message": "Valid locations list is required"
        }), 400

    optimized = optimize_route_ga(locations)

    return jsonify({
        "optimized_route": optimized,
        "status": "success",
        "message": "Route optimized successfully using genetic algorithm"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
