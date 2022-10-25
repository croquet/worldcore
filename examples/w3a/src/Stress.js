import { ModelService, Constants } from "@croquet/worldcore";
import { VoxelActor } from "./VoxelActor";
import { packKey, unpackKey, Voxels } from "./Voxels";

const max = 1000;

Constants.stress = {};
Constants.stress.lava = 1;
Constants.stress.rock = 3;
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

    init(options) {
        super.init("Stress");
        this.surfaces = new Map();
        this.collapsing = new Set();
        this.subscribe("voxels", "load", this.rebuildAll)
        this.subscribe("voxels", "set", this.rebuildSome)
        this.rebuildAll();
        this.tick();
    }

    tick() {
        this.collapse();
        this.future(100).tick();
    }

    collapse() {
        const voxels = this.service("Voxels");
        if (this.collapsing.size > 0) {
            const doomed = new Set(this.collapsing);
            this.collapsing.clear();
            doomed.forEach(key => {
                const xyz = unpackKey(key);
                voxels.set(...xyz, Constants.voxel.air);
                VoxelActor.create({voxel: xyz, fraction: [0.25,0.25,0.5]})
                VoxelActor.create({voxel: xyz, fraction: [0.75,0.25,0.5]})
                VoxelActor.create({voxel: xyz, fraction: [0.25,0.75,0.5]})
                VoxelActor.create({voxel: xyz, fraction: [0.75,0.75,0.5]})
            });
        };
    }

    rebuildAll () {
        // console.log("Building stress");
        const voxels = this.service("Voxels");
        this.stress = new Map();
        this.collapsing = new Set();

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

        this.stress.forEach((stress,key) => { // Check for collapse at start.
            if (this.tooHigh(stress,key)) this.collapsing.add(key);
        })

        this.collapse();

    }

    rebuildSome(data) {
        const xyz = data.xyz
        const t = data.type;
        if (t<2) {
            this.stress.delete(packKey(...xyz));
            this.updateAdjacent(...xyz);
        } else {
            this.updateStress(...xyz);
        }

    }

    updateStress(x,y,z) {
        const key = packKey(x,y,z);
        const voxels = this.service("Voxels");
        const stress0 = this.get(x,y,z);

        let stress1 = 0;
        if (voxels.get(x,y,z-1)<2) stress1 = Math.min(max, this.minAdjacent(x,y,z)+1);

        if (stress0 === stress1 ) return; // No change

        this.stress.set(key, stress1);

        if (this.tooHigh(stress1, key)) {
            this.collapsing.add(key);
        } else {
            this.updateAdjacent(x,y,z);
        }
    }

    updateAdjacent(x,y,z) {
        const voxels = this.service("Voxels");
        voxels.forAdjacent(x,y,z, (x,y,z,t) => {
            if (t>2) this.updateStress(x,y,z)
        });
    }

    tooHigh(stress,key) {
        if (stress <2 ) return false;
        const voxels = this.service("Voxels");
        const xyz = unpackKey(key);
        const type = voxels.get(...xyz);
        if (stress <= maxStress(type)) return false;
        return true;
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