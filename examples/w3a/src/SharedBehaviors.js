import { Constants, Behavior,  q_multiply, q_axisAngle,  q_normalize,  sphericalRandom, v3_equals, v3_floor, q_lookAt, v3_normalize, v3_sub, v3_magnitude,
    v3_scale, v3_add, v3_rotate, v3_angle, toRad, toDeg, v2_signedAngle, v2_add, v2_sub, v2_normalize, v2_scale, v2_magnitude, v2_dot, v2_perpendicular, v2_rotate, v2_closest, v2_lerp } from "@croquet/worldcore";
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

// class WalkToBehavior extends Behavior {

//     onStart() {
//         const paths = this.service("Paths");
//         const endKey = packKey(...v3_floor(this.destination));
//         this.step = 1;
//         this.path = paths.findPath(this.actor.key, endKey);
//         if (this.path.length === 0) { // No path to destination
//             console.log("no path!")
//             this.fail();
//         }
//         this.nextStep();
//     }

//     get tickRate() { return this._tickRate || 20} // More than 15ms for smooth movement
//     get destination() {return this._destination}
//     get speed() {return this._speed || 3 } // m/s

//     do(delta) {
//         if (this.step < this.path.length) {
//             if (this.goto(this.target, delta)) {
//                 this.step++;
//                 this.nextStep();
//             }
//         } else { // final voxel;
//             if(this.goto(this.destination, delta)) this.succeed();
//         }
//     }

//     nextStep() {
//         const nextVoxel = unpackKey(this.path[this.step]);
//         const x = 0.25 + this.random()*0.5;
//         const y = 0.25 + this.random()*0.5;
//         this.target = v3_add(nextVoxel, [x, y, 0]);
//     }

//     goto(target, delta) {
//         let heading = v2_sub(target, this.actor.xyz);
//         const left = v2_magnitude(heading);
//         if (left<0.0001) {
//             this.actor.set({xyz:target});
//             this.actor.hop();
//             return true;
//         }
//         const forward = v2_normalize(heading);
//         const yaw = v2_signedAngle([0,1], forward);
//         const distance = Math.min(left, delta * this.speed / 1000);
//         const move = v2_scale(forward, distance);
//         let xyz = v3_add(this.actor.xyz, [...move,0]);
//         this.actor.set({xyz, yaw});
//         this.actor.hop();
//         return false;
//     }


// }
// WalkToBehavior.register("WalkToBehavior");

//------------------------------------------------------------------------------------------
//-- WalkBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Walks in a straight line along current facing until blocked

// class WalkBehavior extends Behavior {

//     get tickRate() { return this._tickRate || 20} // More than 15ms for smooth movement
//     get yaw() {return this.actor.yaw || 0 }
//     get speed() {return this.actor.speed || 3 }

//     do(delta) {
//         // console.log("yaw " + toDeg(this.yaw));
//         const voxels = this.service("Voxels");

//         const forward = v2_rotate([0,1], this.yaw);
//         const distance = delta * this.speed / 1000;
//         const x = forward[0] * distance;
//         const y = forward[1] * distance;

//         const level = v3_floor(v3_add(this.actor.xyz,[x,y,0]));
//         const above = v3_floor(v3_add(this.actor.xyz,[x,y,1]));
//         const below = v3_floor(v3_add(this.actor.xyz,[x,y,-1]));

//         const levelIsEmpty = voxels.get(...level) < 2;
//         const aboveIsEmpty = voxels.get(...above) < 2;
//         const belowIsEmpty = voxels.get(...below) < 2;

//         if (!Voxels.canEdit(...level)) {
//             console.log("Edge Blocked!");
//             this.fail();
//             return;
//         }

//         let z = 0;
//         if (levelIsEmpty) {
//             if (belowIsEmpty) z = -1;
//         } else {
//             if (aboveIsEmpty) {
//                 z = 1;
//             } else {
//                 console.log("Blocked!");
//                 return;
//             }
//         }

//         this.actor.xyz = v3_add(this.actor.xyz, [x,y,z]);
//         this.actor.hop();
//     }

// }
// WalkBehavior.register("WalkBehavior");

