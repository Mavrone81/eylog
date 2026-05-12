import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Ensure DEAP types are defined only once
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def haversine_distance(coord1, coord2):
    """Calculate distance between two points on Earth using Haversine formula."""
    R = 6371.0  # Earth radius in kilometers
    lat1, lon1 = np.radians(coord1['lat']), np.radians(coord1['lng'])
    lat2, lon2 = np.radians(coord2['lat']), np.radians(coord2['lng'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = np.sin(dlat / 2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c

def solve_tsp(locations):
    if len(locations) <= 1:
        return locations, 0.0

    num_locations = len(locations)
    distance_matrix = np.zeros((num_locations, num_locations))
    for i in range(num_locations):
        for j in range(num_locations):
            distance_matrix[i][j] = haversine_distance(locations[i], locations[j])

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(len(individual)):
            start_node = individual[i]
            end_node = individual[(i + 1) % len(individual)]
            distance += distance_matrix[start_node][end_node]
        return (distance,)

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    population = toolbox.population(n=300)
    stats = tools.Statistics(lambda ind: ind.fitness.values[0])
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(population, toolbox, cxpb=0.7, mutpb=0.2, ngen=50, stats=stats, verbose=False)

    best_ind = tools.selBest(population, 1)[0]
    optimized_locations = [locations[i] for i in best_ind]
    return optimized_locations, best_ind.fitness.values[0]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Input validation
    if not isinstance(locations, list):
        return jsonify({"error": "Locations must be a list"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Invalid location format"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": "Latitude and Longitude must be numeric"}), 400

    optimized_locations, distance = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_locations,
        "distance": distance,
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
