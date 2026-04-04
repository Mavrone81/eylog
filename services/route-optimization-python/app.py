from flask import Flask, jsonify, request
import random
import array
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Genetic Algorithm Setup for TSP
def solve_tsp(locations):
    if len(locations) < 2:
        return locations

    # Calculate distance matrix (Euclidean for simplicity)
    def distance(loc1, loc2):
        return np.sqrt((loc1['lat'] - loc2['lat'])**2 + (loc1['lng'] - loc2['lng'])**2)

    num_locations = len(locations)
    dist_matrix = np.zeros((num_locations, num_locations))
    for i in range(num_locations):
        for j in range(num_locations):
            dist_matrix[i][j] = distance(locations[i], locations[j])

    # DEAP types
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", array.array, typecode='i', fitness=creator.FitnessMin)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def evalTSP(individual):
        distance = 0
        for i in range(len(individual) - 1):
            distance += dist_matrix[individual[i]][individual[i+1]]
        distance += dist_matrix[individual[-1]][individual[0]] # Return to start
        return distance,

    toolbox.register("evaluate", evalTSP)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 40, stats=stats, halloffame=hof, verbose=False)

    best_route_indices = list(hof[0])
    return [locations[i] for i in best_route_indices]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations:
        return jsonify({"error": "No locations provided"}), 400

    optimized_locations = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized_locations,
        "status": "success",
        "message": "Route optimized successfully using Genetic Algorithm"
    })

@app.route('/forecast', methods=['POST'])
def forecast_demand():
    # Placeholder for LSTM demand forecasting
    # In a real scenario, this would load a pre-trained model and perform inference
    data = request.json
    return jsonify({
        "forecast": "Projected demand increase by 15% in the next 24 hours",
        "model": "LSTM Neural Network",
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
