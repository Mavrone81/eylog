from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Define DEAP types at module level
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def eval_tsp(individual, distance_matrix):
    distance = 0
    for i in range(len(individual) - 1):
        distance += distance_matrix[individual[i]][individual[i+1]]
    distance += distance_matrix[individual[-1]][individual[0]]
    return (distance,)

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations or not isinstance(locations, list):
        return jsonify({"error": "Invalid locations input"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Invalid location format"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": "Coordinates must be numeric"}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Optimization not needed for less than 2 locations"
        })

    # Create distance matrix (Euclidean for simplicity)
    size = len(locations)
    dist_matrix = np.zeros((size, size))
    for i in range(size):
        for j in range(size):
            dist_matrix[i][j] = np.sqrt(
                (locations[i]['lat'] - locations[j]['lat'])**2 +
                (locations[i]['lng'] - locations[j]['lng'])**2
            )

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(size), size)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", eval_tsp, distance_matrix=dist_matrix)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, halloffame=hof, verbose=False)

    best_ind = hof[0]
    optimized_locations = [locations[i] for i in best_ind]

    return jsonify({
        "optimized_route": optimized_locations,
        "status": "success",
        "message": "Route optimized successfully using Genetic Algorithm"
    })

@app.route('/forecast', methods=['GET'])
def demand_forecast():
    # Placeholder for LSTM demand forecasting
    return jsonify({
        "forecast": "Expected high demand in zone A for the next 4 hours",
        "status": "success",
        "note": "LSTM model integration pending"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
