from flask import Flask, jsonify, request
import numpy as np
import random
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Haversine distance calculation
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Define DEAP types at module level
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    if len(locations) <= 1:
        return locations

    size = len(locations)
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(size), size)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(len(individual) - 1):
            loc1 = locations[individual[i]]
            loc2 = locations[individual[i+1]]
            distance += haversine(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
        return distance,

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, verbose=False)

    best_ind = tools.selBest(pop, 1)[0]
    return [locations[i] for i in best_ind]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    optimized = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized,
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/forecast', methods=['GET'])
def forecast_demand():
    # Placeholder for LSTM-based demand forecasting
    return jsonify({
        "forecast": "Placeholder demand forecast",
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
