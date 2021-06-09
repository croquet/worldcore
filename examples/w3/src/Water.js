import { Model } from "@croquet/croquet";
import { Actor, Pawn, mix, PM_Spatial, PM_InstancedVisible, PM_Visible, CachedObject, UnitCube, Material, InstancedDrawCall, DrawCall, GetNamedView, GetNamedModel } from "@croquet/worldcore";
import { AM_VoxelSmoothed } from "./Components";
import { Voxels } from "./Voxels";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
//-- Water ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Water extends Model{

    init() {
        super.init();
        console.log("Starting water!!!!!");
        this.beWellKnownAs('Water');

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
            this.layers[z].fall(this.layers[z-1]);
            this.layers[z].flow();
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

class WaterLayer extends Model {

    init() {
        super.init();

        this.volume = new Map();    // How much water is currently in the voxel
        this.inFlow = new Map();    // How much water flowed into each voxel from the sides on the last tick (4-array)
        this.outFlow = new Map();   // How much water flowed out of each voxel to the sides on the last tick (4-array)
        this.inFall = new Map();    // How much water fell into each voxel from above on the last tick
        this.outFall = new Map();   // How much water fell out of each voxel on the last tick
    }

    clear() {
        this.volume.clear();
        this.inFlow.clear();
        this.outFlow.clear();
        this.inFall.clear();
        this.outFall.clear();
    }

    setVolume(key, volume) {
        if (volume) {
            this.volume.set(key, volume);
        } else {
            this.volume.delete(key);
        }
    }

    getVolume(key) { return this.volume.get(key) || 0; }
    getInFlow(key) { return this.inFlow.get(key) || [0,0,0,0]; }
    getOutFlow(key) { return this.outFlow.get(key) || [0,0,0,0]; }
    getInFall(key) { return this.inFall.get(key) || 0; }
    getOutFall(key) { return this.outFall.get(key) || 0; }

    get totalVolume() {
        let sum = 0;
        this.volume.forEach( v=> sum += v );
        return sum;
    }

    fall(below) {
        const voxels = this.wellKnownModel("modelRoot").voxels;

        below.inFall.clear();
        this.outFall.clear();

        this.volume.forEach( (volume,key) => {
            const xyz = Voxels.unpackKey(key);
            const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
            if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
            const belowKey = Voxels.packKey(...belowXYZ);
            const belowVolume = below.getVolume(belowKey);
            if (belowVolume === 1) return; // Voxel below is full.
            const flow = Math.min(volume, 1-belowVolume);

            this.outFall.set(key, -flow);
            below.inFall.set(belowKey, flow);
        });

        below.inFall.forEach((flow, key) => below.setVolume(key, below.getVolume(key) + flow) );
        this.outFall.forEach((flow, key) => this.setVolume(key, this.getVolume(key) + flow) );

    }

    flow(){
        const voxels = this.wellKnownModel("modelRoot").voxels;

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
            this.setVolume(key, volume + sum);
        })

        // Apply outflows

        this.outFlow.forEach( (flow, key) => {
            let volume = this.getVolume(key);
            flow.forEach( f=> volume += f);
            this.setVolume(key, volume);
        })
    }

}
WaterLayer.register('WaterLayer');

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
// Only draw the top layer
// Don't display water that is hanging off an edge
// Don't draw hidden upper layers
// Don't rebuild mesh every tick
// Two-sided waterfalls for streams through holes
// Side flows displaced for ramps etc.
// Track active voxels so deep or still water doesn't need testing
// Evaporation
// Draw sides of water voxels on edge
// Water affects pathing
// Characters can drown
