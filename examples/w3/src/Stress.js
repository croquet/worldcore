import { Model } from "@croquet/croquet";
import { Voxels } from "./Voxels";

const max = 10000;

export class Stress extends Model{
    init() {
        super.init();
        this.beWellKnownAs('Stress');
        this.voxels = this.wellKnownModel("Voxels");
        this.collapsing = new Set();
        this.subscribe("voxels", "newLevel", this.onNewLevel);
        this.subscribe("voxels", "changed", this.onChanged);
        this.future(100).tick();
    }

    tick() {
        if (this.collapsing.size > 0) {
            const doomed = new Set(this.collapsing);
            this.collapsing.clear();
            doomed.forEach(key => { this.voxels.set(...Voxels.unpackKey(key), Voxels.air); });
        }
        this.future(100).tick();
    }

    onNewLevel() {
        const voxels = this.wellKnownModel("Voxels");

        this.stress = new Map();
        voxels.forEach( (t,x,y,z) => { // Set all unsupported solid voxels to max
            if (!t) return; // Air voxel
            if (voxels.get(x,y,z-1)) return; // Supported solid voxel
            const key = Voxels.packKey(x,y,z);
            this.stress.set(key, max);
        })

        // Find all voxels with stress of 1.
        let set0 = new Set();
        this.stress.forEach((value, key) => {
            if (this.minAdjacent(...Voxels.unpackKey(key)) === 0) set0.add(key);
        });

        // Flood-fill stresses
        let s = 0;
        while (set0.size > 0) {
            s++;
            const set1 = new Set();
            set0.forEach(key => {
                const old = this.stress.get(key);
                if (old && s < old) {
                    this.stress.set(key, s)
                    const xyz = Voxels.unpackKey(key);
                    const x = xyz[0];
                    const y = xyz[1];
                    const z = xyz[2];
                    set1.add(Voxels.packKey(x,y+1,z));
                    set1.add(Voxels.packKey(x+1,y,z));
                    set1.add(Voxels.packKey(x,y-1,z));
                    set1.add(Voxels.packKey(x-1,y,z));
                }
            });
            set0 = set1;
        }

        this.stress.forEach((value,key) => { // Check for collapse at start.
            if (value > 2) { this.collapsing.add(key);}
        })

    }

    onChanged(data) {
        if (data.type) {
            this.updateStress(...data.xyz);
        } else {
            this.stress.delete(Voxels.packKey(...data.xyz));
            this.updateAdjacentStress(...data.xyz);
        }
    }

    // Updates the stress in the current voxel and triggers a collapse if necessary.
    // If the stress changes, recursively calls itself on adjacent voxels.
    // Should only be called on solid voxels.

    updateStress(x,y,z) {
        const old = this.get(x,y,z);
        let s = 0;
        if (!this.voxels.get(x,y,z-1)) { // This voxel is unsupported
            s = Math.min(max,this.minAdjacent(x,y,z) + 1);
        }
        if (s === old) return; // We don't need to do anything if the stress doesn't change

        const key = Voxels.packKey(x,y,z);
        if (s) {
            this.stress.set(key, s);
        } else {
            this.stress.delete(key, s);
        }

        if (s > 2) {  // We don't update adjacent cells on a collapse -- this prevents ping-pong recursion between unsupported adjacent cells
            this.collapsing.add(key);
        } else {
            this.updateAdjacentStress(x,y,z);
        }
    }

    // Updates stress for all voxels to the side and above.
    updateAdjacentStress(x,y,z) {
        for (let a = 0; a < 5; a++) {
            const adjacent = Voxels.adjacent(x,y,z,a);
            if (Voxels.isValid(...adjacent) && this.voxels.get(...adjacent)) this.updateStress(...adjacent);
        }
    }

    // Returns the minimum stress in the horizontally adjacent voxels.
    minAdjacent(x,y,z) {
        return Math.min(this.get(x-1,y,z), this.get(x+1,y,z),this.get(x,y-1,z),this.get(x,y+1,z),);
    }

    // Returns max if the voxel is air or invalid.
    get(x, y, z) {
        if (!Voxels.isValid(x,y,z) || !this.voxels.get(x,y,z)) return max;
        const key = Voxels.packKey(x,y,z);
        return this.stress.get(key) || 0;
    }

}
Stress.register('Stress');