from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Genetic Algorithm Setup
def setup_ga():
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMin)

def evalTSP(individual, distance_matrix):
    distance = 0
    for i in range(len(individual) - 1):
        distance += distance_matrix[individual[i]][individual[i+1]]
    distance += distance_matrix[individual[-1]][individual[0]]
    return distance,

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Insufficient locations for optimization"
        })

    # Validate coordinates
    for loc in locations:
        if 'lat' not in loc or 'lng' not in loc:
            return jsonify({"status": "error", "message": "Invalid location format"}), 400

    # Calculate distance matrix (Euclidean)
    size = len(locations)
    dist_matrix = np.zeros((size, size))
    for i in range(size):
        for j in range(size):
            dist_matrix[i][j] = np.sqrt((locations[i]['lat'] - locations[j]['lat'])**2 +
                                         (locations[i]['lng'] - locations[j]['lng'])**2)

    setup_ga()
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(size), size)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evalTSP, distance_matrix=dist_matrix)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 20, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_route = [locations[i] for i in best_indices]

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized successfully using GA"
    })

@app.route('/forecast', methods=['POST'])
def forecast_demand():
    # Technical Debt: Integrate LSTM model for demand forecasting
    return jsonify({
        "forecast": [],
        "message": "Demand forecasting model integration pending"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
