import { Constants, Behavior,  q_multiply, q_axisAngle,  q_normalize,  sphericalRandom, v3_equals, v3_floor, q_lookAt, v3_normalize, v3_sub, v3_magnitude,
    v3_scale, v3_add, v3_rotate, v3_angle, toRad, toDeg } from "@croquet/worldcore";
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
        // this.testElevation(); // Causes bug order of set options?
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
        this.step = 0;
        this.path = paths.findPath(this.actor.key, endKey);
        if (this.path.length === 0) {
            console.log("no path!")
            this.fail();
        }
        this.path.forEach(key => {
            console.log(unpackKey(key));
        })
    }

    get destination() {return this._destination}
    get speed() {return this._speed || 1 } // m/s

    do(delta) {
        if (this.step < this.path.length) { // move toward next voxel
            const nextVoxel = unpackKey(this.path[this.step]);
            const destination = v3_add(nextVoxel, [0.5,0.5,0]);
            const remaining = v3_sub(destination, this.actor.xyz)
            const left = v3_magnitude(remaining)
            const distance = Math.min(left, delta * this.speed / 1000);
            const forward = v3_normalize(remaining);
            const yaw = v3_angle([0,1,0], forward)
            console.log(toDeg(yaw));
            const move = v3_scale(forward, distance);
            const xyz = v3_add(this.actor.xyz, move);
            this.actor.set({xyz, yaw});
            if (v3_equals(this.actor.voxel, nextVoxel)) this.step++;
        } else { // finish last voxel
            console.log("final voxel");
            const remaining = v3_sub(this.destination, this.actor.xyz)
            const left = v3_magnitude(remaining)
            if (left<0.01) {
                this.succeed();
                return;
            }
            const distance = Math.min(left, delta * this.speed / 1000);
            const forward = v3_normalize(remaining);
            const yaw = v3_angle([0,1,0], forward)
            console.log(toDeg(yaw));
            // const rotation = q_lookAt([0,1,0], [0,0,1], forward);
            const move = v3_scale(forward, distance);
            const xyz = v3_add(this.actor.xyz, move);
            this.actor.set({xyz, yaw});
            this.actor.hop();
        }


    }

}
WalkToBehavior.register("WalkToBehavior");

//------------------------------------------------------------------------------------------
//-- BotBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotBehavior extends Behavior {

    onStart() {
        this.startChild("GroundTestBehavior");
    }

}
BotBehavior.register("BotBehavior");

// //------------------------------------------------------------------------------------------
// //-- TestBehavior----------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class TestBehavior extends Behavior {

//     init(options) {
//         super.init(options);
//         // this.fail();
//     }

//     onStart() {
//         this.fail();
//     }

//     destroy() {
//         super.destroy();
//         console.log("TestBehavior destroy");
//     }
// }
// TestBehavior.register('TestBehavior');




