import { ModelService, Constants } from "@croquet/worldcore";
import { packKey, unpackKey, Voxels } from "./Voxels";

const max = 10000;

Constants.stress = {};
Constants.stress.lava = 2;
Constants.stress.rock = 2;
Constants.stress.dirt = 3;

function maxStress(type) {
    switch (type) {
        case Constants.voxel.lava: return Constants.stress.lava;
        case Constants.voxel.rock: return Constants.stress.rock;
        case Constants.voxel.dirt: return Constants.stress.dirt;
        default: return 2;
    }
}

//------------------------------------------------------------------------------------------
//-- Stress ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Stress extends ModelService {

    init() {
        super.init('Stress');
        this.surfaces = new Map();
        this.collapsing = new Set();
        this.subscribe("voxels", "load", this.rebuildAll)
        this.subscribe("voxels", "set", this.rebuildAll)
        this.rebuildAll();
        this.future(2000).tick();
    }

    tick() {
        const voxels = this.service("Voxels");
        if (this.collapsing.size > 0) {
            const doomed = new Set(this.collapsing);
            this.collapsing.clear();
            doomed.forEach(key => { voxels.set(...unpackKey(key), Constants.voxel.air); });
        }
        this.future(2000).tick();
    }

    rebuildAll () {
        console.log("Building stress");
        const voxels = this.service("Voxels");
        this.stress = new Map();

        // Set all unsupported solid voxels to max
        voxels.forEach( (x,y,z,t) => {
            if (z == 0 || t<2) return; // Ignore the bottom row & Empty voxels
            if (voxels.get(x,y,z-1) >= 2) return;  // Supported solid voxel
            const key = packKey(x,y,z);
            this.stress.set(key, max);
        })

        // Find all voxels with stress of 1.
        let set0 = new Set();
        this.stress.forEach((value, key) => {
            if (this.minAdjacent(...unpackKey(key)) === 0) set0.add(key);
        });

        // console.log(set0);

        // Flood-fill stresses
        let s = 0;
        while (set0.size > 0) {
            s++;
            const set1 = new Set();
            set0.forEach(key => {
                const old = this.stress.get(key);
                if (old && s < old) {
                    this.stress.set(key, s)
                    const xyz = unpackKey(key);
                    const x = xyz[0];
                    const y = xyz[1];
                    const z = xyz[2];
                    set1.add(packKey(x,y+1,z));
                    set1.add(packKey(x+1,y,z));
                    set1.add(packKey(x,y-1,z));
                    set1.add(packKey(x-1,y,z));
                }
            });
            set0 = set1;
        }

        console.log(this.stress);

        this.stress.forEach((value,key) => { // Check for collapse at start.
            if (value > 2) { this.collapsing.add(key);}
        })

    }

    // Returns the minimum stress in the horizontally adjacent voxels.
    minAdjacent(x,y,z) {
        return Math.min(this.get(x-1,y,z), this.get(x+1,y,z),this.get(x,y-1,z),this.get(x,y+1,z),);
    }

    // Returns max if the voxel is air or invalid.
    get(x, y, z) {
        const voxels = this.service("Voxels");
        if (!Voxels.isValid(x,y,z)) return max;
        if (voxels.get(x,y,z)<2) return max;
        const key = packKey(x,y,z);
        return this.stress.get(key) || 0;
    }
}
Stress.register("Stress");