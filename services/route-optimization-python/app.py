import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms

app = Flask(__name__)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi/2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda/2)**2
    return 2 * R * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

def solve_tsp(locations):
    if len(locations) <= 1:
        return locations, 0.0

    num_locs = len(locations)
    dist_matrix = np.zeros((num_locs, num_locs))
    for i in range(num_locs):
        for j in range(num_locs):
            dist_matrix[i, j] = haversine(
                locations[i]['lat'], locations[i]['lng'],
                locations[j]['lat'], locations[j]['lng']
            )

    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMin)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locs), num_locs)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def evalTSP(individual):
        distance = 0
        for i in range(num_locs - 1):
            distance += dist_matrix[individual[i], individual[i+1]]
        distance += dist_matrix[individual[-1], individual[0]]
        return distance,

    toolbox.register("evaluate", evalTSP)
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
