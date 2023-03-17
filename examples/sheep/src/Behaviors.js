import { Behavior, q_multiply, q_axisAngle, v3_sub, v3_magnitude, v3_normalize, v3_add} from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// Behaviors -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SpinBehavior extends Behavior {

    get axis() {return this._axis || [0,1,0]}
    get speed() {return this._speed || 1}

    do(delta) {
        const q = q_axisAngle(this.axis, 0.13 * delta * this.speed / 50);
        const rotation = q_multiply(this.actor.rotation, q);
        this.actor.set({rotation});
    }

}
SpinBehavior.register("SpinBehavior");

//------------------------------------------------------------------------------------------
//-- GotoBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves toward a target point

class GotoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get target() {return this._target || this.actor.xyz}
    set target(target) {this.set({target})};
    get speed() { return this._speed || 3}

    do(delta) {
        let distance = this.speed * delta / 1000;

        const to = v3_sub(this.target, this.actor.translation);
        const left = v3_magnitude(to)
        if (distance>left) {
            this.actor.set({translation:this.target});
            // this.progress(1);
            console.log("done!");
            this.succeed();
            return;
        }

        const forward = v3_normalize(to);
        // const yaw = v2_signedAngle([0,1], forward);

        const x = forward[0] * distance;
        const y = 0;
        const z = forward[2] * distance;

        let translation = v3_add(this.actor.translation, [x,y,z]);

        this.actor.set({translation});

    }

}
GotoBehavior.register("GotoBehavior");

