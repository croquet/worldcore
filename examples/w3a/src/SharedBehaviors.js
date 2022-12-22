import { Constants, Behavior,  q_multiply, q_axisAngle,  q_normalize,  sphericalRandom, v3_equals, v3_floor, q_lookAt, v3_normalize, v3_sub, v3_magnitude,
    v3_scale, v3_add, v3_rotate, v3_angle, toRad, toDeg, v2_signedAngle, v2_add, v2_sub, v2_normalize, v2_scale, v2_magnitude, v2_dot, v2_perpendicular, v2_rotate, v2_closest, v2_lerp, v3_lerp, TAU, slerp, v2_distance, fromS } from "@croquet/worldcore";
import { packKey, unpackKey, Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- FallBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FallBehavior extends Behavior {

    onStart() {
        this.velocity = 0;
        this.tickRate = 50;
    }

    do(delta) {
        const voxels = this.service("Voxels");
        const gravity = Constants.gravity/ Constants.scaleZ;
        this.velocity = this.velocity - gravity * delta/1000;

        const xyz = this.actor.xyz;
        xyz[2] += this.velocity/Constants.scaleZ;
        this.actor.set({xyz});
        const landing = voxels.get(...this.actor.voxel);
        if (landing>=2) { // solid
            const voxel = [...this.actor.voxel];
            voxel[2] +=1
            this.actor.set({voxel});
            this.actor.ground();
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
        this.tickRate = 1000;
        // this.size = 0.2;
        this.actor.scale = [this.size, this.size, this.size];
    }

    do(delta) {
        const growth = 1 + 0.01 * (delta/1000)
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
        this.tickRate = 100;
    }

    do() {
        const voxels = this.service("Voxels");
        const surfaces = this.service("Surfaces");
        const type = voxels.get(...this.actor.voxel);
        if (type >=2 ) { // Buried
            console.log("Buried!")
            this.actor.destroy();
            return;
        }
        const e = surfaces.elevation(...this.actor.xyz);
        if ( e < 0 ) {
            this.fail();
            return;
        }
        this.actor.ground();
    }



}
GroundTestBehavior.register("GroundTestBehavior");

//------------------------------------------------------------------------------------------
//-- GotoBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves toward a target point

class GotoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get target() {return this._target || this.actor.xyz}
    set target(target) {this.set({target})};
    get ease() { return this._ease || 0.9}
    get speed() { return this._speed || 3}

    do(delta) {
        const voxels = this.service("Voxels");
        let distance = this.speed * delta / 1000;
        if(this.actor.xyz[2] < voxels.watertable) { // wading
            distance *= 0.5;
        }
        const to = v2_sub(this.target, this.actor.xyz);
        const left = v2_magnitude(to)
        if (distance>left) {
            this.actor.set({xyz:this.target});
            this.actor.hop();
            this.progress(1);
            return;
        }
        this.elapsed = 0; // reset timeout

        const forward = v2_normalize(to);
        const yaw = v2_signedAngle([0,1], forward);

        const x = forward[0] * distance;
        const y = forward[1] * distance;

        const level = v3_floor(v3_add(this.actor.xyz,[x,y,0]));
        const above = v3_floor(v3_add(this.actor.xyz,[x,y,1]));
        const below = v3_floor(v3_add(this.actor.xyz,[x,y,-1]));

        const levelIsEmpty = voxels.get(...level) < 2;
        const aboveIsEmpty = voxels.get(...above) < 2;
        const belowIsEmpty = voxels.get(...below) < 2;

        if (!Voxels.canEdit(...level)) {
            console.log("Edge Blocked!");
            this.fail();
            return;
        }

        let z = 0;
        if (levelIsEmpty) {
            if (belowIsEmpty) z = -1;
        } else {
            if (aboveIsEmpty) {
                z = 1;
            } else {
                console.log("Blocked!");
                this.fail();
                return;
            }
        }

        let  xyz = v3_add(this.actor.xyz, [x,y,z]);

        xyz = v3_lerp(this.actor.xyz, xyz, this.ease);
        this.actor.set({xyz,yaw});
        this.actor.hop();

    }

}
GotoBehavior.register("GotoBehavior");

//------------------------------------------------------------------------------------------
//-- WalkToBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Need to repath if goto is blocked.

class WalkToBehavior extends Behavior {

    get destination() {return this._destination}
    get speed() { return this._speed || 3}

    onStart() {
        const paths = this.service("Paths");
        const endKey = packKey(...v3_floor(this.destination));
        this.path = paths.findPath(this.actor.key, endKey);

        if (this.path.length === 0) { // No path to destination
            console.log("no path!")
            this.fail();
            return;
        }

        const speed = this.speed;
        this.goto = this.start({name: "GotoBehavior", speed});

        this.step = 0;
        this.progress(0);
        this.nextStep();
    }

    onProgress(child) {
        if (child === this.goto) {
            if (this.step<this.path.length) {
                this.nextStep();
                this.progress(this.step/this.path.length);
            } else {
                this.succeed();
            }
        }
    }

    nextStep() {
        let target = this.destination;
        this.step++
        if (this.step < this.path.length) { // not at end
            const nextVoxel = unpackKey(this.path[this.step]);
            const x = 0.25 + this.random()*0.5;
            const y = 0.25 + this.random()*0.5;
            target = v3_add(nextVoxel, [x, y, 0]);
        }
        this.goto.target = target;
    }

    onFail() {
        console.log("Walkto fail!");
    }

}
WalkToBehavior.register("WalkToBehavior");

//------------------------------------------------------------------------------------------
//-- FollowBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FollowBehavior extends Behavior {

    get target() { return this._target}
    get distance() { return this._distance || 3}

    onStart() {
        this.tickRate = 500;
        const destination = this.target.xyz;
        this.start({name: "WalkToBehavior", destination});
    }

    do() {
        const range = v2_distance(this.target.xyz, this.actor.xyz);
        if (range < this.distance) {
            this.kill("WalkToBehavior");
        } else {
            if (!this.get("WalkToBehavior")) this.onStart();
        }
    }
}
FollowBehavior.register("FollowBehavior");

