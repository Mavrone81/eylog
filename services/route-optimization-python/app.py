from flask import Flask, jsonify, request
import numpy as np
from deap import base, creator, tools, algorithms
import random
import math

app = Flask(__name__)

# Haversine formula to calculate distance between two points on Earth
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def calculate_total_distance(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        loc1 = locations[individual[i]]
        loc2 = locations[individual[i+1]]
        distance += haversine(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
    # Return to start
    loc1 = locations[individual[-1]]
    loc2 = locations[individual[0]]
    distance += haversine(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
    return distance,

if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def solve_tsp(locations):
    num_locations = len(locations)
    if num_locations <= 1:
        return locations, 0.0

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(num_locations), num_locations)
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", calculate_total_distance, locations=locations)

    pop = toolbox.population(n=300)
    hof = tools.HallOfFame(1)
    stats = tools.Statistics(lambda ind: ind.fitness.values[0])
    stats.register("avg", np.mean)
    stats.register("min", np.min)

    algorithms.eaSimple(pop, toolbox, 0.7, 0.2, 50, stats=stats, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_locations = [locations[i] for i in best_indices]
    total_distance = calculate_total_distance(best_indices, locations)[0]

    return optimized_locations, total_distance

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    # Input validation
    for loc in locations:
        if not isinstance(loc, dict) or 'lat' not in loc or 'lng' not in loc:
            return jsonify({"error": "Invalid location format"}), 400
        if not isinstance(loc['lat'], (int, float)) or not isinstance(loc['lng'], (int, float)):
            return jsonify({"error": "Latitude and Longitude must be numbers"}), 400

    optimized_locations, total_distance = solve_tsp(locations)

    return jsonify({
        "optimized_locations": optimized_locations,
        "total_distance": total_distance,
        "status": "success"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
