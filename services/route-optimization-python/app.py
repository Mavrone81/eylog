from flask import Flask, jsonify, request
import math
import random
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Haversine formula to calculate distance between two points
def haversine(p1, p2):
    R = 6371  # Earth radius in km
    lat1, lon1 = math.radians(p1['lat']), math.radians(p1['lng'])
    lat2, lon2 = math.radians(p2['lat']), math.radians(p2['lng'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_total_distance(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        distance += haversine(locations[individual[i]], locations[individual[i+1]])
    # Return to start (optional, but standard for TSP)
    # distance += haversine(locations[individual[-1]], locations[individual[0]])
    return distance,

def solve_tsp(locations):
    num_locations = len(locations)
    if num_locations <= 1:
        return locations, 0.0

    # Ensure DEAP types are defined only once
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMin)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", calculate_total_distance, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    stats = tools.Statistics(lambda ind: ind.fitness.values[0])
    stats.register("avg", lambda x: sum(x) / len(x) if x else 0)
    stats.register("min", min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 40, stats=stats, halloffame=hof, verbose=False)

    best_ind = hof[0]
    optimized_locations = [locations[i] for i in best_ind]
    total_distance = calculate_total_distance(best_ind, locations)[0]

    return optimized_locations, total_distance

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    if not data or 'locations' not in data:
        return jsonify({"error": "Missing locations data"}), 400

    locations = data['locations']

    # Input validation
    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
             return jsonify({"error": "Invalid location format"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
             return jsonify({"error": "Invalid location coordinates"}), 400

    optimized_route, total_distance = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_route,
        "total_distance": total_distance,
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
