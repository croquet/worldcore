import { Constants, Behavior,  q_multiply, q_axisAngle,  q_normalize,  sphericalRandom, } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- FallBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FallBehavior extends Behavior {

    init(options) {
        super.init(options);
        this.tickRate = 15;
        const voxels = this.service("Voxels");
        this.bottom = voxels.solidBelow(...this.actor.voxel);
    }

    get velocity() { return this.actor._velocity || 0}
    set velocity(v) { this.actor._velocity = v}

    do(delta) {
        const gravity = Constants.gravity/3;
        this.velocity = this.velocity - gravity * delta/1000;
        const fraction = this.actor.fraction;
        const z = fraction[2] + this.velocity/Constants.scaleZ;
        fraction[2] = z;
        this.actor.set({fraction});
        this.actor.clamp();
        if (this.actor.voxel[2] < this.bottom) {
            this.succeed();
            this.actor.destroy();
        }
    }

}
FallBehavior.register("FallBehavior");

//------------------------------------------------------------------------------------------
//-- TumbleBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TumbleBehavior extends Behavior {
    init(options) {
        super.init(options);
        this.tickRate = 15;
    }

    get axis() { return this._axis || sphericalRandom()}
    get speed() { return this._speed || 2 + this.random() * 5} // Radians per second

    do(delta) {
        let q = this.actor.rotation;
        q = q_multiply(q, q_axisAngle(this.axis, delta * this.speed / 1000));
        q = q_normalize(q);
        this.actor.rotatation = q;
    }
}
TumbleBehavior.register("TumbleBehavior");



