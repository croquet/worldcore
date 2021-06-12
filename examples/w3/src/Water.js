import { Model } from "@croquet/croquet";
import { Actor, Pawn, mix, PM_Dynamic, PM_Spatial, PM_InstancedVisible, PM_Visible, CachedObject, UnitCube, DrawCall, GetNamedView,
    GetNamedModel, Triangles, Material, v3_add, m4_identity } from "@croquet/worldcore";
import { AM_VoxelSmoothed } from "./Components";
import { Voxels } from "./Voxels";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
//-- Water ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// let voxels;

export class Water extends Model{

    init() {
        super.init();
        console.log("Starting water!!!!!");
        this.beWellKnownAs('Water');

        // voxels = this.wellKnownModel("Voxels");

        this.clear();

        this.subscribe("voxels", "newLevel", this.onNewLevel);
        this.subscribe("voxels", "changed", this.onChanged);
        this.subscribe("editor", "spawnWater", this.onSpawnWater);
        this.subscribe("editor", "spawnWaterSource", this.onSpawnWaterSource);

        this.tick();
    }

    clear() {
        if (this.layers) this.layers.forEach( layer => layer.destroy());
        this.layers = [];
        for (let z = 0; z < Voxels.sizeZ; z++) this.layers[z] = WaterLayer.create();
    }

    setVolume(key, volume) {
        const xyz = Voxels.unpackKey(key);
        const z = xyz[2];
        this.layers[z].setVolume(key, volume);
    }

    getVolume(key) {
        const xyz = Voxels.unpackKey(key);
        const z = xyz[2];
        return this.layers[z].getVolume(key);
    }

    onNewLevel() {
        this.clear()
        this.publish("water", "changed");
    }

    onChanged(data) {
        const type = data.type;
        const old = data.old;
        if (type && !old) { // an empty voxel has been filled.
            const key = Voxels.packKey(...data.xyz);
            if (this.getVolume(key)) { // Destroy the water it contained
                this.setVolume(key, 0);
                this.publish("water", "changed");
            }
        }
    }

    onSpawnWater(data) {
        const xyz = data.xyz;
        const volume = data.volume;
        const key = Voxels.packKey(...xyz);
        this.setVolume(key, volume);
        this.publish("water", "changed");
    }

    onSpawnWaterSource(data) {
        console.log("Spawn water source");
        const xyz = data.xyz;
        const flow = data.flow;
        WaterSourceActor.create({xyz, fraction: [0.5, 0.5, 0.5], flow});
    }

    get totalVolume() {
        let sum = 0;
        this.layers.forEach(layer => sum += layer.totalVolume);
        return sum;
    }

    tick() {
        for (let z = Voxels.sizeZ-1; z > 0; z--) {
            // this.layers[z].fall(this.layers[z-1]);
            // this.layers[z].flow(this.layers[z-1]);
            this.layers[z].flow2(this.layers[z-1]);

        }

        // console.log(this.totalVolume);
        this.publish("water", "changed");
        this.future(100).tick();
    }

}
Water.register('Water');