//------------------------------------------------------------------------------------------
//-- ApproachBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// class ApproachBehavior extends Behavior {

//     get target() { return this._target};
//     get distance() { return this._distance || 1};

//     onStart() {
//         this.startWalk();
//     }

//     do() {
//         if (!this.target) return;
//         const remaining = v3_magnitude(v3_sub(this.target.xyz, this.actor.xyz));
//         if (remaining < this.distance) this.walk.destroy();
//     }

//     startWalk() {
//         if (!this.target) return;
//         if (this.walk) this.walk.destroy();
//         const destination = this.target.xyz;
//         // this.aim = [...destination];
//         this.walk = this.startChild({name: "WalkToBehavior", options: {destination}});
//     }

//     onSucceed() {
//         this.succeed();
//     }

//     onFail() {
//         console.log("approach blocked!");
//         this.fail();
//     }

// }
// ApproachBehavior.register("ApproachBehavior");

// //------------------------------------------------------------------------------------------
// //-- FollowBehavior ------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// class FollowBehavior extends Behavior {

//     get target() { return this._target};
//     get distance() { return this._distance || 1};

//     onStart() {
//         this.startApproach();
//     }

//     do() {
//         if (!this.target) return;
//         const targetMove = v3_magnitude(v3_sub(this.target.xyz, this.aim));
//         if (targetMove > this.distance) this.startApproach();
//     }

//     startApproach() {
//         if (!this.target) return;
//         if (this.approach) this.approach.destroy();
//         this.aim = [...this.target.xyz];
//         this.approach = this.startChild({name: "ApproachBehavior", options: {target:this.target, distance: this.distance}});
//     }

//     onSucceed() {
//         if (this.approach) this.approach.destroy();
//     }

//     onFail() {
//         console.log("follow fail!");
//     }

// }
// FollowBehavior.register("FollowBehavior");

//------------------------------------------------------------------------------------------
//-- FleeBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// class FleeBehavior extends Behavior {

//     get target() { return this._target};
//     get distance() { return this._distance || 5};

//     onStart() {
//         this.startWalk();
//     }

//     startWalk() {
//         if (!this.target) return;
//         if (this.walk) this.walk.destroy();

//         const away = v3_sub(this.actor.xyz, this.target.xyz);
//         const range = v3_magnitude(away);
//         const extra = this.distance - Math.floor(range);

//         const paths = this.service("Paths");
//         const aim = paths.findWay(this.actor.key, away, extra);

//         const x = 0.25 + this.random()*0.5;
//         const y = 0.25 + this.random()*0.5;
//         const destination = v3_add(unpackKey(aim), [x,y,0]);

//         this.walk = this.startChild({name: "WalkToBehavior", options: {destination}});
//     }

//     onSucceed() {
//         // console.log("phew!");
//         this.succeed();
//     }

//     onFail() {
//         console.log("flee blocked!");
//         this.fail();
//     }

// }
// FleeBehavior.register("FleeBehavior");

//------------------------------------------------------------------------------------------
//-- AvoidBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// class AvoidBehavior extends Behavior {

//     get target() { return this._target};
//     get distance() { return this._distance || 3};

//     onStart() {
//         this.startFlee();
//     }

//     do() {
//         const away = v3_sub(this.actor.xyz, this.target.xyz);
//         const range = v3_magnitude(away);
//         if (range<this.distance) this.startFlee();
//     }

//     startFlee() {
//         if (!this.target) return;
//         if (this.flee) this.flee.destroy();
//         this.flee = this.startChild({name: "FleeBehavior", options: {target: this.target, distance: this.distance}});
//     }

// }
// AvoidBehavior.register("AvoidBehavior");

//------------------------------------------------------------------------------------------
//-- WalkBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves toward a target point.

class WalkBehavior extends Behavior {

    get tickRate() { return this._tickRate || 20} // More than 15ms for smooth movement

    get aim() {return this.actor.aim || [0,0] }
    get maxSpeed() {return this._maxSpeed || 3 } // m/s


