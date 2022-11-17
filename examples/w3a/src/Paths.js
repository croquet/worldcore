import { ModelService, Constants, v3_normalize, WorldcoreView, THREE, v3_multiply, v3_add, PriorityQueue, v3_manhattan, v3_magnitude, v3_sub } from "@croquet/worldcore";
import { packKey, unpackKey, Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- Paths ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Paths extends ModelService {

    static types() {
        return { "W3:Node": Node };
    }

    init() {
        super.init('Paths');
        this.nodes = new Map();

        this.subscribe("voxels", "load", this.rebuildAll)
        this.subscribe("voxels", "set", this.rebuildAll)
    }

    get(key) {
        return this.nodes.get(key) || new Node(key);
    }

    set(key, node) {
        this.nodes.set(key,node);
    }

    rebuildAll() {
        console.log("Building path nodes ...");
        this.nodes = new Map();

        const voxels = this.service("Voxels");
        // const surfaces = this.service("Surfaces");

        const primary = new Set();

        // Build primary set
        voxels.forEachWalkable((x,y,z) => {
            const key = packKey(x,y,z);
            primary.add(key);
        })

        primary.forEach(key => {
            const node = this.get(key)
            node.findEdges(voxels)
            node.findExits()
            if(!node.isEmpty) this.set(key,node);
        });
        console.log("Path done!");


    }

    findPath(startKey, endKey) {

        const path = [];

        if (!this.nodes.has(startKey)) return path;  // Invalid start waypoint
        if (!this.nodes.has(endKey)) return path;    // Invalid end waypoint

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
    constructor(key) {
        this.xyz = unpackKey(key);
        this.key = key;
        this.edges = [0,0,0,0, 0,0,0,0];
        this.exits = [0,0,0,0, 0,0,0,0];
    }

    get west() { return this.edges[0]; }
    get south() { return this.edges[1]; }
    get east() { return this.edges[2]; }
    get north() { return this.edges[3]; }

    get southwest() { return this.edges[4]; }
    get southeast() { return this.edges[5]; }
    get northeast() { return this.edges[6]; }
    get northwest() { return this.edges[7]; }

    get hasExit() { return this.exits.some(e => e)}
    get isEmpty() { return !this.hasExit; }

    findEdges(voxels){
        voxels.forHorizontal(...this.xyz, (x,y,z,t,d) => {

            if(!Voxels.canEdit(x,y,z)) { // Blocked by edge of tile
                this.edges[d] = 3;
                return;
            }

            if( t >= 2) { // side voxel is solid
                const above = Voxels.adjacent(x,y,z,[0,0,1])
                const aboveType = voxels.get(...above);
                if( aboveType < 2) { // side voxel is climbable
                    this.edges[d] = 1;
                } else { // blocked
                    this.edges[d] = 2;
                }
            } else { // side voxel is empty
                const below = Voxels.adjacent(x,y,z,[0,0,-1]);
                const belowType = voxels.get(...below);
                if( belowType < 2) { // cliff
                    this.edges[d] = -1;
                } else {
                    this.edges[d] = 0;
                }

            }
        })
    }

    findExits() {
        if (this.west<3) this.exits[0] = packKey(...(Voxels.adjacent(...this.xyz, [-1,0,this.west])));
        if (this.south<3) this.exits[1] = packKey(...(Voxels.adjacent(...this.xyz, [0,-1,this.south])));
        if (this.east<3) this.exits[2] = packKey(...(Voxels.adjacent(...this.xyz, [1,0,this.east])));
        if (this.north<3) this.exits[3] = packKey(...(Voxels.adjacent(...this.xyz, [0,1,this.north])));

        if (this.southwest<3) this.exits[4] = packKey(...(Voxels.adjacent(...this.xyz, [-1,-1,this.southwest])));
        if (this.southeast<3) this.exits[5] = packKey(...(Voxels.adjacent(...this.xyz, [1,-1,this.southeast])));
        if (this.northeast<3) this.exits[6] = packKey(...(Voxels.adjacent(...this.xyz, [1,1,this.northeast])));
        if (this.northwest<3) this.exits[7] = packKey(...(Voxels.adjacent(...this.xyz, [-1,1,this.northwest])));

    }

    weight(n) {
        if (n>3) {
            return 0.7
        }
        if (this.edges[n] > 0) { // ascending
            return 2;
        } else if (this.edges[n] <0) { // descending
            return 1.5
        }
    return 1; // level
    }

}

//------------------------------------------------------------------------------------------
//-- PathDebug -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PathDebug extends WorldcoreView {
    constructor(model) {
        super(model);
        const render = this.service("ThreeRenderManager");

        this.redMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        this.greenMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
        this.yellowMaterial = new THREE.LineBasicMaterial( { color: 0xffff00 } );
        this.cyanMaterial = new THREE.LineBasicMaterial( { color: 0x00ffff } );

        // this.draw();
    }



    draw() {
        console.log("Draw path debug");
        const paths = this.modelService("Paths");
        const render = this.service("ThreeRenderManager");
        if (this.group) render.scene.remove(this.group);
        this.group = new THREE.Group();

        paths.nodes.forEach(node => {

            let material = this.greenMaterial;
            if (node.west) {
                if (node.west <0) material = this.yellowMaterial;
                if (node.west >1) material = this.redMaterial;
                let p0 = v3_add(node.xyz,[0,0,0]);
                let p1 = v3_add(node.xyz,[0,1,0]);
                p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
                p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(...p0),
                    new THREE.Vector3(...p1)
                ]);
                const line = new THREE.Line( geometry, material );

                this.group.add(line);
            }

            if (node.south) {
                if (node.south <0) material = this.yellowMaterial;
                if (node.south >1) material = this.redMaterial;
                let p0 = v3_add(node.xyz,[0,0,0]);
                let p1 = v3_add(node.xyz,[1,0,0]);
                p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
                p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(...p0),
                    new THREE.Vector3(...p1)
                ]);
                const line = new THREE.Line( geometry, material );

                this.group.add(line);
            }

            if (node.east) {
                if (node.east <0) material = this.yellowMaterial;
                if (node.east >1) material = this.redMaterial;
                let p0 = v3_add(node.xyz,[1,0,0]);
                let p1 = v3_add(node.xyz,[1,1,0]);
                p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
                p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(...p0),
                    new THREE.Vector3(...p1)
                ]);
                const line = new THREE.Line( geometry, material );

                this.group.add(line);
            }

            if (node.north) {
                if (node.north <0) material = this.yellowMaterial;
                if (node.north >1) material = this.redMaterial;
                let p0 = v3_add(node.xyz,[0,1,0]);
                let p1 = v3_add(node.xyz,[1,1,0]);
                p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
                p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(...p0),
                    new THREE.Vector3(...p1)
                ]);
                const line = new THREE.Line( geometry, material );

                this.group.add(line);
            }

            // if (node.southwest<3) {
            //     let p0 = v3_add(node.xyz,[0.5,0.5,0]);
            //     let p1 = v3_add(node.xyz,[0.25,0.25,0]);
            //     p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
            //     p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

            //     const geometry = new THREE.BufferGeometry().setFromPoints([
            //         new THREE.Vector3(...p0),
            //         new THREE.Vector3(...p1)
            //     ]);
            //     const line = new THREE.Line( geometry, this.yellowMaterial );

            //     this.group.add(line);
            // }

            // if (node.southeast<3) {
            //     let p0 = v3_add(node.xyz,[0.5,0.5,0]);
            //     let p1 = v3_add(node.xyz,[0.75,0.25,0]);
            //     p0 = v3_multiply(p0, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
            //     p1 = v3_multiply(p1, [Constants.scaleX, Constants.scaleY, Constants.scaleZ]);

            //     const geometry = new THREE.BufferGeometry().setFromPoints([
            //         new THREE.Vector3(...p0),
            //         new THREE.Vector3(...p1)
            //     ]);
            //     const line = new THREE.Line( geometry, this.yellowMaterial );

            //     this.group.add(line);
            // }

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

        render.scene.add(this.group);

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