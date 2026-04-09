import random
import math
from flask import Flask, jsonify, request
from deap import base, creator, tools, algorithms

app = Flask(__name__)

# Define Genetic Algorithm types
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def haversine_distance(p1, p2):
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371  # Earth radius
    lat1, lon1 = math.radians(p1['lat']), math.radians(p1['lng'])
    lat2, lon2 = math.radians(p2['lat']), math.radians(p2['lng'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def eval_tsp(individual, locations):
    """Fitness function: Total distance of the route."""
    distance = 0
    for i in range(len(individual) - 1):
        distance += haversine_distance(locations[individual[i]], locations[individual[i+1]])
    # Return to start
    distance += haversine_distance(locations[individual[-1]], locations[individual[0]])
    return distance,

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    if not data or "locations" not in data:
        return jsonify({"error": "Missing locations in request"}), 400

    locations = data.get("locations", [])

    # Input validation
    for loc in locations:
        if not isinstance(loc, dict) or "lat" not in loc or "lng" not in loc:
            return jsonify({"error": "Invalid location format. Each location must have lat and lng"}), 400
        if not isinstance(loc["lat"], (int, float)) or not isinstance(loc["lng"], (int, float)):
            return jsonify({"error": "Latitude and longitude must be numeric"}), 400

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "status": "success",
            "message": "Too few locations to optimize"
        })

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(len(locations)), len(locations))
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    toolbox.register("evaluate", eval_tsp, locations=locations)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, halloffame=hof, verbose=False)

    best_indices = hof[0]
    optimized_route = [locations[i] for i in best_indices]

    return jsonify({
        "optimized_route": optimized_route,
        "status": "success",
        "message": "Route optimized successfully using Genetic Algorithm"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
