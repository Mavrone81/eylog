import random
import numpy as np
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Genetic Algorithm Setup
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def evalTSP(individual, distance_matrix):
    distance = distance_matrix[individual[-1]][individual[0]]
    for gene1, gene2 in zip(individual[0:-1], individual[1:]):
        distance += distance_matrix[gene1][gene2]
    return distance,

def solve_tsp(locations):
    if not locations or len(locations) < 2:
        return locations

    # Calculate distance matrix (Euclidean distance for simplicity)
    num_locations = len(locations)
    distance_matrix = np.zeros((num_locations, num_locations))
    for i in range(num_locations):
        for j in range(num_locations):
            p1 = locations[i]
            p2 = locations[j]
            distance_matrix[i][j] = np.sqrt((p1['lat'] - p2['lat'])**2 + (p1['lng'] - p2['lng'])**2)

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evalTSP, distance_matrix=distance_matrix)

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
        return jsonify({"error": "Invalid locations format"}), 400

    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Invalid location object"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": "Location coordinates must be numeric"}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Too few locations to optimize"
        })

    try:
        optimized = solve_tsp(locations)
        return jsonify({
            "optimized_route": optimized,
            "status": "success",
            "message": "Route optimized successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/forecast', methods=['POST'])
def demand_forecast():
    # Placeholder for LSTM demand forecasting
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
