from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Genetic Algorithm setup
def create_ga_types():
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMin)

def calculate_distance(p1, p2):
    return np.sqrt((p1['lat'] - p2['lat'])**2 + (p1['lng'] - p2['lng'])**2)

def evaluate(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        distance += calculate_distance(locations[individual[i]], locations[individual[i+1]])
    return distance,

def optimize_tsp(locations):
    if len(locations) <= 1:
        return locations

    create_ga_types()
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(len(locations)), len(locations))
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evaluate, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 40, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    return [locations[i] for i in best_indices]

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Input validation
    if not isinstance(locations, list):
        return jsonify({"error": "locations must be a list"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "invalid location format"}), 400
        if not (isinstance(loc['lat'], (int, float)) and isinstance(loc['lng'], (int, float))):
            return jsonify({"error": "lat and lng must be numbers"}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Too few locations to optimize"
        })

    optimized = optimize_tsp(locations)
    return jsonify({
        "optimized_route": optimized,
        "status": "success",
        "message": "Route optimized using Genetic Algorithm"
    })

@app.route('/forecast', methods=['POST'])
def forecast_demand():
    # Placeholder for LSTM demand forecasting
    return jsonify({
        "forecast": [],
        "status": "success",
        "message": "Demand forecast placeholder (LSTM model integration pending)"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
