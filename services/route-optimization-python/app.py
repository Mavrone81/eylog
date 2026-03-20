import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Haversine distance for fitness calculation
def haversine(coord1, coord2):
    R = 6371  # Earth radius in km
    lat1, lon1 = math.radians(coord1['lat']), math.radians(coord1['lng'])
    lat2, lon2 = math.radians(coord2['lat']), math.radians(coord2['lng'])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# GA Types definition
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    if len(locations) < 2:
        return locations

    toolbox = base.Toolbox()
    indices = list(range(len(locations)))
    toolbox.register("indices", random.sample, indices, len(indices))
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def evalTSP(individual):
        distance = 0
        for i in range(len(individual) - 1):
            distance += haversine(locations[individual[i]], locations[individual[i+1]])
        distance += haversine(locations[individual[-1]], locations[individual[0]])
        return distance,

    toolbox.register("evaluate", evalTSP)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=20, verbose=False)

    best_ind = tools.selBest(pop, 1)[0]
    return [locations[i] for i in best_ind]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations:
        return jsonify({"status": "error", "message": "No locations provided"}), 400

    optimized_route = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/forecast', methods=['GET'])
def forecast_demand():
    # LSTM-based demand forecasting placeholder
    return jsonify({
        "forecast": [random.randint(50, 200) for _ in range(7)],
        "status": "success",
        "message": "7-day demand forecast generated"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
