import { Model } from "@croquet/croquet";
import { GetNamedModel } from "../../..";
import { Voxels } from "./Voxels";

export class Water extends Model{
    init() {
        super.init();
        console.log("Starting water!");
        this.beWellKnownAs('Water');
        this.volume = new Map();

        this.subscribe("voxels", "newLevel", () => this.onNewLevel());
        this.subscribe("editor", "spawnWater", this.spawnWater);

        this.tick();
    }

    onNewLevel() {
        this.volume = new Map();
        this.publish("water", "changed");
    }

    spawnWater(data) {
        const xyz = data.xyz;
        const volume = data.volume;
        const key = Voxels.packKey(...xyz);
        this.volume.set(key,volume);
        this.publish("water", "changed");
    }

    tick() {
        const voxels = this.wellKnownModel("modelRoot").voxels;
        const totalFlow = new Map();
        this.volume.forEach((volume,key) => {
            const xyz = Voxels.unpackKey(key);
            const flow = [0,0,0,0];
            for (let a = 0; a < 4; a++) {
                const adjacent = Voxels.adjacent(...xyz, a);
                if (Voxels.isValid(...adjacent) && !voxels.get(...adjacent)) {
                    const sideKey = Voxels.packKey(...adjacent);
                    const sideVolume = this.volume.get(sideKey) || 0;
                    flow[a] = Math.max(0,volume - sideVolume);
                    if (flow[a] < 0.01) flow[a] = 0; // Not really great -- need way to stabilize;
                }
            }
            totalFlow.set(key, flow)
        })

        totalFlow.forEach((flow, key) => {
            const xyz = Voxels.unpackKey(key);
            const total = (flow[0] + flow[1] + flow[2] + flow[3]) / 10;
            let volume = this.volume.get(key) || 0
            volume -= total;
            this.volume.set(key,volume);
            for (let a = 0; a < 4; a++) {
                const adjacent = Voxels.adjacent(...xyz, a);
                if (Voxels.isValid(...adjacent) && !voxels.get(...adjacent)) {
                    const sideKey = Voxels.packKey(...adjacent);
                    let sideVolume = this.volume.get(sideKey) || 0;
                    sideVolume += flow[a] / 10;

                    if (sideVolume) {
                        this.volume.set(sideKey, sideVolume);
                    }

                }

            }
        })

        // console.log("tick!");
        this.publish("water", "changed");
        this.future(100).tick();
    }
}
Water.register('Water');
