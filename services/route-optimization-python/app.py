from flask import Flask, jsonify, request
import random
import numpy as np
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Define Fitness and Individual for Genetic Algorithm
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def calculate_distance(loc1, loc2):
    return np.sqrt((loc1['lat'] - loc2['lat'])**2 + (loc1['lng'] - loc2['lng'])**2)

def evaluate_route(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        distance += calculate_distance(locations[individual[i]], locations[individual[i+1]])
    distance += calculate_distance(locations[individual[-1]], locations[individual[0]])
    return distance,

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if not locations or not isinstance(locations, list):
        return jsonify({"status": "error", "message": "Invalid locations data"}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Not enough points to optimize, returning original list"
        })

    # GA Configuration
    n_points = len(locations)
    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(n_points), n_points)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", evaluate_route, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", np.min)

    # Run GA
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, stats=stats, halloffame=hof, verbose=False)

    best_individual = hof[0]
    optimized_locations = [locations[i] for i in best_individual]

    return jsonify({
        "optimized_route": optimized_locations,
        "status": "success",
        "message": "Route optimized using Genetic Algorithm"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
