// Node

import { WorldcoreModel, PriorityQueue, v2_manhattan } from "@croquet/worldcore";

// {
//     xy: [0,0]
//     exits: [
//         { node: 0, weight: 5 },
//         { node: 2, weight: 7 },
//     ]
// }

export class Paths extends WorldcoreModel {
    init() {
        super.init();
        this.nodes = new Map();
    }

    addNode(key, xy) {
        this.nodes.set(key, {xy, exits:new Map()});
        return this.nodes.length-1;
    }

    getNode(key) {return this.nodes.get(key) }

    addEdge(key0, key1, weight) {
        const node0 = this.getNode(key0);
        const node1 = this.getNode(key1);
        if (node0 && node1) {
            node0.exits.set(key1, weight);
            node1.exits.set(key0, weight);
        }

    }

    removeEdge(key0, key1) {
        const node0 = this.getNode(key0);
        const node1 = this.getNode(key1);
        if (node0 && node1) {
            node0.exits.delete(key1);
            node1.exits.delete(key0);
        }
    }

    removeNode(key) {
        const node = this.getNode(key);
        if (node) for (const exitKey of node.exits.keys()) { this.getNode(exitKey).exits.delete(key); }
        this.nodes.delete(key);
    }

    findPath(startKey, endKey) {

        const path = [];

        if (!this.nodes.has(startKey)) return path;  // Invalid start waypoint
        if (!this.nodes.has(endKey)) return path;    // Invalid end waypoint

        const endXY = this.getNode(endKey).xy;

        const frontier = new PriorityQueue((a, b) => a.priority < b.priority);
        const visited = new Map();
        visited.set(startKey, {from: startKey, cost: 0});

        // Iterate until frontier is empty or we test the end of the path
        let key = startKey;
        let cost = 0;
        let count = 0;
        do {
            if (key === endKey) break;
            this.getNode(key).exits.forEach( (exitWeight, exitKey) => {
                if (!visited.has(exitKey)) visited.set(exitKey, { from: key, cost: cost + exitWeight}); // First time visited
                const exit = visited.get(exitKey);
                if( exit.cost > cost + exitWeight ) { // This route is better
                    exit.from = key;
                    exit.cost = cost + exitWeight;
                };
                const heuristic = v2_manhattan(this.getNode(exitKey).xy, endXY);
                frontier.push({priority: exit.cost + heuristic, key: exitKey});
            });
            key = frontier.pop().key;
            cost = visited.get(key).cost;
            count++;
            console.log(key);
            if (count> 10) {
                console.log("hung!")
                return [];
            }
        } while(!frontier.isEmpty)


        if (key === endKey) { // A path was found!
            while (key !== startKey) { // Run backwards along "from" links to build path array
                path.push(key);
                key = visited.get(key).from;
            }
            path.push(startKey);
            path.reverse();
        }

        return path;



    }
}
Paths.register('Paths');