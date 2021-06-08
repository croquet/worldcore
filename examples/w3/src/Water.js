import { Model } from "@croquet/croquet";
import { Voxels } from "./Voxels";

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
                    this.outFlow.get(sideKey)[Opposite(a)] = -flow[a];
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


export class Water extends Model{

    init() {
        super.init();
        console.log("Starting water!!!!!");
        this.beWellKnownAs('Water');

        this.clear();

        this.subscribe("voxels", "newLevel", this.onNewLevel);
        this.subscribe("voxels", "changed", this.onChanged);
        this.subscribe("editor", "spawnWater", this.spawnWater);

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

    spawnWater(data) {
        const xyz = data.xyz;
        const volume = data.volume;
        const key = Voxels.packKey(...xyz);
        this.setVolume(key, volume);
        this.publish("water", "changed");
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

        console.log(this.totalVolume);
        this.publish("water", "changed");
        this.future(100).tick();
    }

}
Water.register('Water');

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

// Track side flows to draw waterfalls
// Only draw the top layer
// Don't display water that is hanging off an edge
// Don't draw hidden upper layers
// Don't rebuild mesh every tick
// Two-sided waterfalls for streams through holes
// Side flows displaced for ramps etc.
// Track active voxels so deep or still water doesn't need testing
// Evaporation
// Sources & sinks
// Draw sides of water voxels on edge
// Water affects pathing
// Characters can drown
