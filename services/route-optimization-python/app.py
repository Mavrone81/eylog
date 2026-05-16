from flask import Flask, jsonify, request
import numpy as np
import random
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

def haversine(coord1, coord2):
    R = 6371  # Earth radius in km
    lat1, lon1 = math.radians(coord1['lat']), math.radians(coord1['lng'])
    lat2, lon2 = math.radians(coord2['lat']), math.radians(coord2['lng'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_total_distance(indices, locations):
    total = 0
    for i in range(len(indices) - 1):
        total += haversine(locations[indices[i]], locations[indices[i+1]])
    # Return to start if needed (TSP), but for delivery route usually a path
    return total

# DEAP initialization
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locations = len(locations)
    if num_locations <= 1:
        return locations, 0.0

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def evaluate(individual):
        return (calculate_total_distance(individual, locations),)

    toolbox.register("evaluate", evaluate)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=300)
    stats = tools.Statistics(lambda ind: ind.fitness.values[0])
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=50, stats=stats, verbose=False)

    best_ind = tools.selBest(pop, 1)[0]
    optimized_locations = [locations[i] for i in best_ind]
    return optimized_locations, best_ind.fitness.values[0]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

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
