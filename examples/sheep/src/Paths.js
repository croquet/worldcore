// import { ModelService, Constants, v3_normalize, WorldcoreView, THREE, v3_multiply, v3_add, PriorityQueue, v3_manhattan, v3_magnitude, v3_sub } from "@croquet/worldcore";
// import { packKey, unpackKey, Voxels } from "./Voxels";

import { ModelService, Constants, WorldcoreView, THREE, v3_add } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Constants -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

Constants.xSize = 8;
Constants.zSize = 8;



//------------------------------------------------------------------------------------------
//-- Utility ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export function packKey(x,y,z) {
    return (x << 20) | y << 10 | z;
}

export function unpackKey(key) {
    return [(key >>> 20) & 0x3FF, (key >>> 10) & 0x3FF, key & 0x3FF];
}

function adjacent(x,y,z,v) {
    const out = [...v];
    out[0] += x;
    out[1] += y;
    out[2] += z;
    return out;
}

//------------------------------------------------------------------------------------------
//-- Paths ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Paths extends ModelService {

    static types() {
        return { "Path:Node": Node };
    }

    init() {
        super.init('Paths');
        this.nodes = new Map();
        this.clear();
        console.log(this.nodes);
    }


    clear() {
        for (let x = 0; x < Constants.xSize; x++) {
            for (let z = 0; z < Constants.zSize; z++) {
                const node = new Node(x,1,z)
                node.clear();
                this.nodes.set(node.key, node);

            }
        }

        this.addObstacle(0,0);
        this.addObstacle(7,5);
        this.addObstacle(3,3);

    }

    addObstacle(x,z) {
        const noKey = packKey(x,1,z);
        this.nodes.delete(noKey);

        const west = this.nodes.get(packKey(...adjacent(x,1,z,[-1,0,0])));
        const south = this.nodes.get(packKey(...adjacent(x,1,z,[0,0,-1])));
        const east = this.nodes.get(packKey(...adjacent(x,1,z,[1,0,0])));
        const north = this.nodes.get(packKey(...adjacent(x,1,z,[0,0,1])));

        const southwest = this.nodes.get(packKey(...adjacent(x,1,z,[-1,0,-1])));
        const southeast = this.nodes.get(packKey(...adjacent(x,1,z,[1,0,-1])));
        const northeast = this.nodes.get(packKey(...adjacent(x,1,z,[1,0,1])));
        const northwest = this.nodes.get(packKey(...adjacent(x,1,z,[-1,0,1])));

        if (west) west.exits[2] = 0;
        if (south) south.exits[3] = 0;
        if (east) east.exits[0] = 0;
        if (north) north.exits[1] = 0;

        if (southwest) southwest.exits[6] = 0;
        if (southeast) southeast.exits[7] = 0;
        if (northeast) northeast.exits[4] = 0;
        if (northwest) northwest.exits[5] = 0;
    }

    addHorizontalFence(x0,x1,z) {}

    findPath(startKey, endKey) {

        const path = [];

        if (!this.nodes.has(startKey)) return path;  // Invalid start waypoint
        if (!this.nodes.has(endKey)) return path;    // Invalid end waypoint
        // if (startKey === endKey) return [startKey] // already at destination

        const endXYZ = this.get(endKey).xyz;

        const frontier = new PriorityQueue((a, b) => a.priority < b.priority);
        const visited = new Map();

        frontier.push({priority: 0, key: startKey});
        visited.set(startKey, {from: startKey, cost: 0});

        let key;
        while (!frontier.isEmpty) {
            key = frontier.pop().key;
            if (key === endKey) break;
            const cost = visited.get(key).cost;
            const node = this.get(key);
            node.exits.forEach((exit,n) => {
                const weight = node.weight(n);
                if (!visited.has(exit)) visited.set(exit, {}); // First time visited
                const next = visited.get(exit);
                if (!next.from || next.cost > cost + weight ){ // This route is better
                    next.from = key;
                    next.cost = cost + weight;
                    const heuristic = v3_manhattan(this.get(exit).xyz, endXYZ);
                    frontier.push({priority: next.cost + heuristic, key: exit});
                }
            })
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
//-- Node ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Node {
    constructor(x,y,z) {
        this.xyz = [x,y,z];
        this.key = packKey(x,y,z);
        this.exits = [0,0,0,0, 0,0,0,0];
    }

    get west() { return this.exits[0]; }
    get south() { return this.exits[1]; }
    get east() { return this.exits[2]; }
    get north() { return this.exits[3]; }

    get southwest() { return this.exits[4]; }
    get southeast() { return this.exits[5]; }
    get northeast() { return this.exits[6]; }
    get northwest() { return this.exits[7]; }

    get hasExit() { return this.exits.some(e => e)}
    get isEmpty() { return !this.hasExit; }

    clear() {
        const x = this.xyz[0];
        const z = this.xyz[2];

        if (x>0) this.exits[0] = packKey(...adjacent(...this.xyz, [-1,0,0]));
        if (z>0) this.exits[1] = packKey(...adjacent(...this.xyz, [0,0,-1]));
        if (x<Constants.xSize-1) this.exits[2] = packKey(...adjacent(...this.xyz, [1,0,0]));
        if (z<Constants.zSize-1) this.exits[3] = packKey(...adjacent(...this.xyz, [0,0,1]));

        if (x>0 && z>0) this.exits[4] = packKey(...adjacent(...this.xyz, [-1,0,-1]));
        if (x<Constants.xSize-1 && z>0) this.exits[5] = packKey(...adjacent(...this.xyz, [1,0,-1]));
        if (x<Constants.xSize-1 && z<Constants.zSize-1) this.exits[6] = packKey(...adjacent(...this.xyz, [1,0,1]));
        if (x>0 && z<Constants.zSize-1) this.exits[7] = packKey(...adjacent(...this.xyz, [-1,0,1]));

    }

}

//------------------------------------------------------------------------------------------
//-- PathDebug -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PathDebug extends WorldcoreView {
    constructor(model) {
        super(model);
        const rm = this.service("ThreeRenderManager");

        this.redMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        this.greenMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
        this.yellowMaterial = new THREE.LineBasicMaterial( { color: 0xffff00 } );
        this.cyanMaterial = new THREE.LineBasicMaterial( { color: 0x00ffff } );
        this.magentaMaterial = new THREE.LineBasicMaterial( { color: 0xff00ff } );

        this.draw();
    }

    draw() {
        console.log("Draw path debug");
        const paths = this.modelService("Paths");
        const rm = this.service("ThreeRenderManager");
        if (this.group) rm.scene.remove(this.group);
        this.group = new THREE.Group();
        let material;
        let geometry
        let p0
        let p1;
        let line;

        paths.nodes.forEach(node => {

            // -- west --

            material = node.west ? this.yellowMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[0,-0.9,0]);
            p1 = v3_add(node.xyz,[0,-0.9,1]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);

            // -- south --

            material = node.south ? this.yellowMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[0,-0.9,0]);
            p1 = v3_add(node.xyz,[1,-0.9,0]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);

            // -- east --

            material = node.east ? this.yellowMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[1,-0.9,0]);
            p1 = v3_add(node.xyz,[1,-0.9,1]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);

            // -- north --

            material = node.north ? this.yellowMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[0,-0.9,1]);
            p1 = v3_add(node.xyz,[1,-0.9,1]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);

            // -- southwest --

            material = node.southwest ? this.cyanMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[0.5,-0.9,0.5]);
            p1 = v3_add(node.xyz,[0.25,-0.9,0.25]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);

            // -- southeast --

            material = node.southeast ? this.cyanMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[0.5,-0.9,0.5]);
            p1 = v3_add(node.xyz,[0.75,-0.9,0.25]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);

            // -- northeast --

            material = node.northeast ? this.cyanMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[0.5,-0.9,0.5]);
            p1 = v3_add(node.xyz,[0.75,-0.9,0.75]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);

            // -- northwest --

            material = node.northwest ? this.cyanMaterial : this.redMaterial;
            p0 = v3_add(node.xyz,[0.5,-0.9,0.5]);
            p1 = v3_add(node.xyz,[0.25,-0.9,0.75]);

            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.group.add(line);







            // if (node.northeast<3) {
            //     let p0 = v3_add(node.xyz,[0.5,0.5,0]);
            //     let p1 = v3_add(node.xyz,[0.75,0.75,0]);
            //     p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
            //     p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

            //     const geometry = new THREE.BufferGeometry().setFromPoints([
            //         new THREE.Vector3(...p0),
            //         new THREE.Vector3(...p1)
            //     ]);
            //     const line = new THREE.Line( geometry, this.yellowMaterial );

            //     this.group.add(line);
            // }

            // if (node.northwest<3) {
            //     let p0 = v3_add(node.xyz,[0.5,0.5,0]);
            //     let p1 = v3_add(node.xyz,[0.25,0.75,0]);
            //     p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
            //     p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

            //     const geometry = new THREE.BufferGeometry().setFromPoints([
            //         new THREE.Vector3(...p0),
            //         new THREE.Vector3(...p1)
            //     ]);
            //     const line = new THREE.Line( geometry, this.yellowMaterial );

            //     this.group.add(line);
            // }

        })

        rm.scene.add(this.group);

    }

    drawPath(path) {
        const render = this.service("ThreeRenderManager");
        if (this.path) render.scene.remove(this.path);

        const points = [];

        path.forEach(key=> {
            const xyz = unpackKey(key);
            let p = v3_add(xyz,[0.5,0.5,1]);
            p = v3_multiply(p, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
            points.push(new THREE.Vector3(...p));
        })

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.path = new THREE.Line( geometry, this.cyanMaterial );

        render.scene.add(this.path);
    }


}