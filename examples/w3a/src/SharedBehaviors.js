import { Constants, Behavior,  q_multiply, q_axisAngle,  q_normalize,  sphericalRandom, } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

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
        const gravity = Constants.gravity/ Constants.scaleZ;
        this.velocity = this.velocity - gravity * delta/1000;
        const fraction = this.actor.fraction;
        const z = fraction[2] + this.velocity/Constants.scaleZ;
        fraction[2] = z;
        this.actor.set({fraction});
        this.actor.clamp();
        if (this.actor.voxel[2] < this.bottom) this.succeed();
    }

}
FallBehavior.register("FallBehavior");

//------------------------------------------------------------------------------------------
//-- TumbleBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TumbleBehavior extends Behavior {
    init(options) {
        super.init(options);
        this.tickRate = 50;
    }

    get axis() { return this._axis}
    get speed() { return this._speed} // Radians per second

    onStart() {
        if (this.speed === undefined) this._speed = 0.9 + this.random() * 0.9;
        if (this.axis === undefined) this._axis = sphericalRandom();
    }

    do(delta) {
        let q = this.actor.rotation;
        q = q_multiply(q, q_axisAngle(this.axis, delta * this.speed / 1000));
        q = q_normalize(q);
        this.actor.rotation = q;
    }
}
TumbleBehavior.register("TumbleBehavior");

//------------------------------------------------------------------------------------------
//-- GrowBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GrowBehavior extends Behavior {
    init(options) {
        super.init(options);
        this.tickRate = 100;
    }

    onStart() {
        this.size = 0.2;
        this.actor.scale = [this.size, this.size, this.size];
    }

    do(delta) {
        const growth = 1 + 0.1 * (delta/1000)
        this.size = Math.min(1, this.size * growth);
        this.actor.scale = [this.size, this.size, this.size];
        if (this.size > 1) this.succeed();
    }
}
GrowBehavior.register("GrowBehavior");

//------------------------------------------------------------------------------------------
//-- GroundTestBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GroundTestBehavior extends Behavior {
    init(options) {
        super.init(options);
        this.tickRate = 100;
    }

    onStart() {
        this.testElevation();
    }

    do(delta) {
        this.testElevation();
    }

    // Handle double ramp edges & falling

    testElevation() {
        const voxels = this.service("Voxels");
        const surfaces = this.service("Surfaces");
        const type = voxels.get(...this.actor.voxel);
        if (type >=2 ) { // Buried
            console.log("Buried!")
            this.actor.destroy();
        }
        const belowXYZ = Voxels.adjacent(...this.actor.voxel,[0,0,-1]);
        const belowType = voxels.get(...belowXYZ);
        if (belowType <2 ) this.actor.destroy(); // should fall

        const e = surfaces.elevation(...this.actor.xyz) || 0;
        if (e === undefined) this.destroy();
        const fraction = [...this.actor.fraction];
        fraction[2] = e;
        this.actor.snap({fraction});
    }
}
GroundTestBehavior.register("GroundTestBehavior");



