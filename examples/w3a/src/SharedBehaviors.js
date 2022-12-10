import { Constants, Behavior,  q_multiply, q_axisAngle,  q_normalize,  sphericalRandom, v3_equals, v3_floor, q_lookAt, v3_normalize, v3_sub, v3_magnitude,
    v3_scale, v3_add, v3_rotate, v3_angle, toRad, toDeg, v2_signedAngle, v2_add, v2_sub, v2_normalize, v2_scale, v2_magnitude, v2_dot, v2_perpendicular, v2_rotate, v2_closest, v2_lerp, TAU, slerp } from "@croquet/worldcore";
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
//-- WalkBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves toward an aim point

class WalkBehavior extends Behavior {

    get tickRate() { return this._tickRate || 20} // More than 15ms for smooth movement

    get name() {return this._name || "WalkBehavior"}
    get aim() {return this.actor.aim || [0,0] }
    get maxSpeed() {return this._maxSpeed || 4 } // m/s
    get steer() { return this._steer || 0.9}
    get timeout() { return this._timeout || 60000}


    do(delta) {
        const mag = v2_magnitude(this.aim)*3;
        if (mag === 0) return;
        this.elapsed = 0; // reset timeout

        const voxels = this.service("Voxels");
        let forward = v2_normalize(this.aim);
        let yaw = v2_signedAngle([0,1], forward);

        yaw = slerp(this.actor.yaw, yaw, this.steer);

        const distance = Math.min(this.maxSpeed, mag) * delta / 1000;
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

        const xyz = v3_add(this.actor.xyz, [x,y,z])
        this.actor.set({xyz,yaw});
        this.actor.hop();

    }

}
WalkBehavior.register("WalkBehavior");

//------------------------------------------------------------------------------------------
//-- WalkToBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WalkToBehavior extends Behavior {

    get destination() {return this._destination}
    get tickRate() { return this._tickRate || 50}
    get name() {return this._name || "WalkToBehavior"}

    onStart() {
        const paths = this.service("Paths");
        const endKey = packKey(...v3_floor(this.destination));
        this.path = paths.findPath(this.actor.key, endKey);

        if (this.path.length === 0) { // No path to destination
            console.log("no path!")
            this.fail();
        }

        this.step = 0;
        this.target = this.destination;
        this.actor.aim = v2_sub(this.target, this.actor.xyz);

        this.actor.behavior.start("WalkBehavior");
        this.start("AvoidBehavior");
    }

    onDestroy() {
        this.actor.aim = [0,0]
    }

    do() {
        const pathStep = this.path[this.step];
        const pathVoxel = unpackKey(pathStep);
        const cc = this.actor.voxel[0] === pathVoxel[0] && this.actor.voxel[1] === pathVoxel[1];

        if (cc ) { // this can get missed!!!
            // console.log("step");
            this.step++
            if (this.step < this.path.length) { // not at end
                const nextVoxel = unpackKey(this.path[this.step]);
                this.target = v3_add(nextVoxel, [0.5, 0.5, 0]);
            } else {
                this.target = this.destination;
            }
            this.actor.aim = v2_scale(v2_sub(this.target, this.actor.xyz), 3);
        }

        const to = v2_sub(this.destination, this.actor.xyz);
        const left = v2_magnitude(to)
        if (left<0.1) {
            console.log("arrived!");
            this.actor.set({xyz:this.destination});
            this.actor.hop();
            this.succeed();
        }
    }


}
WalkToBehavior.register("WalkToBehavior");

