from flask import Flask, jsonify, request
import random
from deap import base, creator, tools, algorithms
import math

app = Flask(__name__)

# Haversine distance calculation
def haversine_distance(p1, p2):
    R = 6371  # Earth radius in kilometers
    lat1, lon1 = math.radians(p1['lat']), math.radians(p1['lng'])
    lat2, lon2 = math.radians(p2['lat']), math.radians(p2['lng'])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# GA configuration
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)

def eval_route(individual, locations):
    distance = 0
    for i in range(len(individual) - 1):
        distance += haversine_distance(locations[individual[i]], locations[individual[i+1]])
    return (distance,)

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get("locations", [])

    if len(locations) < 2:
        return jsonify({
            "optimized_route": locations,
            "total_distance": 0,
            "status": "success",
            "message": "Too few locations to optimize"
        })

    toolbox = base.Toolbox()
    toolbox.register("indices", random.sample, range(len(locations)), len(locations))
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register("evaluate", eval_route, locations=locations)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=50)
    hof = tools.HallOfFame(1)

    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, halloffame=hof, verbose=False)

    best_route_indices = hof[0]
    optimized_route = [locations[i] for i in best_route_indices]
    total_distance = hof[0].fitness.values[0]

    return jsonify({
        "optimized_route": optimized_route,
        "total_distance": total_distance,
        "status": "success",
        "message": "Route optimized using Genetic Algorithm"
    })

@app.route('/forecast', methods=['GET'])
def forecast_demand():
    return jsonify({
        "status": "success",
        "forecast": [
            {"zone": "Downtown", "demand": 150},
            {"zone": "Suburbs", "demand": 85}
        ]
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
