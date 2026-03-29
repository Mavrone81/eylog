from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Genetic Algorithm Setup
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def calculate_distance(loc1, loc2):
    return math.sqrt((loc1['lat'] - loc2['lat'])**2 + (loc1['lng'] - loc2['lng'])**2)

def eval_tsp(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        distance += calculate_distance(locations[individual[i]], locations[individual[i+1]])
    distance += calculate_distance(locations[individual[-1]], locations[individual[0]])
    return (distance,)

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Validate locations
    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Invalid location data"}), 400

    if not locations or len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Too few locations to optimize"
        })

    n = len(locations)
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(n), n)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("evaluate", eval_tsp, locations=locations)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_route = [locations[i] for i in best_indices]

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/forecast', methods=['POST'])
def forecast_demand():
    # Placeholder for LSTM demand forecasting
    return jsonify({
        "forecast": [],
        "status": "success",
        "message": "Demand forecasting placeholder (LSTM model integration pending)"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
