import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Define fitness and individual at module level to avoid re-definition issues
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locs = len(locations)
    if num_locs <= 1:
        return locations

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locs), num_locs)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(num_locs):
            start_node = locations[individual[i]]
            end_node = locations[individual[(i + 1) % num_locs]]
            distance += haversine(start_node['lat'], start_node['lng'],
                                 end_node['lat'], end_node['lng'])
        return distance,

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, stats=stats, halloffame=hof, verbose=False)

    best_route_indices = hof[0]
    return [locations[i] for i in best_route_indices]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Input validation
    if not isinstance(locations, list):
        return jsonify({"error": "locations must be a list"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
             return jsonify({"error": "invalid location format"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
             return jsonify({"error": "lat and lng must be numeric"}), 400

    optimized_route = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized successfully using Genetic Algorithm"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
