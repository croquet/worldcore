import { ModelService, Constants, v3_normalize } from "@croquet/worldcore";
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

        // this.subscribe("voxels", "load", this.rebuildAll)
        // this.subscribe("voxels", "set", this.rebuildSome)
    }

    get(key) {
        return this.nodes.get(key) || new Node(key);
    }

    rebuildAll() {
        console.log("Building path nodes ...");
        this.surfaces = new Map();

        const voxels = this.service("Voxels");

        const primary = new Set();

        // Build primary set
        voxels.forEachWalkable((x,y,z) => {
            const key = packKey(x,y,z);
            primary.add(key);
        })

        console.log(primary);

        primary.forEach(key => { this.get(key).findEdges(voxels) });

        // const secondary = new Set();

        // // Build primary set
        // voxels.forEach((x,y,z,t)=> {
        //     if (t>=2) return;
        //     const below = Voxels.adjacent(x,y,z,[0,0,1])
        //     const belowType = voxels.get(...below);

        //     const key = packKey(x,y,z);
        //     voxels.forAdjacent(x,y,z, (x,y,z,t,d) => {
        //         if (t<2) return;
        //         this.surfaces.set(key, new Surface(key));
        //         primary.add(key);
        //     })
        // });

        // primary.forEach(key => { this.get(key).findFaces(voxels) });
        // primary.forEach(key => { this.get(key).findRamps(voxels); });
        // primary.forEach(key => { this.get(key).findCaps(voxels,this,secondary) });
        // primary.forEach(key => { this.get(key).findSides(voxels,this,secondary)});
        // secondary.forEach(key => {this.get(key).findShims(voxels);});

        // primary.forEach(key => { this.get(key).cullUnderRamps() });
        // primary.forEach(key => { this.get(key).cullUnderDoubles() });
        // secondary.forEach(key => {this.get(key).cullUnderShims();});
        // secondary.forEach(key => {this.get(key).cullDuplicateSides(this,secondary);});

        // const cull = new Set();
        // primary.forEach(key => { if (this.surfaces.get(key).isEmpty) cull.add(key) });
        // this.clip(cull);

        // this.publish("surfaces", "rebuildAll");
        // console.log("Building surfaces done");

    }



}
Paths.register('Paths');

//------------------------------------------------------------------------------------------
//-- Node -----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Node {
    constructor(key) {
        this.xyz = unpackKey(key);
        this.key = key;
        this.edges = [0,0,0,0];
    }

    get west() { return this.edges[0]; }
    get south() { return this.edges[1]; }
    get east() { return this.edges[2]; }
    get north() { return this.edges[3]; }


    get hasEdge() { return this.edges.some(e => e)}
    get isEmpty() { return !this.hasEdge; }

    findEdges(voxels){
        voxels.forAdjacent(...this.xyz, (x,y,z,t,d) => {
        })
    }

}