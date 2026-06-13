import random
import numpy as np
from flask import Flask, request, jsonify
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Haversine formula for distance calculation
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Define fitness and individual classes if they don't exist
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locations = len(locations)
    if num_locations <= 1:
        return locations, 0.0

    # Pre-calculate distance matrix
    dist_matrix = np.zeros((num_locations, num_locations))
    for i in range(num_locations):
        for j in range(num_locations):
            dist_matrix[i][j] = haversine(
                locations[i]['lat'], locations[i]['lng'],
                locations[j]['lat'], locations[j]['lng']
            )

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(len(individual) - 1):
            distance += dist_matrix[individual[i]][individual[i+1]]
        # Return to start
        distance += dist_matrix[individual[-1]][individual[0]]
        return distance,

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=300)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=50, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_route = [locations[i] for i in best_indices]
    total_distance = eval_tsp(best_indices)[0]

    return optimized_route, total_distance

@app.route('/optimize', methods=['POST'])
def optimize():
    data = request.json
    locations = data.get('locations', [])

    if not locations:
        return jsonify({"status": "error", "message": "No locations provided"}), 400

    optimized_route, total_distance = solve_tsp(locations)

    return jsonify({
        "status": "success",
        "optimized_route": optimized_route,
        "total_distance_km": total_distance,
        "message": "Route optimized successfully"
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
