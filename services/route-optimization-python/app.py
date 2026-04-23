from flask import Flask, jsonify, request
import random
import math
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Define the problem as minimizing distance at module level
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

# Haversine formula to calculate distance between two points
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def solve_tsp(locations):
    if len(locations) <= 1:
        return locations, 0

    toolbox = base.Toolbox()
    indices = list(range(len(locations)))
    toolbox.register("indices", random.sample, indices, len(indices))
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
        return (distance,)

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, verbose=False)

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
        if not isinstance(loc, dict) or not all(k in loc for k in ("lat", "lng")):
             return jsonify({"error": "Each location must be a dictionary with lat and lng"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
             return jsonify({"error": "lat and lng must be numeric"}), 400

    optimized_locations, total_distance = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_locations,
        "distance": total_distance,
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
