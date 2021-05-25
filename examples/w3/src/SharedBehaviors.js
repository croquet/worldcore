import { Behavior, q_axisAngle, q_multiply, v3_sub, sphericalRandom } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- FallBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FallBehavior extends Behavior {

    start() {
        this.setStartParameters();
        this.startHeight = this.actor.translation[2];
        this.run();
    }

    setStartParameters() {
        this.velocity = -8 + this.random()*(-4);   // m/s
        this.axis = sphericalRandom();
        this.spin = 0.1 + this.random() * 0.9;
    }

    do(delta) {
        const gravity = 9.8;
        this.velocity = this.velocity + gravity *  delta/1000;
        const t0 = this.actor.translation;
        const t1 = v3_sub(t0, [0, 0, this.velocity * delta/1000]);
        if (this.collide(t0,t1)) {
            this.succeed();
        } else {
            this.actor.rotateTo(q_multiply(this.actor.rotation, q_axisAngle(this.axis, this.spin * delta/1000)));
            this.actor.moveTo(t1);
            this.run();
        }
    }

    collide(t0, t1) {
        if (t1[2] > this.startHeight) return undefined; // Don't collide if above start height
        const voxels = this.wellKnownModel('Voxels');
        const v0 = Voxels.toClippedVoxelXYZ(...t0);
        const v1 = Voxels.toClippedVoxelXYZ(...t1);
        const x = v0[0];
        const y = v0[1];
        let z = v0[2];
        const bottom = Math.max(0, v1[2]);
        if (z < bottom) return undefined; // Don't collide if moving up.
        do {
            if (voxels.get(x,y,z)) return [x,y,z];
        } while (z-- > bottom);
        return undefined;
    }

}
FallBehavior.register("FallBehavior");