import random
import array
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Distance calculation (Euclidean)
def calculate_distance(loc1, loc2):
    return np.sqrt((loc1['lat'] - loc2['lat'])**2 + (loc1['lng'] - loc2['lng'])**2)

# Define DEAP types outside the request to avoid re-definition errors
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", array.array, typecode='i', fitness=creator.FitnessMin)

def solve_tsp(locations):
    if len(locations) < 2:
        return locations

    size = len(locations)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(size), size)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    def evalTSP(individual):
        distance = 0
        for i in range(len(individual) - 1):
            distance += calculate_distance(locations[individual[i]], locations[individual[i+1]])
        distance += calculate_distance(locations[individual[-1]], locations[individual[0]])
        return distance,

    toolbox.register("evaluate", evalTSP)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=100)
    hof = tools.HallOfFame(1)

    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 40, stats=stats, halloffame=hof, verbose=False)

    best_indices = list(hof[0])
    return [locations[i] for i in best_indices]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Input validation
    if not isinstance(locations, list):
        return jsonify({"status": "error", "message": "Locations must be a list"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"status": "error", "message": "Invalid location format"}), 400
        try:
            float(loc['lat'])
            float(loc['lng'])
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Latitude and Longitude must be numeric"}), 400

    optimized = solve_tsp(locations)

    return jsonify({
        "optimized_route": optimized,
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/forecast', methods=['POST'])
def forecast_demand():
    # Placeholder for LSTM demand forecasting
    return jsonify({
        "status": "success",
        "forecast": "Demand forecast placeholder result",
        "message": "LSTM forecast model ready"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
