import math
from flask import Flask, jsonify, request
import numpy as np
from deap import base, creator, tools, algorithms
import random

app = Flask(__name__)

# Define DEAP types once at module level
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def validate_locations(locations):
    if not isinstance(locations, list):
        return False, "Locations must be a list"
    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return False, "Each location must be a dict with 'lat' and 'lng'"
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return False, "Latitude and Longitude must be numbers"
    return True, None

def solve_tsp(locations):
    num_locs = len(locations)
    if num_locs <= 1:
        return locations, 0.0

    # Distance matrix
    dist_matrix = np.zeros((num_locs, num_locs))
    for i in range(num_locs):
        for j in range(num_locs):
            dist_matrix[i][j] = haversine(
                locations[i]['lat'], locations[i]['lng'],
                locations[j]['lat'], locations[j]['lng']
            )

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locs), num_locs)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(len(individual) - 1):
            distance += dist_matrix[individual[i]][individual[i+1]]
        distance += dist_matrix[individual[-1]][individual[0]] # Return to start
        return distance,

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values[0])
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 40, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_locations = [locations[i] for i in best_indices]
    return optimized_locations, hof[0].fitness.values[0]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    is_valid, error_msg = validate_locations(locations)
    if not is_valid:
        return jsonify({"status": "error", "message": error_msg}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "total_distance": 0.0,
            "status": "success"
        })

    optimized_locations, total_distance = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_locations,
        "total_distance": total_distance,
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
