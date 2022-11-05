import { Actor, mix, v3_add, v3_floor, v3_sub, AM_Spatial} from "@croquet/worldcore";

import { toWorld, packKey} from "./Voxels";

//------------------------------------------------------------------------------------------
//-- VoxelActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Actors that store their voxel coordinates and automatically convert to world world translation.

export class VoxelActor extends mix(Actor).with(AM_Spatial) {

    voxelSet(v) { this.set({translation: toWorld(v3_add(v, this.fraction))})}
    voxelSnap(v) { this.snap({translation: toWorld(v3_add(v, this.voxel))})}

    fractionSet(v) { this.set({translation: toWorld(v3_add(v, this.voxel))})}
    fractionSnap(v) { this.snap({translation: toWorld(v3_add(v, this.voxel))})}

    get voxel() { return this._voxel || [0,0,0]}
    get key() { return packKey(...this.voxel)}
    get fraction() { return this._fraction || [0,0,0]}
    get xyz() { return v3_add(this.voxel, this.fraction)}

    set voxel(v) {this.set({voxel: v})};
    set fraction(f) {this.set({fraction: f})};

    clamp() {
        const floor = v3_floor(this.fraction);
        const fraction = this.clampFraction(v3_sub(this.fraction, floor));
        const voxel = v3_add(this.voxel, floor);
        this.set({voxel,fraction});
    }

    clampFraction(f) {
        const e = 0.0001
        const ee = 1-e;
        f[0] = Math.min(ee, Math.max(e, f[0]))
        f[1] = Math.min(ee, Math.max(e, f[1]))
        f[2] = Math.min(ee, Math.max(e, f[2]))
        return f;
    }

    ground() {
        const surfaces = this.service("Surfaces");
        const elevation = surfaces.elevation(...this.xyz);
        const fraction = this.fraction;
        fraction[2] = elevation;
        this.fraction = fraction;
    }

}
VoxelActor.register("VoxelActor");



