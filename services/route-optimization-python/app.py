from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Genetic Algorithm Types (Defined at module level to avoid re-definition errors)
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def distance_calculation(p1, p2):
    return np.sqrt((p1['lat'] - p2['lat'])**2 + (p1['lng'] - p2['lng'])**2)

def evaluate(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        distance += distance_calculation(locations[individual[i]], locations[individual[i+1]])
    distance += distance_calculation(locations[individual[-1]], locations[individual[0]])
    return distance,

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Validate numeric lat/lng
    for loc in locations:
        if 'lat' not in loc or 'lng' not in loc or not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
             return jsonify({"error": "Invalid location format"}), 400

    if not locations or len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Insufficient locations for optimization"
        })

    n = len(locations)
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(n), n)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evaluate, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_route = [locations[i] for i in best_indices]

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized using Genetic Algorithm"
    })

@app.route('/forecast', methods=['GET'])
def demand_forecast():
    # Placeholder for LSTM demand forecasting
    return jsonify({
        "status": "success",
        "message": "Demand forecasting placeholder endpoint (LSTM model not loaded)",
        "forecast": []
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
