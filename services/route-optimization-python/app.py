from flask import Flask, jsonify, request
import math
import random
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Haversine formula to calculate distance between two points
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Radius of the earth in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Define DEAP types at the module level
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locations = len(locations)
    if num_locations <= 1:
        return locations, 0.0

    # Distance matrix
    dist_matrix = [[0.0] * num_locations for _ in range(num_locations)]
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
        distance += dist_matrix[individual[-1]][individual[0]]
        return (distance,)

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, verbose=False)

    best_ind = tools.selBest(pop, 1)[0]
    optimized_locations = [locations[i] for i in best_ind]
    total_distance = eval_tsp(best_ind)[0]

    return optimized_locations, total_distance

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not isinstance(locations, list):
        return jsonify({"error": "Locations must be a list"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Each location must be a dict with lat and lng"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": "lat and lng must be numbers"}), 400

    optimized_route, total_distance = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_route,
        "total_distance": total_distance,
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
