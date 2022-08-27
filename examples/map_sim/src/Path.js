// Node

// {
//     xy: [0,0]
//     exits: [
//         { node: 0, weight: 5 },
//         { node: 2, weight: 7 },
//     ]
// }

class Paths {
    constructor() {
        this.nodes = [];

    }

    addNode(xy) {
        this.nodes.push({xy, exits:[]});
        return this.nodes.length-1;
    }

    addEdge(node0, node1, weight) {
        this.nodes[node0].exits.push({node: node1, weight});
        this.nodes[node1].exits.push({node: node0, weight});
    }

    removeEdge(node0, node1) {

    }

    removeNode(node) {
        for (const exit of this.nodes[node].exits) {
            this.nodes[exit.node].exits.filter(x => x.node !== node);
        };
        this.nodes.splice(node,1);
    }
}