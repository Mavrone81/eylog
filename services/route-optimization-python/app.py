import math
import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Haversine formula for distance
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Define DEAP types once at module level
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locs = len(locations)
    if num_locs <= 1:
        return locations, 0.0

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locs), num_locs)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(len(individual)):
            l1 = locations[individual[i]]
            l2 = locations[individual[(i + 1) % len(individual)]]
            distance += haversine(l1['lat'], l1['lng'], l2['lat'], l2['lng'])
        return (distance,)

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=300)
    stats = tools.Statistics(lambda ind: ind.fitness.values[0])
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=50, stats=stats, verbose=False)

    best_ind = tools.selBest(pop, 1)[0]
    optimized_locations = [locations[i] for i in best_ind]
    return optimized_locations, best_ind.fitness.values[0]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not isinstance(locations, list):
        return jsonify({"error": "Invalid locations format"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Invalid location object"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": "Latitude and longitude must be numbers"}), 400

    optimized, distance = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized,
        "total_distance": distance,
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
