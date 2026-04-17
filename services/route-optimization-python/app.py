from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Define Haversine formula for distance calculation
def haversine(lon1, lat1, lon2, lat2):
    R = 6371  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# DEAP setup
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def eval_tsp(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        loc1 = locations[individual[i]]
        loc2 = locations[individual[i+1]]
        distance += haversine(loc1['lng'], loc1['lat'], loc2['lng'], loc2['lat'])
    # Return to start
    loc1 = locations[individual[-1]]
    loc2 = locations[individual[0]]
    distance += haversine(loc1['lng'], loc1['lat'], loc2['lng'], loc2['lat'])
    return distance,

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
             return jsonify({"error": "Invalid coordinates"}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Route optimization not needed for less than 2 points"
        })

    num_locations = len(locations)
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", eval_tsp, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_locations = [locations[i] for i in best_indices]

    return jsonify({
        "optimized_route": optimized_locations,
        "status": "success",
        "message": "Route optimized successfully using Genetic Algorithm"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
