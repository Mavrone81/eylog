import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Haversine distance for coordinates
def haversine(coord1, coord2):
    R = 6371  # Earth radius in km
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

# Define fitness and individual types only if they don't exist
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locations = len(locations)
    if num_locations <= 1:
        return list(range(num_locations))

    # Distance matrix
    dist_matrix = np.zeros((num_locations, num_locations))
    for i in range(num_locations):
        for j in range(num_locations):
            dist_matrix[i][j] = haversine(locations[i], locations[j])

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def evalTSP(individual):
        distance = 0
        for i in range(num_locations - 1):
            distance += dist_matrix[individual[i]][individual[i+1]]
        distance += dist_matrix[individual[-1]][individual[0]]  # Return to start
        return distance,

    toolbox.register("evaluate", evalTSP)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=100)
    hof = tools.HallOfFame(1)

    # Run GA
    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 50, stats=None, halloffame=hof, verbose=False)

    return list(hof[0])

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations:
        return jsonify({"status": "error", "message": "No locations provided"}), 400

    try:
        optimized_order = solve_tsp(locations)
        return jsonify({
            "optimized_route": optimized_order,
            "status": "success",
            "message": "Route optimized successfully using Genetic Algorithm"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/forecast', methods=['GET'])
def demand_forecast():
    # Placeholder for LSTM-based demand forecasting
    return jsonify({
        "status": "success",
        "forecast": [120, 150, 140, 180, 210],
        "message": "Demand forecast generated (placeholder)"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
