import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Genetic Algorithm setup
def eval_tsp(individual, distance_matrix):
    distance = 0
    for i in range(len(individual) - 1):
        distance += distance_matrix[individual[i]][individual[i+1]]
    distance += distance_matrix[individual[-1]][individual[0]]
    return distance,

def run_optimization(locations):
    num_locations = len(locations)
    if num_locations < 2:
        return locations

    # Create distance matrix
    coords = np.array([[loc['lat'], loc['lng']] for loc in locations])
    dist_matrix = np.sqrt(((coords[:, np.newaxis] - coords) ** 2).sum(axis=2))

    # DEAP GA setup
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
    toolbox.register("evaluate", eval_tsp, distance_matrix=dist_matrix)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, stats=stats, halloffame=hof, verbose=False)

    best_idx = hof[0]
    return [locations[i] for i in best_idx]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations:
        return jsonify({"status": "error", "message": "No locations provided"}), 400

    try:
        optimized = run_optimization(locations)
        return jsonify({
            "optimized_route": optimized,
            "status": "success",
            "message": "Route optimized successfully"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/forecast', methods=['GET'])
def forecast_demand():
    # Placeholder for LSTM-based demand forecasting (Technical Debt: Requires actual model integration)
    return jsonify({
        "status": "success",
        "forecast": [10, 15, 8, 20, 12],
        "message": "Demand forecast generated (mock)"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
