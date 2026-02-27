from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    # Placeholder for route optimization logic
    return jsonify({
        "optimized_route": data.get("locations", []),
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
