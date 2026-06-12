from flask import Flask, jsonify, request
import numpy as np
from deap import base, creator, tools, algorithms
import random
import math

app = Flask(__name__)

# Define DEAP creator types at module level safely
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def solve_tsp(locations):
    num_locations = len(locations)
    if num_locations <= 1:
        return locations, 0.0

    def eval_tsp(individual):
        distance = 0
        for i in range(num_locations - 1):
            loc1 = locations[individual[i]]
            loc2 = locations[individual[i+1]]
            distance += haversine(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
        # Return to start
        loc_last = locations[individual[-1]]
        loc_first = locations[individual[0]]
        distance += haversine(loc_last['lat'], loc_last['lng'], loc_first['lat'], loc_first['lng'])
        return (distance,)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", eval_tsp)

    pop = toolbox.population(n=300)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=50, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_route = [locations[i] for i in best_indices]
    total_distance = hof[0].fitness.values[0]

    return optimized_route, total_distance

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations:
        return jsonify({"error": "No locations provided"}), 400

    optimized_route, total_distance = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_route,
        "total_distance_km": total_distance,
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