//------------------------------------------------------------------------------------------
//-- FleeBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FleeBehavior extends Behavior {

    get tag() { return this._tag || "threat"};
    get distance() { return this._distance || 1};
    get speed() { return this._speed || 7};

    onStart() {
        // console.log("flee start");
        const neighbors = this.actor.neighbors(this.distance+1, this.tag);
        let x = 0;
        let y = 0
        let s = 0;
        for (const bot of neighbors) {
            const from = v2_sub(this.actor.xyz, bot.xyz);
            const range = v2_magnitude(from);
            if (range<this.distance) {
                x += from[0]
                y += from[1]
                s++;
            }
        }

        if (s>0) {
            // console.log("flee now");
            const paths = this.service("Paths");
            const endKey = paths.findWay(this.actor.key, [x,y], this.distance)
            const endVoxel = unpackKey(endKey);
            const xx = 0.25 + this.random()*0.5;
            const yy = 0.25 + this.random()*0.5;
            const destination = v3_add(endVoxel, [xx, yy, 0]);
            const speed = this.speed;
            this.start({name: "WalkToBehavior", speed, destination});
        } else {
            // console.log("flee nothing to flee from")
            this.succeed(); // Nothing to flee from;
        }
    }

    onSucceed() {this.succeed()};
    onFail() {this.fail()};


}
FleeBehavior.register("FleeBehavior");

//------------------------------------------------------------------------------------------
//-- AvoidBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvoidBehavior extends Behavior {

    get tag() { return this._tag || "threat"};
    get distance() { return this._distance || 3};

    onStart() {
        // console.log("avoid start");
        const distance = this.distance + 1;
        this.start({name: "RetryBehavior", delay:500, behavior: {name: "FleeBehavior", distance}});
    }

}
AvoidBehavior.register("AvoidBehavior");

//------------------------------------------------------------------------------------------
//-- CohereBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class CohereBehavior extends Behavior {

    get radius() { return this._radius || 0.5};

    onStart() {
        if(!this.actor.flock) return;
        this.tickRate = 100;
        this.center = this.actor.flock.xyz;
        const destination = this.center;
        this.start({name: "WalkToBehavior", speed: 2, destination});
    }

    do() {
        const range = v2_distance(this.center, this.actor.xyz);
        if (range < this.radius) this.kill("WalkToBehavior");
    }

}
CohereBehavior.register("CohereBehavior");


// //------------------------------------------------------------------------------------------
// //-- JostleBehavior ------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// class JostleBehavior extends Behavior {

//     get radius() { return this._radius|| 0.5};

//     onStart() {
//         this.tickRate = 50;
//     }

//     do() {
//         const neighbors = this.actor.neighbors( 2, "obstacle");
//         let x = 0;
//         let y = 0
//         let s = 0;
//         for (const bot of neighbors) {
//             const from = v2_sub(this.actor.xyz, bot.xyz);
//             const range = v2_magnitude(from);
//             if (range<this.radius) {
//                 x += from[0]
//                 y += from[1]
//                 s++;
//             }
//         }

//         if (s>0) {
//             const xyz = v3_add(this.actor.xyz,[x/s,y/s,0])
//             this.actor.set({xyz});
//         };
//     }


// }
// JostleBehavior.register("JostleBehavior");



//------------------------------------------------------------------------------------------
//-- FlockBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FlockBehavior extends Behavior {

}
FlockBehavior.register("FlockBehavior");



