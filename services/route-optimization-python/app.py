from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Define DEAP types at module level
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def calculate_distance(p1, p2):
    """Haversine distance between two points (lat, lng)"""
    R = 6371  # Earth radius in km
    lat1, lon1 = math.radians(p1[0]), math.radians(p1[1])
    lat2, lon2 = math.radians(p2[0]), math.radians(p2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def evalTSP(individual, distance_matrix):
    distance = 0
    for i in range(len(individual) - 1):
        distance += distance_matrix[individual[i]][individual[i+1]]
    distance += distance_matrix[individual[-1]][individual[0]]
    return distance,

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if len(locations) < 2:
        return jsonify({"optimized_route": locations, "status": "success"})

    # Create distance matrix
    size = len(locations)
    distance_matrix = np.zeros((size, size))
    for i in range(size):
        for j in range(size):
            distance_matrix[i][j] = calculate_distance(
                (locations[i]['lat'], locations[i]['lng']),
                (locations[j]['lat'], locations[j]['lng'])
            )

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(size), size)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evalTSP, distance_matrix=distance_matrix)

    pop = toolbox.population(n=50)
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, verbose=False)

    best_ind = tools.selBest(pop, 1)[0]
    optimized_route = [locations[i] for i in best_ind]

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized using Genetic Algorithm"
    })

@app.route('/forecast', methods=['POST'])
def forecast_demand():
    # Placeholder for LSTM-based demand forecasting
    return jsonify({
        "forecast": [120, 150, 130, 170, 160],
        "status": "success",
        "message": "Demand forecast generated (placeholder)"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
