import { Actor, mix, v3_add, v3_floor, v3_sub,q_axisAngle,q_multiply, AM_Spatial, toRad, v3_rotate, v3_angle, toDeg} from "@croquet/worldcore";

import { toWorld, packKey, Voxels} from "./Voxels";

//------------------------------------------------------------------------------------------
//-- VoxelActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Actors that store their voxel coordinates and automatically convert to world world translation.

export class VoxelActor extends mix(Actor).with(AM_Spatial) {

    voxelSet(v) { this.set({translation: toWorld(v3_add(v, this.fraction))})}
    voxelSnap(v) { this.snap({translation: toWorld(v3_add(v, this.fraction))})}

    fractionSet(f) { this.set({translation: toWorld(v3_add(f, this.voxel))})}
    fractionSnap(f) { this.snap({translation: toWorld(v3_add(f, this.voxel))})}

    pitchSet(pitch) {
        const pitchQ = q_axisAngle([1,0,0], pitch);
        const yawQ = q_axisAngle([0,0,1], this.yaw);
        const rotation = q_multiply(pitchQ, yawQ);
        this.set({rotation});
    }

    yawSet(yaw) {
        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,0,1], yaw);
        const rotation = q_multiply(pitchQ, yawQ);
        this.set({rotation});
    }

    xyzSet(xyz) {
        const voxel = v3_floor(xyz);
        const fraction = v3_sub(xyz,voxel);
        this.clampFraction(fraction);
        this.set({voxel,fraction});
    }

    get voxel() { return this._voxel || [0,0,0]}
    get key() { return packKey(...this.voxel)}
    get fraction() { return this._fraction || [0,0,0]}
    get xyz() { return v3_add(this.voxel, this.fraction)}

    get pitch() { return this._pitch || 0};
    get yaw() { return this._yaw || 0};

    set pitch(pitch) { this.set({pitch})};
    set yaw(yaw) { this.set({yaw})};

    set voxel(voxel) {this.set({voxel})};
    set fraction(fraction) {this.set({fraction})};
    set xyz(xyz) {this.set({xyz})}

    // clamp() { // Move to an adjacent voxel if the faction is outside the current one.
    //     console.log("old clamp");
    //     const floor = v3_floor(this.fraction);
    //     const fraction = this.clampFraction(v3_sub(this.fraction, floor));
    //     const voxel = v3_add(this.voxel, floor);
    //     this.set({voxel,fraction});
    // }

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
        const fraction = this.fraction;
        fraction[2] = elevation;
        this.fraction = this.clampFraction(fraction);
        if (this.conform) { // Align pitch to surface normal.
            const normal = surfaces.normal(...this.xyz);
            const yawQ = q_axisAngle([0,0,1], this.yaw);
            const forward = v3_rotate([0,1,0], yawQ);
            const pitch = v3_angle(forward,normal) - toRad(90);
            this.pitch = pitch;
        }
    }

    hop() { // Move up a voxel if there's a solid surface above
        const surfaces = this.service("Surfaces");
        const above = Voxels.adjacent(...this.xyz, [0,0,1]);
        const below = Voxels.adjacent(...this.xyz, [0,0,-1])
        const aboveElevation = surfaces.elevation(...above);
        const belowElevation = surfaces.elevation(...below);
        const xyz = this.xyz;
        if (aboveElevation>-1) xyz[2] += 1;
        if (belowElevation>-1) xyz[2] += -1;
        this.xyz = xyz;
    }

}
VoxelActor.register("VoxelActor");