//------------------------------------------------------------------------------------------
//-- WaterLayer ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WaterLayer extends Actor {

    get pawn() {return WaterLayerPawn}

    init(options) {
        super.init(options);

        this.volume = new Map();    // How much water is currently in the voxel
        this.inFlow = new Map();    // How much water flowed into each voxel from the sides on the last tick (4-array)
        this.outFlow = new Map();   // How much water flowed out of each voxel to the sides on the last tick (4-array)
        this.inFall = new Map();    // How much water fell into each voxel from above on the last tick
        this.outFall = new Map();   // How much water fell out of each voxel on the last tick
        this.cascade = new Map();
        this.cliff = new Map();

    }

    clear() {
        this.volume.clear();
        this.inFlow.clear();
        this.outFlow.clear();
        this.inFall.clear();
        this.outFall.clear();
        this.cascade.clear();
        this.cliff.clear();
    }

    setVolume(key, volume) {
        if (volume) {
            this.volume.set(key, volume);
            this.say("addKey", key);
        } else {
            this.volume.delete(key);
            this.say("deleteKey", key);
        }
    }

    getVolume(key) { return this.volume.get(key) || 0; }
    getFull(key) { return this.full.get(key) || false; }
    getInFlow(key) { return this.inFlow.get(key) || [0,0,0,0]; }
    getOutFlow(key) { return this.outFlow.get(key) || [0,0,0,0]; }
    getInFall(key) { return this.inFall.get(key) || 0; }
    getOutFall(key) { return this.outFall.get(key) || 0; }
    getCascade(key) { return this.cascade.get(key) || [0,0,0,0]; }
    getCliff(key) { return this.cliff.get(key) || [1,1,1,1]; }

    get totalVolume() {
        let sum = 0;
        this.volume.forEach( v=> sum += v );
        return sum;
    }

    flow2(below) {

        const voxels = this.wellKnownModel("modelRoot").voxels;

        // -- Fall --

        below.inFall.clear();
        this.outFall.clear();

        this.volume.forEach( (volume,key) => {
            const xyz = Voxels.unpackKey(key);
            const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
            if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
            const belowKey = Voxels.packKey(...belowXYZ);
            const belowVolume = below.getVolume(belowKey);
            if (belowVolume === 1) return // Voxel below is full.

            const flow = Math.min(volume, 1-belowVolume);

            this.outFall.set(key, -flow);
            below.inFall.set(belowKey, flow);

            this.setVolume(key, volume-flow);
            below.setVolume(belowKey, belowVolume+flow);
        });

        // below.inFall.forEach((flow, key) => below.setVolume(key, below.getVolume(key) + flow));
        // this.outFall.forEach((flow, key) => this.setVolume(key, this.getVolume(key) + flow));

        // -- Flow --

        this.inFlow.clear();
        this.outFlow.clear();

        // Find side voxels to flow into

        this.volume.forEach( (volume, key) => {

            const xyz = Voxels.unpackKey(key);

            const sides = [];
            let sum = volume;

            for (let a = 0; a < 4; a++) {
                const sideXYZ = Voxels.adjacent(...xyz, a);
                const sideKey = Voxels.packKey(...sideXYZ);
                if (!Voxels.isValid(...sideXYZ) || voxels.get(...sideXYZ)) continue; // Side voxel is solid
                const sideVolume = this.getVolume(sideKey);
                if (sideVolume < volume) { // We should flow into it.
                    sides.push(a);
                    sum += sideVolume;
                }
            }

            if (sides.length===0) return; // All side volumes are higher or solid -- no flow!

            const average = sum/(sides.length+1); // The target volume

            this.outFlow.set(key, [0,0,0,0]);
            sides.forEach(a => {
                const sideXYZ = Voxels.adjacent(...xyz, a);
                const sideKey = Voxels.packKey(...sideXYZ);
                const flow = (average - this.getVolume(sideKey));
                if (!this.inFlow.has(sideKey)) this.inFlow.set(sideKey, [0,0,0,0]);
                this.inFlow.get(sideKey)[Opposite(a)] = flow;
                this.outFlow.get(key)[a] = -flow;
            });
        })

        // Apply inflows

        this.inFlow.forEach( (flow, key) => {
            const volume = this.getVolume(key);
            const xyz = Voxels.unpackKey(key);
            let sum = 0;
            flow.forEach( f=> sum += f);
            if ((volume + sum) > 1 ) { // Flow + volume is too big!
                flow = flow.map( f => f/(sum+volume)); // Scale the flow back to just fill the voxel
                this.inFlow.set(key, flow);
                sum = 1-volume;
                for (let a = 0; a < 4; a++) {   // Reduce the adjacent outflows to match
                    const sideXYZ = Voxels.adjacent(...xyz, a);
                    const sideKey = Voxels.packKey(...sideXYZ);
                    const f = this.outFlow.get(sideKey);
                    if (f) f[Opposite(a)] = -flow[a];
                }

            }
            let v = volume + sum;
            this.setVolume(key, v);
        })

        // Apply outflows

        this.outFlow.forEach( (flow, key) => {
            let volume = this.getVolume(key);
            flow.forEach( f=> volume += f);
            this.setVolume(key, volume);
        })

        // -- Fall agin --

        this.volume.forEach( (volume,key) => {

            if (volume < 0.001) {
                this.setVolume(key, 0);
                return;
            }

            const xyz = Voxels.unpackKey(key);
            const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
            if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
            const belowKey = Voxels.packKey(...belowXYZ);
            const belowVolume = below.getVolume(belowKey);
            if (belowVolume === 1) return // Voxel below is full.

            const flow = Math.min(volume, 1-belowVolume);

            const outFall = this.getOutFall(key);

            this.outFall.set(key, outFall - flow);

            const inFall = below.getInFall(belowKey);
            below.inFall.set(belowKey, inFall+flow);

            this.setVolume(key, volume-flow);
            below.setVolume(belowKey, belowVolume+flow);

        });

        //-- Find cliffs

        this.cliff.clear();

        this.volume.forEach( (volume, key) => {
            const xyz = Voxels.unpackKey(key);
            const cliff = [1,1,1,1];
            for (let a = 0; a < 4; a++ ) {
                const sideXYZ = Voxels.adjacent(...xyz, a);
                const sideKey = Voxels.packKey(...sideXYZ);
                // const xxx = this.getOutFall(sideKey);

                if (this.getOutFall(sideKey)) {
                    // console.log(xxx);
                    cliff[a] = 0;
                }


            }
            // console.log(cliff);
            this.cliff.set(key, cliff);
        });

        //-- Detect cascades to draw waterfalls
        // Bug here == cascades should always connect to cliffs.

        // below.cascade.clear();

        // this.outFall.forEach((flow, key) => {
        //     const xyz = Voxels.unpackKey(key);
        //     const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
        //     if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
        //     const belowKey = Voxels.packKey(...belowXYZ);
        //     const inflow = this.getInFlow(key);
        //     const cascade = [...this.getCascade(key)];
        //     for(let a = 0; a < 4; a++) {
        //         //  cascade[a] = cascade[a] || inflow[a];
        //         cascade[a] = Math.max(cascade[a],inflow[a]);
        //     }
        //     below.cascade.set(belowKey, cascade);
        // })

        this.say("rebuild");

    }

    // fall(below) {
    //     const voxels = this.wellKnownModel("modelRoot").voxels;

    //     below.inFall.clear();
    //     below.cascade.clear();
    //     this.outFall.clear();

    //     this.volume.forEach( (volume,key) => {
    //         const xyz = Voxels.unpackKey(key);
    //         const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
    //         if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
    //         const belowKey = Voxels.packKey(...belowXYZ);
    //         const belowVolume = below.getVolume(belowKey);
    //         if (belowVolume === 1) return // Voxel below is full.

    //         const flow = Math.min(volume, 1-belowVolume);

    //         this.outFall.set(key, -flow);
    //         below.inFall.set(belowKey, flow);

    //         const inflow = this.getInFlow(key);
    //         const cascade = [...this.getCascade(key)];
    //         for(let a = 0; a < 4; a++) {
    //             //  cascade[a] = cascade[a] || inflow[a];
    //             cascade[a] = Math.max(cascade[a],inflow[a]);
    //         }

    //         below.cascade.set(belowKey, cascade);
    //     });

    //     below.inFall.forEach((flow, key) => below.setVolume(key, below.getVolume(key) + flow));
    //     this.outFall.forEach((flow, key) => this.setVolume(key, this.getVolume(key) + flow)); // If there is still volume after the bottom is filled, this causes flicker.

    // }

    // Combine fall and flow and bail until next tick if the fall has some left over after filling the below voxel. This prevents the spreading of a choked cascade.

    // flow(below){
    //     const voxels = this.wellKnownModel("modelRoot").voxels;

    //     this.inFlow.clear();
    //     this.outFlow.clear();

    //     // Find side voxels to flow into

    //     this.volume.forEach( (volume, key) => {

    //         const xyz = Voxels.unpackKey(key);

    //         const sides = [];
    //         let sum = volume;

    //         for (let a = 0; a < 4; a++) {
    //             const sideXYZ = Voxels.adjacent(...xyz, a);
    //             const sideKey = Voxels.packKey(...sideXYZ);
    //             if (!Voxels.isValid(...sideXYZ) || voxels.get(...sideXYZ)) continue; // Side voxel is solid
    //             const sideVolume = this.getVolume(sideKey);
    //             if (sideVolume < volume) { // We should flow into it.
    //                 sides.push(a);
    //                 sum += sideVolume;
    //             }
    //         }

    //         if (sides.length===0) return; // All side volumes are higher or solid -- no flow!

    //         const average = sum/(sides.length+1); // The target volume

    //         this.outFlow.set(key, [0,0,0,0]);
    //         sides.forEach(a => {
    //             const sideXYZ = Voxels.adjacent(...xyz, a);
    //             const sideKey = Voxels.packKey(...sideXYZ);
    //             const flow = (average - this.getVolume(sideKey));
    //             if (!this.inFlow.has(sideKey)) this.inFlow.set(sideKey, [0,0,0,0]);
    //             this.inFlow.get(sideKey)[Opposite(a)] = flow;
    //             this.outFlow.get(key)[a] = -flow;
    //         });
    //     })

    //     // Apply inflows

    //     this.inFlow.forEach( (flow, key) => {
    //         const volume = this.getVolume(key);
    //         const xyz = Voxels.unpackKey(key);
    //         let sum = 0;
    //         flow.forEach( f=> sum += f);
    //         if ((volume + sum) > 1 ) { // Flow + volume is too big!
    //             flow = flow.map( f => f/(sum+volume)); // Scale the flow back to just fill the voxel
    //             this.inFlow.set(key, flow);
    //             sum = 1-volume;
    //             for (let a = 0; a < 4; a++) {   // Reduce the adjacent outflows to match
    //                 const sideXYZ = Voxels.adjacent(...xyz, a);
    //                 const sideKey = Voxels.packKey(...sideXYZ);
    //                 const f = this.outFlow.get(sideKey);
    //                 if (f) f[Opposite(a)] = -flow[a];
    //             }

    //         }
    //         let v = volume + sum;
    //         // if (v < 0.01) v = 0; // Test appropriate minimum
    //         this.setVolume(key, v);
    //     })

    //     // Apply outflows

    //     this.outFlow.forEach( (flow, key) => {
    //         let volume = this.getVolume(key);
    //         flow.forEach( f=> volume += f);
    //         // if (volume < 0.01) volume = 0; // Test appropriate minimum
    //         this.setVolume(key, volume);
    //     })


    //     this.volume.forEach( (volume, key) => {
    //         const xyz = Voxels.unpackKey(key);
    //         const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
    //         if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
    //         const belowKey = Voxels.packKey(...belowXYZ);
    //         const belowVolume = below.getVolume(belowKey);
    //         if (belowVolume === 1) return // Voxel below is full.
    //     });

    //     this.say("rebuild");
    // }

}
WaterLayer.register('WaterLayer');

