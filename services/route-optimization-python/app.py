from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Genetic Algorithm Types
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def euclidean_distance(p1, p2):
    return np.sqrt((p1['lat'] - p2['lat'])**2 + (p1['lng'] - p2['lng'])**2)

def evalTSP(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        distance += euclidean_distance(locations[individual[i]], locations[individual[i+1]])
    distance += euclidean_distance(locations[individual[-1]], locations[individual[0]])
    return (distance,)

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

    num_locations = len(locations)
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evalTSP, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_route = [locations[i] for i in best_indices]

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized successfully"
    })

@app.route('/forecast', methods=['GET'])
def forecast_demand():
    # Placeholder for LSTM-based demand forecasting
    return jsonify({
        "forecast": "Steady growth expected",
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
