from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Define DEAP types globally with hasattr checks
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locs = len(locations)
    if num_locs <= 1:
        return locations, 0.0

    def evalTSP(individual):
        distance = 0
        for i in range(num_locs):
            loc1 = locations[individual[i]]
            loc2 = locations[individual[(i + 1) % num_locs]]
            distance += haversine(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
        return (distance,)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locs), num_locs)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evalTSP)

    pop = toolbox.population(n=300)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("avg", np.mean)
    stats.register("std", np.std)
    stats.register("min", np.min)
    stats.register("max", np.max)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=50, stats=stats, halloffame=hof, verbose=False)

    best_route_indices = hof[0]
    optimized_route = [locations[i] for i in best_route_indices]
    best_distance = best_route_indices.fitness.values[0]

    return optimized_route, best_distance

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations:
        return jsonify({"optimized_route": [], "status": "success", "message": "No locations provided"}), 200

    try:
        optimized_route, distance = solve_tsp(locations)
        return jsonify({
            "optimized_route": optimized_route,
            "distance_km": distance,
            "status": "success",
            "message": "Route optimized successfully"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