//------------------------------------------------------------------------------------------
//-- WaterLayerPawn ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const cornerSums = Array.from(Array(Voxels.sizeX+1), () => new Array(Voxels.sizeY+1));
const cornerCounts = Array.from(Array(Voxels.sizeX+1), () => new Array(Voxels.sizeY+1));

function clearCornerGrid() {
    cornerSums.forEach( c => c.fill(0) );
    cornerCounts.forEach( c => c.fill(0) );
}

// We shouldn't use the averaged corner volume in cases where the corner consists of two
// water voxels and two solid voxels diagnonally separated. These functions check for
// that case.

function neIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x+1,y,z) || !Voxels.isValid(x,y+1,z)) return true;
    if (voxels.get(x+1,y,z) && voxels.get(x,y+1,z)) return false;
    return true;
}

function nwIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x-1,y,z) || !Voxels.isValid(x,y+1,z)) return true;
    if (voxels.get(x-1,y,z) && voxels.get(x,y+1,z)) return false;
    return true;
}

function swIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x-1,y,z) || !Voxels.isValid(x,y-1,z)) return true;
    if (voxels.get(x-1,y,z) && voxels.get(x,y-1,z)) return false;
    return true;
}

function seIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x+1,y,z) || !Voxels.isValid(x,y-1,z)) return true;
    if (voxels.get(x+1,y,z) && voxels.get(x,y-1,z)) return false;
    return true;
}

