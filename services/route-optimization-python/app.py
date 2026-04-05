from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Define Genetic Algorithm Types
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def evalTSP(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        loc1 = locations[individual[i]]
        loc2 = locations[individual[i+1]]
        distance += np.sqrt((loc1['lat'] - loc2['lat'])**2 + (loc1['lng'] - loc2['lng'])**2)
    return distance,

def run_genetic_algorithm(locations):
    if len(locations) <= 1:
        return locations

    toolbox = base.Toolbox()
    n_loc = len(locations)
    toolbox.register("indices", random.sample, range(n_loc), n_loc)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evalTSP, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 10, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    return [locations[i] for i in best_indices]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Input Validation
    if not isinstance(locations, list):
        return jsonify({"status": "error", "message": "locations must be a list"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"status": "error", "message": "invalid location format"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"status": "error", "message": "coordinates must be numbers"}), 400

    if len(locations) < 1:
         return jsonify({"status": "error", "message": "at least one location is required"}), 400

    optimized = run_genetic_algorithm(locations)

    return jsonify({
        "optimized_route": optimized,
        "status": "success",
        "message": "Route optimized successfully using Genetic Algorithm"
    })

@app.route('/forecast', methods=['GET'])
def forecast_demand():
    # Placeholder for LSTM-based demand forecasting
    # Technical Debt: Integrate LSTM model from services/route-optimization-python/models/forecast_model.h5
    return jsonify({
        "forecast": [],
        "status": "success",
        "message": "Demand forecast generated (placeholder)"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