//------------------------------------------------------------------------------------------
//-- AvoidBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvoidBehavior extends Behavior {

    get name() {return this._name || "AvoidBehavior"}
    get tag() { return this._tag || "obstacle"};
    get distance() { return this._distance || 1};
    get weight() { return this._weight || 0.5};

    onStart() {
        console.log("avoid start");
    }

    // onDestroy() { this.actor.aim = [0,0] }

    do() {
        const obstacles = this.actor.see(this.distance+1, this.tag);
        for (const o of obstacles) {
            const to = v2_sub(o.xyz, this.actor.xyz);
            const range = v2_magnitude(to);
            if (range>this.distance) continue;
            const toward = v2_dot(to, this.actor.aim);
            if (toward<0) continue;
            console.log("range: " +range);
            console.log("toward: " +toward);

            const norm = v2_normalize(to);
            const side = v2_perpendicular(norm);
            const dx = side[0]
            const dy = side[1]
            const aim = [dx,dy]
            this.actor.aim = v2_lerp(this.actor.aim, aim, this.weight);
        }

    }

}
AvoidBehavior.register("AvoidBehavior");

//------------------------------------------------------------------------------------------
//-- FollowBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FollowBehavior extends Behavior {

    get target() { return this._target}
    get distance() { return this._distance || 3}
    get tickRate() { return this._tickRate || 50}
    get name() {return this._name || "FollowBehavior"}

    onStart() {
        this.updateAim();
        // this.actor.behavior.start("WalkBehavior");
    }

    onDestroy() {
        this.actor.aim = [0,0]
    }

    do() {
        this.updateAim();
    }

    updateAim() {
        let aim = [0,0];
        const to = v2_sub(this.target.xyz, this.actor.xyz);
        if (v2_magnitude(to) > this.distance) aim = to;
        this.actor.aim = v2_lerp(this.actor.aim, aim, 0.5);
    }

}
FollowBehavior.register("FollowBehavior");

//------------------------------------------------------------------------------------------
//-- FleeBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FleeBehavior extends Behavior {

    get name() {return this._name || "FleeBehavior"}
    get tag() { return this._tag || "threat"};
    get distance() { return this._distance || 2};
    get weight() { return this._weight || 0.5};

    onStart() {
        this.updateAim();
        // this.actor.behavior.start("WalkBehavior");
    }

    onDestroy() { this.actor.aim = [0,0] }

    do() {
        this.updateAim();
    }

    updateAim() {
        const neighbors = this.actor.neighbors(this.distance+1, this.tag);
        let aim = [0,0];

        let dx = 0;
        let dy = 0;
        let s = 0;

        for( const bot of neighbors) {
            const fromBot = v2_sub(this.actor.xyz, bot.xyz);
            const range = v2_magnitude(fromBot);
            if (range<this.distance) {
                dx += fromBot[0];
                dy += fromBot[1];
                s++;
            }
        }

        if (s>0) aim = [dx/s, dy/s];

        this.actor.aim = v2_lerp(this.actor.aim, aim, this.weight);
    }

}
FleeBehavior.register("FleeBehavior");

//------------------------------------------------------------------------------------------
//-- CohereBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class CohereBehavior extends Behavior {

    get name() {return this._name || "CohereBehavior"}
    get weight() { return this._weight || 0.2};
    get cohesion() { return this._cohesion || 5};

    onStart() {
        // this.actor.behavior.start("WalkBehavior");
    }

    onDestroy() { this.actor.aim = [0,0] }

    do(delta) {
        const toCenter = v2_sub(this.actor.flock.xyz, this.actor.xyz);

        const dx = toCenter[0] * this.cohesion * delta/1000;
        const dy = toCenter[1] * this.cohesion * delta/1000;

        const aim = [dx, dy];

        this.actor.aim = v2_lerp(this.actor.aim, aim, this.weight);
    }

}
CohereBehavior.register("CohereBehavior");

//------------------------------------------------------------------------------------------
//-- AlignBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AlignBehavior extends Behavior {

    get name() {return this._name || "AlignBehavior"}
    get tag() { return this._tag || "sheep"};
    get distance() { return this._distance || 2};
    get weight() { return this._weight || 0.5};

    onStart() {
        // this.actor.behavior.start("WalkBehavior");
    }

    onDestroy() { this.actor.aim = [0,0] }

    do(delta) {
        const neighbors = this.actor.neighbors(this.distance+1, this.tag);
        let aim = [0,0];

        let dx = 0;
        let dy = 0;
        let s = 0;

        for( const bot of neighbors) {
            const fromBot = v2_sub(this.actor.xyz, bot.xyz);
            const range = v2_magnitude(fromBot);
            if (range<this.distance) {
                dx += bot.aim[0];
                dy += bot.aim[1];
                s++;
            }
        }

        if (s>0) aim = [dx/s, dy/s];

        this.actor.aim = v2_lerp(this.actor.aim, aim, this.weight);
    }

}
AlignBehavior.register("AlignBehavior");