let voxels;

class WaterLayerPawn extends mix(Pawn).with(PM_Dynamic, PM_Visible) {

    constructor(...args) {
        super(...args);

        voxels = this.wellKnownModel("Voxels");
        this.volume = new Map(this.actor.volume);
        console.log("starting pawn");
        this.tug = 0.01;
        // this.tug = 1;

        this.mesh = new Triangles();
        const material = CachedObject("waterMaterial", this.buildMaterial);
        const drawCall = new DrawCall(this.mesh, material);
        this.setDrawCall(drawCall);
        this.buildMesh();
        this.listen("addKey", this.addKey);
        this.listen("deleteKey", this.deleteKey);
        this.listen("rebuild", this.rebuild);
    }

    addKey(key) {
        if (this.volume.has(key)) return;
        this.volume.set(key, 0);
    }

    deleteKey(key) {
        this.volume.delete(key);
    }

    update(time, delta) {
        super.update(time, delta);
        let tug = this.tug;
        if (delta) tug = Math.min(1, tug * delta / 15);

        this.volume.forEach( (volume,key) => {
            const v = volume + (this.actor.getVolume(key) - volume) * tug;
            this.volume.set(key, v);
        });
    }

    rebuild() {
        this.buildMesh();
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'translucent';
        material.zOffset = 0;
        return material;
    }

