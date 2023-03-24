import { Behavior, q_multiply, q_axisAngle, v3_normalize, v3_add, q_lookAt, v3_sub, v3_magnitude} from "@croquet/worldcore";

// //------------------------------------------------------------------------------------------
// // Behaviors -------------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class SpinBehavior extends Behavior {

//     get axis() {return this._axis || [0,1,0]}
//     get speed() {return this._speed || 1}

//     do(delta) {
//         const q = q_axisAngle(this.axis, 0.13 * delta * this.speed / 50);
//         const rotation = q_multiply(this.actor.rotation, q);
//         this.actor.set({rotation});
//     }

// }
// SpinBehavior.register("SpinBehavior");

// //------------------------------------------------------------------------------------------
// //-- GoBehavior ----------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// // Move in a straight line

// class GoBehavior extends Behavior {

//     get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

//     get aim() {return this._aim || [0,0,1]}
//     get speed() { return this._speed || 3}

//     aimSet(a) {
//         this._aim = v3_normalize(a);
//         const rotation = q_lookAt(this.actor.forward, this.actor.up, this.aim);
//         this.actor.set({rotation});
//     }

//     do(delta) {
//         const distance = this.speed * delta / 1000;

//         const x = this.aim[0] * distance;
//         const y = this.aim[1] * distance;
//         const z = this.aim[2] * distance;

//         const translation = v3_add(this.actor.translation, [x,y,z]);

//         this.actor.set({translation});

//     }

// }
// GoBehavior.register("GoBehavior");

// //------------------------------------------------------------------------------------------
// //-- GotoBehavior --------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// // Moves to a target point

// class GotoBehavior extends Behavior {

//     get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

//     get radius() { return this._radius || 0}
//     get speed() { return this._speed || 3}
//     get target() {return this._target || this.actor.translation}

//     do(delta) {
//         let distance = this.speed * delta / 1000;

//         const to = v3_sub(this.target, this.actor.translation);
//         const left = v3_magnitude(to);

//         if (left < this.radius) {
//             this.succeed();
//             return;
//         }

//         if (left<distance) {
//             this.actor.set({translation:this.target});
//             this.succeed();
//             return;
//         }

//         const aim = v3_normalize(to);

//         let x = aim[0] * distance;
//         let y = aim[1] * distance;
//         let z = aim[2] * distance;

//         const translation = v3_add(this.actor.translation, [x,y,z]);
//         const rotation = q_lookAt(this.actor.forward, this.actor.up, aim);

//         this.actor.set({translation, rotation});

//     }

// }
// GotoBehavior.register("GotoBehavior");

// //------------------------------------------------------------------------------------------
// //-- PathToBehavior ------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// class PathToBehavior extends Behavior {

//     get target() {return this._target}
//     get speed() { return this._speed || 3}
//     get radius() { return this._radius || 0}
//     get noise() { return this._noise || 0}

//     onStart() {
//         if (!this.actor.parent || !this.actor.parent.isNavGrid) {
//             console.warn("PathToBehavior must be used on a NavGrid");
//             this.fail();
//         }

//         const grid = this.actor.parent;
//         const startKey = this.actor.navKey;
//         const endKey = grid.packNavKey(... this.target);

//         this.path = grid.findPath(startKey, endKey);

//         if (this.path.length === 0) { // No path to destination
//             console.log("no path!")
//             this.fail();
//             return;
//         }

//         this.step = 0;

//         if (this.path.length === 1) {
//             this.goto = this.start({name: "GotoBehavior", speed: this.speed, target: this.target});
//         } else {
//             this.goto = this.start({name: "GotoBehavior", speed: this.speed, neverSucceed: true});
//             this.nextStep();
//         }

//     }

//     nextStep() {
//         this.step++
//         if (this.step >  this.path.length-2) { // at end
//             this.goto.set({target: this.target, radius: this.radius});
//         } else {
//             const grid = this.actor.parent;
//             const target = grid.unpackNavKey(this.path[this.step]);
//             this.correctHeight(target);
//             this.addNoise(target);
//             this.goto.set({target})
//         }
//     }

//     correctHeight(xyz) {
//         switch (this.actor.parent.gridPlane) {
//             default:
//             case 0: xyz[1] = this.actor.translation[1]; break;
//             case 1: xyz[2] = this.actor.translation[2]; break;
//             case 2: xyz[0] = this.actor.translation[0]; break;
//         }
//     }

//     addNoise(xyz) {
//         const grid = this.actor.parent;
//         const s = grid.gridScale;
//         const n = this.noise/2;
//         let x =0.5;
//         let y =0.5;
//         if (n) {
//             x = (0.5-n/2) + n*this.random()
//             y = (0.5-n/2) + n*this.random()
//         }

//         switch (grid.gridPlane) {
//             default:
//             case 0: xyz[0] += x*s; xyz[2] += y*s; break;
//             case 1: xyz[0] += x*s; xyz[1] += y*s; break;
//             case 2: xyz[1] += x*s; xyz[2] += y*s; break;
//         }
//     }

//     onProgress() {
//         if (this.step<this.path.length) {
//             this.nextStep();
//             this.progress(this.step/this.path.length);
//         } else {
//             this.progress(1);
//             this.succeed();
//         }
//     }

//     onFail() {
//         this.fail();

//     }

//     onSucceed() {
//         this.succeed();
//     }

// }
// PathToBehavior.register("PathToBehavior");