from flask import Flask, jsonify, request
import math
import random
from deap import base, creator, tools, algorithms

app = Flask(__name__)

def haversine_distance(coord1, coord2):
    R = 6371  # Earth radius in kilometers
    lat1, lon1 = coord1['lat'], coord1['lng']
    lat2, lon2 = coord2['lat'], coord2['lng']

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def solve_tsp(locations):
    if len(locations) <= 1:
        return locations, 0.0

    # Define the problem as minimizing the total distance
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMin)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(len(locations)), len(locations))
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def eval_tsp(individual):
        distance = 0
        for i in range(len(individual) - 1):
            distance += haversine_distance(locations[individual[i]], locations[individual[i+1]])
        distance += haversine_distance(locations[individual[-1]], locations[individual[0]])
        return distance,

    toolbox.register("evaluate", eval_tsp)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, stats=stats, halloffame=hof, verbose=False)

    best_ind = hof[0]
    optimized_locations = [locations[i] for i in best_ind]
    total_distance = eval_tsp(best_ind)[0]

    return optimized_locations, total_distance

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    if not data or 'locations' not in data:
        return jsonify({"error": "Missing locations in request"}), 400

    locations = data['locations']

    # Simple validation
    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Invalid location format"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": "Latitude and longitude must be numbers"}), 400

    try:
        optimized_locations, total_distance = solve_tsp(locations)
        return jsonify({
            "optimized_route": optimized_locations,
            "total_distance": total_distance,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