    buildMesh() {
        clearCornerGrid();

        this.mesh.clear();
        this.volume.forEach( (v,key) =>  {
            // if (this.actor.hide.has(key)) return; // hidden voxels are edge shoulders and adjacent voxels shuould taper to zero at corners.
            const xyz = Voxels.unpackKey(key);
            const x = xyz[0];
            const y = xyz[1];

            cornerSums[x][y] += v;
            cornerSums[x+1][y] += v;
            cornerSums[x][y+1] += v;
            cornerSums[x+1][y+1] += v;

            cornerCounts[x][y]++;
            cornerCounts[x+1][y]++;
            cornerCounts[x][y+1]++;
            cornerCounts[x+1][y+1]++;
        });

        const c = [0, 0, 0.8, 0.2];
        // const w = [0.2, 0.2, 0.2, 0.1];

        this.volume.forEach( (v,key) =>  {
            // if (v < 0.05) return;

            const xyz = Voxels.unpackKey(key);
            const x = xyz[0];
            const y = xyz[1];

            let sw = v, se = v, ne = v, nw = v;

            if (swIsValid(xyz)) sw = cornerSums[x][y] / cornerCounts[x][y];
            if (seIsValid(xyz)) se = cornerSums[x+1][y] / cornerCounts[x+1][y];
            if (neIsValid(xyz)) ne = cornerSums[x+1][y+1] / cornerCounts[x+1][y+1];
            if (nwIsValid(xyz)) nw = cornerSums[x][y+1] / cornerCounts[x][y+1];

            const cliff = this.actor.getCliff(key);


            sw = sw * cliff[2] * cliff[3];
            se = se * cliff[1] * cliff[2];
            ne = ne * cliff[0] * cliff[1];
            nw = nw * cliff[3] * cliff[0];

            const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [0.5,0.5,v]));
            const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,sw]));
            const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,se]));
            const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,ne]));
            const v4 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,nw]));

            const c0 = ScaleColor(c, v);
            const c1 = ScaleColor(c, sw);
            const c2 = ScaleColor(c, se);
            const c3 = ScaleColor(c, ne);
            const c4 = ScaleColor(c, nw);

            this.mesh.addFace([v0, v1, v2, v3, v4, v1], [c0, c1, c2, c3, c4, c1]);
        });

        this.actor.cascade.forEach((cascade, key) => {
            const xyz = Voxels.unpackKey(key);

            const x = xyz[0];
            const y = xyz[1];

            const z = this.volume.get(key) || 0;
            let sw = z, se = z, ne = z, nw = z;

            // if (swIsValid(xyz)) sw = cornerSums[x][y] / cornerCounts[x][y];
            // if (seIsValid(xyz)) se = cornerSums[x+1][y] / cornerCounts[x+1][y];
            // if (neIsValid(xyz)) ne = cornerSums[x+1][y+1] / cornerCounts[x+1][y+1];
            // if (nwIsValid(xyz)) nw = cornerSums[x][y+1] / cornerCounts[x][y+1];

            const cc = CascadeColor(c, z);
            // const cc = c;

            if (cascade[0] > 0.01) {

                const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,0]));
                const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,0]));
                const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,1]));
                const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,1]));
                this.mesh.addFace([v0, v1, v2, v3], [cc, cc, cc, cc]);
                this.mesh.addFace([v3, v2, v1, v0], [cc, cc, cc, cc]);
            }

            if (cascade[1] > 0.0) {
                const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,0]));
                const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,0]));
                const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,0]));
                const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,0]));
                this.mesh.addFace([v0, v1, v2, v3], [cc, cc, cc, cc]);
                this.mesh.addFace([v3, v2, v1, v0], [cc, cc, cc, cc]);
            }

            if (cascade[2]> 0.0) {
                const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,0]));
                const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,0]));
                const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,0]));
                const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,0]));
                this.mesh.addFace([v0, v1, v2, v3], [cc, cc, cc, cc]);
                this.mesh.addFace([v3, v2, v1, v0], [cc, cc, cc, cc]);
            }

            if (cascade[3]> 0.0) {
                const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,z]));
                const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,z]));
                const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,1]));
                const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,1]));
                this.mesh.addFace([v0, v1, v2, v3], [cc, cc, cc, cc]);
                this.mesh.addFace([v3, v2, v1, v0], [cc, cc, cc, cc]);
            }


        });

        this.mesh.load();
    }

}

