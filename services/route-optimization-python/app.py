from flask import Flask, jsonify, request
import math
import random
from deap import base, creator, tools, algorithms

app = Flask(__name__)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def solve_tsp(locations):
    if len(locations) <= 1:
        return locations

    size = len(locations)
    dist_matrix = [[haversine(locations[i]['lat'], locations[i]['lng'],
                              locations[j]['lat'], locations[j]['lng'])
                    for j in range(size)] for i in range(size)]

    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMin)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(size), size)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = sum(dist_matrix[individual[i]][individual[i+1]] for i in range(size - 1))
        distance += dist_matrix[individual[-1]][individual[0]]
        return (distance,)

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, verbose=False)

    best_ind = tools.selBest(pop, 1)[0]
    return [locations[i] for i in best_ind]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    if not data or 'locations' not in data:
        return jsonify({"error": "Missing locations"}), 400

    locations = data['locations']
    if not isinstance(locations, list):
        return jsonify({"error": "Locations must be a list"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
             return jsonify({"error": "Invalid location format"}), 400
        if not (isinstance(loc['lat'], (int, float)) and isinstance(loc['lng'], (int, float))):
             return jsonify({"error": "Coordinates must be numbers"}), 400

    try:
        optimized = solve_tsp(locations)
        return jsonify({
            "optimized_route": optimized,
            "status": "success",
            "message": "Route optimized successfully using Genetic Algorithm"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