    do(delta) {
        const voxels = this.service("Voxels");

        const forward = v2_normalize(this.aim);
        const yaw = v2_signedAngle([0,1], forward);
        const mag = v2_magnitude(this.aim);
        if (mag === 0) return;

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

class WalkToBehaviorX extends Behavior {

    get destination() {return this._destination}

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

        this.walk = this.startChild("WalkBehavior");

    }

    do(delta) {
        const pathStep = this.path[this.step];
        const pathVoxel = unpackKey(pathStep);
        const cc = this.actor.voxel[0] === pathVoxel[0] && this.actor.voxel[1] === pathVoxel[1];

        if (cc ) { // this can get missed
            // console.log("step");
            this.step++
            if (this.step < this.path.length) { // not at end
                const nextVoxel = unpackKey(this.path[this.step]);
                this.target = v3_add(nextVoxel, [0.5, 0.5, 0]);
            } else {
                this.target = this.destination;
            }
            this.actor.aim = v2_scale(v2_sub(this.target, this.actor.xyz), 5);
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
WalkToBehaviorX.register("WalkToBehaviorX");

//------------------------------------------------------------------------------------------
//-- FollowBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FollowBehavior extends Behavior {

    get target() { return this._target};
    get distance() { return this._distance || 2};

    onStart() {
        this.updateAim();
        this.walk = this.startChild("WalkBehavior");
    }

    do() {
        this.updateAim();
    }

    updateAim() {
        const to = v2_sub(this.target.xyz, this.actor.xyz);
        if ( v2_magnitude(to) > this.distance) {
            this.actor.aim = to;
        } else {
            this.actor.aim = [0,0];
        }
    }

    onFail() {
        console.log("follow fail!");
    }

}
FollowBehavior.register("FollowBehavior");

//------------------------------------------------------------------------------------------
//-- AvoidBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvoidBehavior extends Behavior {

    get target() { return this._target};
    get distance() { return this._distance || 2};

    onStart() {
        this.updateAim();
        this.walk = this.startChild("WalkBehavior");
    }

    do() {
        this.updateAim();
    }

    updateAim() {
        const from = v2_sub(this.actor.xyz, this.target.xyz );
        if ( v2_magnitude(from) < this.distance) {
            this.actor.aim = from;
        } else {
            this.actor.aim = [0,0];
        }
    }

    onFail() {
        console.log("avoid fail!");
    }

}
AvoidBehavior.register("AvoidBehavior");

//------------------------------------------------------------------------------------------
//-- FlockBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FlockBehavior extends Behavior {

    get range() { return this._range || 10};
    get separation() { return this._separation || 10};
    get alignment() { return this._alignment || 0.99};
    get cohesion() { return this._cohesion || 30};
    get tickRate() { return 20};

    onStart() {
        this.walk = this.startChild("SteerBehavior");
    }

    do() {
        const neighbors = this.actor.neighbors(this.range,"sheep");

        let dx = 0;
        let dy = 0;

        const toCenter = v2_sub(this.actor.flock.xyz, this.actor.xyz);

        dx += toCenter[0] * this.cohesion;
        dy += toCenter[1] * this.cohesion;

        //---------------------------

        let mx = 0;
        let my = 0;

        for( const bot of neighbors) {
            const fromBot = v2_sub(this.actor.xyz, bot.xyz);
            const range = v2_magnitude(fromBot);
            if (range<5) {
                mx += fromBot[0];
                my += fromBot[1];
            }
        }

        dx += mx * this.separation;
        dy += my * this.separation;

        //---------------------------

        let ax = 0;
        let ay = 0;
        let s = 1;

        for( const bot of neighbors) {
            ax += bot.aim[0];
            ay += bot.aim[1];
            s++;
        }

        ax = ax/s ;
        ay = ay/s;

        dx += (ax-dx) * this.alignment;
        dy += (ay-dy) * this.alignment;

        //---------------------------

        const aim = [dx, dy, 0];

        this.actor.aim = aim;


    }


}
FlockBehavior.register("FlockBehavior");

//------------------------------------------------------------------------------------------
//-- BotBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotBehavior extends Behavior {

    onStart() {
        this.startChild("GroundTestBehavior");
    }

}
BotBehavior.register("BotBehavior");