function ScaleColor(c, v) {
    if (v > 0.2) return c;
    const scale = v / 0.2;
    // const scale = 1;
    return c.map(x => x * scale);
}

function CascadeColor(c, v) {
    if (v > 0.5) return c;
    // const scale = v / 0.5;
    const scale = 1;
    return c.map(x => x * scale);
}

//------------------------------------------------------------------------------------------
//-- WaterSource ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WaterSourceActor extends mix(Actor).with(AM_VoxelSmoothed) {
    get pawn() {return WaterSourcePawn}
    get flow() { return this._flow || 0} // Voxels / second

    init(options) {
        super.init(options)
        const firstDelta = Math.random() * 50;
        this.future(firstDelta).tick(firstDelta);
    }

    tick(delta) {
        const voxels = this.wellKnownModel("Voxels");
        if (voxels.get(...this.xyz)) {
            this.destroy();
            return;
        }
        const water = this.wellKnownModel("Water");
        const volume = Math.max(0, Math.min(1, water.getVolume(this.key) + delta * this.flow / 1000));
        water.setVolume(this.key, volume);
        this.future(50).tick(50);
    }

}
WaterSourceActor.register('WaterSourceActor')

class WaterSourcePawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(this.buildDraw());
    }

    buildDraw() {
        const mesh = this.buildMesh();
        const material = this.buildMaterial();
        const draw = new DrawCall(mesh, material);
        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);
        return draw;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'opaque';
        material.texture.loadFromURL(paper);
        return material;
    }

    buildMesh() {
        const mesh = UnitCube();
        if (this.actor.flow > 0) {
            mesh.setColor([0, 1, 0, 1])
        } else {
            mesh.setColor([1, 0, 0, 1])
        }
        mesh.load();
        mesh.clear();
        return mesh;
    }

}

//------------------------------------------------------------------------------------------
//-- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Given a voxel direction, returns the opposite.
function Opposite(side) {
    switch (side) {
        case 0: return 2;
        case 1: return 3;
        case 2: return 0;
        case 3: return 1;
        default: return 0;
    }
}

// Waterfalls
// Don't draw hidden upper layers
// Don't rebuild mesh every tick
// Two-sided waterfalls for streams through holes
// Side flows displaced for ramps etc.
// Track active voxels so deep or still water doesn't need testing
// Evaporation
// Draw sides of water voxels on edge
// Water affects pathing
// Characters can drown
