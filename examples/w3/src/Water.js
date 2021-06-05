import { Model } from "@croquet/croquet";
import { GetNamedModel } from "../../..";
import { Voxels } from "./Voxels";

export class Water extends Model{
    init() {
        super.init();
        console.log("Starting water!");
        this.beWellKnownAs('Water');

        this.clear();

        this.subscribe("voxels", "newLevel", () => this.onNewLevel());
        this.subscribe("editor", "spawnWater", this.spawnWater);

        this.future(100).tick();
    }

    clear() {
        this.layers = [];
        for (let z = 0; z < Voxels.sizeZ; z++) this.layers[z] = new Map();
    }

    set(key, volume) {
        const xyz = Voxels.unpackKey(key);
        const z = xyz[2];
        if (volume) {
            this.layers[z].set(key, volume);
        } else {
            this.layers[z].delete(key);
        }
    }

    get(key) {
        const xyz = Voxels.unpackKey(key);
        const z = xyz[2];
        return this.layers[z].get(key) || 0;
    }

    onNewLevel() {
        this.clear()
        this.publish("water", "changed");
    }

    spawnWater(data) {
        const xyz = data.xyz;
        const volume = data.volume;
        const key = Voxels.packKey(...xyz);
        this.set(key, volume);
        this.publish("water", "changed");
    }

    get totalVolume() {
        let v = 0;
        this.layers.forEach(layer => {
            layer.forEach((volume, key) => {
                v+=volume;
            })
        });
        return v;
    }

    tick() {
        const voxels = this.wellKnownModel("modelRoot").voxels;

        this.layers.forEach(layer => {

            // Flow into empty voxels below.

            new Map(layer).forEach((volume, key) => {
                const xyz = Voxels.unpackKey(key);
                const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
                if (!Voxels.isValid(...belowXYZ) || voxels.get(...belowXYZ)) return; // Voxel below is solid.
                const belowKey = Voxels.packKey(...belowXYZ);
                const belowVolume = this.get(belowKey);
                if (belowVolume === 1) return; // Voxel below is full.
                const flow = Math.min(volume, 1-belowVolume);
                this.set(belowKey, belowVolume + flow);
                this.set(key, volume - flow);
            })

            // Calculate flow to the side.

            const old = new Map(layer);

            old.forEach((volume, key) => {
                const xyz = Voxels.unpackKey(key);
                let sides = [];
                let sum = volume;

                for (let a = 0; a < 4; a++) {
                    const sideXYZ = Voxels.adjacent(...xyz, a);
                    const sideKey = Voxels.packKey(...sideXYZ);
                    if (!Voxels.isValid(...sideXYZ) || voxels.get(...sideXYZ)) continue; // Side voxel is solid

                    const sideVolume = old.get(sideKey) || 0;
                    if (sideVolume < volume) { // We should flow into it.
                        sides.push(sideKey);
                        sum += sideVolume;
                    }
                }

                if (sides.length===0) return; // All side volumes are higher

                const average = sum/(sides.length+1); // The target volume
                const outFlow = (volume-average) * 1;
                const current = this.get(key) - outFlow;
                this.set(key, current);

                sides.forEach(sideKey => {
                    const sideVolume = old.get(sideKey) || 0;
                    const inFlow = (average-sideVolume) * 1;
                    const current = this.get(sideKey) + inFlow;
                    this.set(sideKey, current);
                });

            })

        });

        console.log(this.totalVolume);
        this.publish("water", "changed");
        this.future(100).tick();
    }

    // tick() {
    //     const voxels = this.wellKnownModel("modelRoot").voxels;
    //     const totalFlow = new Map();
    //     this.volume.forEach((volume,key) => {
    //         const xyz = Voxels.unpackKey(key);
    //         const flow = [0,0,0,0];
    //         for (let a = 0; a < 4; a++) {
    //             const adjacent = Voxels.adjacent(...xyz, a);
    //             if (Voxels.isValid(...adjacent) && !voxels.get(...adjacent)) {
    //                 const sideKey = Voxels.packKey(...adjacent);
    //                 const sideVolume = this.volume.get(sideKey) || 0;
    //                 flow[a] = Math.max(0,volume - sideVolume);
    //                 if (flow[a] < 0.01) flow[a] = 0; // Not really great -- need way to stabilize;
    //             }
    //         }
    //         totalFlow.set(key, flow)
    //     })

    //     totalFlow.forEach((flow, key) => {
    //         const xyz = Voxels.unpackKey(key);
    //         const total = (flow[0] + flow[1] + flow[2] + flow[3]) / 10;
    //         let volume = this.volume.get(key) || 0
    //         volume -= total;
    //         this.volume.set(key,volume);
    //         for (let a = 0; a < 4; a++) {
    //             const adjacent = Voxels.adjacent(...xyz, a);
    //             if (Voxels.isValid(...adjacent) && !voxels.get(...adjacent)) {
    //                 const sideKey = Voxels.packKey(...adjacent);
    //                 let sideVolume = this.volume.get(sideKey) || 0;
    //                 sideVolume += flow[a] / 10;

    //                 if (sideVolume) {
    //                     this.volume.set(sideKey, sideVolume);
    //                 }

    //             }

    //         }
    //     })

    //     // console.log("tick!");
    //     this.publish("water", "changed");
    //     this.future(100).tick();
    // }
}
Water.register('Water');
