from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Define DEAP types once
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def calculate_distance(loc1, loc2):
    # Simple Euclidean distance for TSP demo
    return np.sqrt((loc1['lat'] - loc2['lat'])**2 + (loc1['lng'] - loc2['lng'])**2)

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    if not data or "locations" not in data:
        return jsonify({"error": "Invalid input: 'locations' is required"}), 400

    locations = data.get("locations", [])

    # Input validation for lat/lng
    for i, loc in enumerate(locations):
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": f"Invalid location at index {i}: 'lat' and 'lng' are required"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": f"Invalid location at index {i}: 'lat' and 'lng' must be numeric"}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Too few locations to optimize"
        })

    # Genetic Algorithm for TSP
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(len(locations)), len(locations))
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(len(individual) - 1):
            distance += calculate_distance(locations[individual[i]], locations[individual[i+1]])
        distance += calculate_distance(locations[individual[-1]], locations[individual[0]])
        return (distance,)

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, halloffame=hof, verbose=False)

    best_ind = hof[0]
    optimized_locations = [locations[i] for i in best_ind]

    return jsonify({
        "optimized_route": optimized_locations,
        "status": "success",
        "message": "Route optimized using Genetic Algorithm"
    })

@app.route('/forecast', methods=['GET'])
def forecast():
    # Placeholder for LSTM demand forecasting
    return jsonify({
        "forecast": [random.randint(10, 100) for _ in range(7)],
        "unit": "deliveries",
        "period": "daily",
        "message": "LSTM demand forecasting results"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
