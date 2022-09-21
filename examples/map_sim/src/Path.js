// Node

import { WorldcoreModel, ModelService, PriorityQueue, v2_manhattan, WorldcoreView, viewRoot, THREE } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Paths ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Paths extends ModelService {
    init() {
        super.init("Paths");
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

    randomNode() {
        const keys = [...this.nodes.keys()];
        const n = Math.floor(keys.length * Math.random() )
        return keys[n];
    }

    findPath(startKey, endKey) {

        const path = [];

        if (!this.nodes.has(startKey)) return path;  // Invalid start waypoint
        if (!this.nodes.has(endKey)) return path;    // Invalid end waypoint

        const endXY = this.getNode(endKey).xy;

        const frontier = new PriorityQueue((a, b) => a.priority < b.priority);
        const visited = new Map();

        frontier.push({priority: 0, key: startKey});
        visited.set(startKey, {from: startKey, cost: 0});

        let key;
        while (!frontier.isEmpty) {
            key = frontier.pop().key;
            if (key === endKey) break;
            const cost = visited.get(key).cost;
            this.getNode(key).exits.forEach( (exitWeight, exitKey) => {
                if (!visited.has(exitKey)) visited.set(exitKey, {}); // First time visited
                const exit = visited.get(exitKey);
                if (!exit.from || exit.cost > cost + exitWeight) { // This route is better
                    exit.from = key;
                    exit.cost = cost + exitWeight;
                    const heuristic = v2_manhattan(this.getNode(exitKey).xy, endXY);
                    frontier.push({priority: exit.cost + heuristic, key: exitKey});
                }
            });
        }

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

//------------------------------------------------------------------------------------------
//-- PathDebug -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PathDebug extends WorldcoreView {
    constructor() {
        super(viewRoot.model);

        this.nodeMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        this.edgeMaterial = new THREE.LineBasicMaterial( { color: 0x00ffff } );

        this.drawNodes();
        this.drawEdges();

    }

    drawNodes() {
        const render = this.service("ThreeRenderManager");
        const paths = this.modelService("Paths");
        const group = new THREE.Group();
        paths.nodes.forEach(node => {
            const points = [
                new THREE.Vector3( node.xy[0], 0, node.xy[1] ),
                new THREE.Vector3( node.xy[0], 3, node.xy[1] )
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.Line( geometry, this.nodeMaterial );
            group.add(line);
        });
        render.scene.add(group);
    }

    drawEdges() {
        const render = this.service("ThreeRenderManager");
        const paths = this.modelService("Paths");
        const group = new THREE.Group();
        paths.nodes.forEach(node0 => {
            node0.exits.forEach((weight, key) => {
                const node1 = paths.getNode(key);
                const points = [
                    new THREE.Vector3( node0.xy[0], 0.2, node0.xy[1] ),
                    new THREE.Vector3( node1.xy[0], 0.2, node1.xy[1] )
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line( geometry, this.edgeMaterial );
                group.add(line);
            });
        });
        render.scene.add(group);
    }
}