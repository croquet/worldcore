import { Actor, mix, v3_add, v3_floor, v3_sub, AM_Spatial} from "@croquet/worldcore";

import { toWorld, packKey, Voxels} from "./Voxels";

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

    clamp() { // Move to an adjacent voxel if the faction is outside the current one.
        const floor = v3_floor(this.fraction);
        const fraction = this.clampFraction(v3_sub(this.fraction, floor));
        const voxel = v3_add(this.voxel, floor);
        this.set({voxel,fraction});
    }

    clampFraction(f) { // Ensure the fraction is inside the voxel.
        const e = 0.0001
        const ee = 1-e;
        f[0] = Math.min(ee, Math.max(e, f[0]))
        f[1] = Math.min(ee, Math.max(e, f[1]))
        f[2] = Math.min(ee, Math.max(e, f[2]))
        return f;
    }

    ground() { // Adjust the fraction to position the actor on the surface
        const surfaces = this.service("Surfaces");
        const elevation = Math.max(0,surfaces.elevation(...this.xyz));
        // const elevation = surfaces.elevation(...this.xyz);
        const fraction = this.fraction;
        fraction[2] = elevation;
        this.fraction = this.clampFraction(fraction);
    }

    hop() { // Move up a voxel if there's a solid surface above
        const surfaces = this.service("Surfaces");
        const above = Voxels.adjacent(...this.xyz, [0,0,1])
        const aboveElevation = surfaces.elevation(...above);
        const fraction = this.fraction;
        if (aboveElevation>0) {
            fraction[2] = 1+aboveElevation;
            this.fraction = fraction;
            this.clamp();
        }
    }

}
VoxelActor.register("VoxelActor");



