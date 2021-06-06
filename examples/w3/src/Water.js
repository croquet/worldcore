import { Model } from "@croquet/croquet";
import { GetNamedModel } from "../../..";
import { Voxels } from "./Voxels";

class WaterLayer {
    constructor(old) {
            if (old && old.map) this.map = new Map(old.map);
    }

    clear() { delete this.map; }

    forEach(f) {
        if (this.map) this.map.forEach(f);
    }

    set(key, volume) {
        if (volume) {
            if (!this.map) this.map = new Map();
            this.map.set(key, volume);
        } else {
            this.map.delete(key);
            if (this.map.length === 0) delete this.map;
        }
    }

    get(key) {
        if (!this.map) return 0;
        return this.map.get(key) || 0;
    }

    get totalVolume() {
        let sum = 0;
        if (this.map) this.map.forEach( v=> sum+=v );
        return sum;
    }

}

// Need to destroy water on solid fill.

export class Water extends Model{

    static types() {
        return { "W3:WaterLayer": WaterLayer };
    }

    init() {
        super.init();
        this.beWellKnownAs('Water');

        this.clear();

        this.subscribe("voxels", "newLevel", this.onNewLevel);
        this.subscribe("voxels", "changed", this.onChanged);
        this.subscribe("editor", "spawnWater", this.spawnWater);

        this.tick();
    }

    clear() {
        this.layers = [];
        for (let z = 0; z < Voxels.sizeZ; z++) this.layers[z] = new WaterLayer();
    }

    set(key, volume) {
        const xyz = Voxels.unpackKey(key);
        const z = xyz[2];
        this.layers[z].set(key, volume);
    }

    get(key) {
        const xyz = Voxels.unpackKey(key);
        const z = xyz[2];
        return this.layers[z].get(key);
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
            if (this.get(key)) { // Destroy the water it contained
                this.set(key, 0);
                this.publish("water", "changed");
            }
        }
    }

    spawnWater(data) {
        const xyz = data.xyz;
        const volume = data.volume;
        const key = Voxels.packKey(...xyz);
        this.set(key, volume);
        this.publish("water", "changed");
    }

    get totalVolume() {
        let sum = 0;
        this.layers.forEach(layer => sum += layer.totalVolume);
        return sum;
    }

    flowDown(z) {
        const voxels = this.wellKnownModel("modelRoot").voxels;

        const layer = this.layers[z];
        const below = this.layers[z-1];
        const old = new WaterLayer(layer);

        old.forEach( (volume,key) => {
            const xyz = Voxels.unpackKey(key);
            const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
            if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
            const belowKey = Voxels.packKey(...belowXYZ);
            const belowVolume = below.get(belowKey);
            if (belowVolume === 1) return; // Voxel below is full.
            const flow = Math.min(volume, 1-belowVolume);
            below.set(belowKey, belowVolume + flow);
            layer.set(key, volume - flow);
        });

    }

    flowToSide(z) {
        const voxels = this.wellKnownModel("modelRoot").voxels;

        const layer = this.layers[z];
        const old = new WaterLayer(layer);

        old.forEach( (volume,key) => {
            const xyz = Voxels.unpackKey(key);

            // Find side voxels to flow into
            const sides = [];
            let sum = volume;
            for (let a = 0; a < 4; a++) {
                const sideXYZ = Voxels.adjacent(...xyz, a);
                const sideKey = Voxels.packKey(...sideXYZ);
                if (!Voxels.isValid(...sideXYZ) || voxels.get(...sideXYZ)) continue; // Side voxel is solid
                const sideVolume = old.get(sideKey);
                if (sideVolume < volume) { // We should flow into it.
                    sides.push(sideKey);
                    sum += sideVolume;
                }
            }

            if (sides.length===0) return; // All side volumes are higher

            const average = sum/(sides.length+1); // The target volume
            const outFlow = (volume-average);
            const current = layer.get(key) - outFlow;
            layer.set(key, current);

            sides.forEach(sideKey => {
                const sideVolume = old.get(sideKey);
                const inFlow = (average-sideVolume);
                const current = layer.get(sideKey) + inFlow;
                layer.set(sideKey, current);
            });

        });

    }


    tick() {

        for (let z = Voxels.sizeZ-1; z > 0; z--) {
            this.flowDown(z);
            this.flowToSide(z);
            this.flowDown(z);
        }

        console.log(this.totalVolume);
        this.publish("water", "changed");
        this.future(100).tick();
    }

}
Water.register('Water');

// Track side flows to draw waterfalls
// Only draw the top layer
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