//------------------------------------------------------------------------------------------
//-- FlockBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FlockBehavior extends Behavior {

    get name() {return this._name || "FlockBehavior"}
    // get separation() { return this._separation || 5};
    // get alignment() { return this._alignment || 0.9};
    // get cohesion() { return this._cohesion || 1};
    // get tickRate() { return 500};

    onStart() {
        this.start({name: "WalkBehavior", options:{steer: 0.01, tickRate: 20}});
        this.start({name: "CohereBehavior", options: {tickRate: 200, weight: 0.5}})
        this.start({name: "AvoidBehavior", options: {tickRate: 200, tag: "sheep", distance: 1, weight: 0.9}})
        this.start({name: "AlignBehavior", options: {tickRate: 200, tag: "sheep", distance: 3, weight: 0.8}})
    }

}
FlockBehavior.register("FlockBehavior");

//------------------------------------------------------------------------------------------
//-- FlockBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// class FlockBehavior extends Behavior {

//     // get range() { return this._range || 0.3};
//     get separation() { return this._separation || 5};
//     get alignment() { return this._alignment || 0.9};
//     get cohesion() { return this._cohesion || 1};
//     get tickRate() { return 500};

//     onStart() {
//         this.actor.behavior.start("WalkBehavior");
//     }

//     onDestroy() { this.actor.aim = [0,0] }

//     do() {
//         const neighbors = this.actor.neighbors(3,"sheep");

//         let dx = 0;
//         let dy = 0;

//         const toCenter = v2_sub(this.actor.flock.xyz, this.actor.xyz);

//         dx += toCenter[0] * this.cohesion;
//         dy += toCenter[1] * this.cohesion;

//         //---------------------------

//         let mx = 0;
//         let my = 0;

//         for( const bot of neighbors) {
//             const fromBot = v2_sub(this.actor.xyz, bot.xyz);
//             const range = v2_magnitude(fromBot);
//             if (range<1) {
//                 mx += fromBot[0] + this.random()*2 - 1;
//                 my += fromBot[1] + this.random()*2 - 1;
//             }
//         }

//         dx += mx * this.separation;
//         dy += my * this.separation;

//         //---------------------------

//         let ax = 0;
//         let ay = 0;
//         let s = 0;

//         for( const bot of neighbors) {
//             const fromBot = v2_sub(this.actor.xyz, bot.xyz);
//             const range = v2_magnitude(fromBot);
//             if (range<2) {
//                 ax += bot.aim[0];
//                 ay += bot.aim[1];
//                 s++;
//             }
//         }

//         if(s>0) {
//             ax = ax/s ;
//             ay = ay/s;

//             dx += (ax-dx) * this.alignment;
//             dy += (ay-dy) * this.alignment;
//         }

//         //---------------------------

//         const vx = this.actor.voxel[0]
//         const vy = this.actor.voxel[1]

//         if (vx <= 2) dx = 5;
//         if (vy <= 2) dy = 5;

//         if (vx >= Constants.sizeX-2) dx = -5;
//         if (vy >= Constants.sizeY-2) dy = -5;

//         const aim = [dx, dy];

//         this.actor.aim = v2_lerp(this.actor.aim, aim, 0.01);


//     }


// }
// FlockBehavior.register("FlockBehavior");

//------------------------------------------------------------------------------------------
//-- BotBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotBehavior extends Behavior {

    get target() { return this._target};

    onStart() {
        // this.startChild("FlockBehavior");
        // this.startChild({name:"AvoidBehavior", options: {target: this.target}});
        // this.startChild("WalkBehavior");
    }

}
BotBehavior.register("BotBehavior");

