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

# Define DEAP types outside the request handler to avoid re-definition errors
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    if len(locations) < 2:
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
        # Return to start
        loc1 = locations[individual[-1]]
        loc2 = locations[individual[0]]
        distance += haversine(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
        return distance,

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 20, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    return [locations[i] for i in best_indices]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not isinstance(locations, list):
        return jsonify({"error": "Invalid locations format"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
             return jsonify({"error": "Malformed location data"}), 400

    if len(locations) == 0:
        return jsonify({
            "optimized_route": [],
            "status": "success",
            "message": "Empty locations list"
        })

    optimized = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized,
        "status": "success",
        "message": "Route optimized successfully using Genetic Algorithm"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
