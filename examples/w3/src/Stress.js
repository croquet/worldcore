import { Model } from "@croquet/croquet";
import { Voxels } from "./Voxels";

const max = 10000;

export class StressManager extends Model{
    init() {
        super.init();
        this.beWellKnownAs('StressManager');
        this.voxels = this.wellKnownModel("Voxels");
        this.stress = new Map();
        this.subscribe("voxels", "newLevel", this.onNewLevel);
        this.subscribe("voxels", "changed", this.onNewLevel);
    }

    onNewLevel() {
        console.log("Rebuilding stress!");
        const voxels = this.wellKnownModel("Voxels");
        const supported = new Set();
        const unsupported = new Set();
        const minimum = new Set();
        voxels.forEach( (t,x,y,z) => {
            if (!t) return;
            const key = Voxels.packKey(x,y,z);
            if (voxels.get(...Voxels.adjacent(x,y,z,Voxels.below))) {
                supported.add(key);
            } else {
                unsupported.add(key);
            }
        })
        unsupported.forEach(key => {
            const xyz = Voxels.unpackKey(key);
            const northKey = Voxels.packKey(...Voxels.adjacent(...xyz, Voxels.north));
            if (supported.has(northKey)) {minimum.add(key); return};
            const eastKey = Voxels.packKey(...Voxels.adjacent(...xyz, Voxels.east));
            if (supported.has(eastKey)) {minimum.add(key); return};
            const southKey = Voxels.packKey(...Voxels.adjacent(...xyz, Voxels.south));
            if (supported.has(southKey)) {minimum.add(key); return};
            const westKey = Voxels.packKey(...Voxels.adjacent(...xyz, Voxels.west));
            if (supported.has(westKey)) {minimum.add(key); return};
        })
        console.log(supported);
        console.log(unsupported);
        console.log(minimum);

        // x = 1
        // Loop through set
        // If unsupported has key -> set the stress of key to x
        // remove key from unsupported
        // add adjacent keys to new set
        // x++

    }

    set(x, y, z, stress) {
        if (!Voxels.isValid(x,y,z) || !this.voxels.get(x,y,z)) return;
        key = Voxels.packKey(x,y,z);
        if (stress) {
            this.stress.set(key, stress)
        } else {
            this.stress.delete(key);
        }
    }

    get(x, y, z) {
        if (!Voxels.isValid(x,y,z) || !this.voxels.get(x,y,z)) return max;
        const key = Voxels.packKey(x,y,z);
        const s = this.stress.get(key);
        if (s) return s;
        return 0;
    }
}
StressManager.register('StressManager');