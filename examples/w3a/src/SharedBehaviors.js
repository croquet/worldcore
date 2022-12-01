import { Constants, Behavior,  q_multiply, q_axisAngle,  q_normalize,  sphericalRandom, v3_equals, v3_floor, q_lookAt, v3_normalize, v3_sub, v3_magnitude,
    v3_scale, v3_add, v3_rotate, v3_angle, toRad, toDeg, v2_signedAngle, v2_add, v2_sub, v2_normalize, v2_scale, v2_magnitude, v2_dot, v2_perpendicular, v2_rotate, v2_closest } from "@croquet/worldcore";
import { packKey, unpackKey, Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- FallBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FallBehavior extends Behavior {

    get velocity() { return this.actor._velocity || 0}
    set velocity(v) { this.actor._velocity = v}

    onStart() {
        this.tickRate = 50;
        const voxels = this.service("Voxels");
        this.bottom = voxels.solidBelow(...this.actor.voxel);
    }

    do(delta) {
        const gravity = Constants.gravity/ Constants.scaleZ;
        this.velocity = this.velocity - gravity * delta/1000;

        const xyz = this.actor.xyz;
        xyz[2] += this.velocity/Constants.scaleZ;
        this.actor.set({xyz});

        if (this.actor.voxel[2] < this.bottom) {
            const final = [...this.actor.voxel];
            final[2] = this.bottom+1;
            this.actor.set({voxel: final});
            this.succeed();
        }
    }

}
FallBehavior.register("FallBehavior");

//------------------------------------------------------------------------------------------
//-- TumbleBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TumbleBehavior extends Behavior {

    get axis() { return this._axis}
    get speed() { return this._speed} // Radians per second

    onStart() {
        this.tickRate = 50;
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

    get size() { return this.actor.size }
    set size(s) { this.actor.size = s}

    onStart() {
        this.tickRate = 500;
        this.size = 0.2;
        this.actor.scale = [this.size, this.size, this.size];
    }

    do(delta) {
        const growth = 1 + 0.1 * (delta/1000)
        this.size = Math.min(this.actor.maxSize, this.size * growth);
        this.actor.scale = [this.size, this.size, this.size];
        if (this.size === this.actor.maxSize) this.succeed();
    }
}
GrowBehavior.register("GrowBehavior");

//------------------------------------------------------------------------------------------
//-- GroundTestBehavior --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GroundTestBehavior extends Behavior {

    onStart() {
        this.tickRate = 15;
        this.testElevation();
    }

    do(delta) {
        // this.testElevation();
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
        const e = surfaces.elevation(...this.actor.xyz);
        if ( e < 0 ) {
            console.log("fall");
            const FallThenBot = {name: "SequenceBehavior", options: {behaviors:["FallBehavior", "BotBehavior"]}}
            this.actor.startBehavior(FallThenBot);
        }
        this.actor.ground();
    }
}
GroundTestBehavior.register("GroundTestBehavior");

//------------------------------------------------------------------------------------------
//-- WalkToBehavior --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WalkToBehavior extends Behavior {

    onStart() {
        const paths = this.service("Paths");
        const endKey = packKey(...v3_floor(this.destination));
        this.step = 1;
        this.path = paths.findPath(this.actor.key, endKey);
        if (this.path.length === 0) { // No path to destination
            console.log("no path!")
            this.fail();
        }
        this.nextStep();
    }

    get tickRate() { return this._tickRate || 20} // More than 15ms for smooth movement
    get destination() {return this._destination}
    get speed() {return this._speed || 3 } // m/s

    do(delta) {
        if (this.step < this.path.length) {
            if (this.goto(this.target, delta)) {
                this.step++;
                this.nextStep();
            }
        } else { // final voxel;
            if(this.goto(this.destination, delta)) this.succeed();
        }
    }

    nextStep() {
        const nextVoxel = unpackKey(this.path[this.step]);
        const x = 0.25 + this.random()*0.5;
        const y = 0.25 + this.random()*0.5;
        this.target = v3_add(nextVoxel, [x, y, 0]);
    }

    goto(target, delta) {
        let heading = v2_sub(target, this.actor.xyz);
        const left = v2_magnitude(heading);
        if (left<0.0001) {
            this.actor.set({xyz:target});
            this.actor.hop();
            return true;
        }
        const forward = v2_normalize(heading);
        const yaw = v2_signedAngle([0,1], forward);
        const distance = Math.min(left, delta * this.speed / 1000);
        const move = v2_scale(forward, distance);
        let xyz = v3_add(this.actor.xyz, [...move,0]);
        this.actor.set({xyz, yaw});
        this.actor.hop();
        return false;
    }


}
WalkToBehavior.register("WalkToBehavior");

//------------------------------------------------------------------------------------------
//-- FollowBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FollowBehavior extends Behavior {

    get target() { return this._target};
    get distance() { return this._distance || 1};

    onStart() {
        this.startWalk();
    }

    do() {
        if (!this.target) return;
        const targetMove = v3_magnitude(v3_sub(this.target.xyz, this.aim));
        if (targetMove > this.distance) this.startWalk();
        const remaining = v3_magnitude(v3_sub(this.target.xyz, this.actor.xyz));
        if (remaining < this.distance) this.walk.destroy();
    }

    startWalk() {
        if (!this.target) return;
        if (this.walk) this.walk.destroy();
        const destination = this.target.xyz;
        this.aim = [...destination];
        this.walk = this.startChild({name: "WalkToBehavior", options: {destination}});
    }

    onSucceed() {
        console.log("arrive!");
    }

    onFail() {
        console.log("follow blocked!");
        this.fail();
    }

}
FollowBehavior.register("FollowBehavior");

//------------------------------------------------------------------------------------------
//-- AvoidBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvoidBehavior extends Behavior {

    get target() { return this._target};
    get distance() { return this._distance || 5};

    onStart() {
        this.startWalk();
    }

    do() {
        const away = v3_sub(this.actor.xyz, this.target.xyz);
        const range = v3_magnitude(away);
        if (range<this.distance) this.startWalk();
    }

    startWalk() {
        if (!this.target) return;
        if (this.walk) this.walk.destroy();

        const away = v3_sub(this.actor.xyz, this.target.xyz);
        const paths = this.service("Paths");
        const aim = paths.findWay(this.actor.key, away, this.distance);

        const x = 0.25 + this.random()*0.5;
        const y = 0.25 + this.random()*0.5;
        const destination = v3_add(unpackKey(aim), [x,y,0]);
        // console.log(destination);
        this.walk = this.startChild({name: "WalkToBehavior", options: {destination}});
    }

    onSucceed() {
        console.log("phew!");
    }

    onFail() {
        console.log("avoid blocked!");
        this.fail();
    }

}
AvoidBehavior.register("AvoidBehavior");

//------------------------------------------------------------------------------------------
//-- BotBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotBehavior extends Behavior {

    onStart() {
        this.startChild("GroundTestBehavior");
    }

}
BotBehavior.register("BotBehavior");

