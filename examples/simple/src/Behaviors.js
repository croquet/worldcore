import { Behavior, q_multiply, q_axisAngle, v3_normalize, v3_add, q_lookAt, v3_sub, v3_magnitude} from "@croquet/worldcore";

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
//-- GoBehavior ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Move in a straight line

class GoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get forward() {return this.actor.forward || [0,0,1]}
    get up() { return this.actor.up || [0,1,0]}

    get aim() {return this._aim || [0,0,1]}
    get speed() { return this._speed || 3}

    aimSet(a) {
        this._aim = v3_normalize(a);
        const rotation = q_lookAt(this.forward, this.up, this.aim);
        this.actor.set({rotation});
    }

    do(delta) {
        const distance = this.speed * delta / 1000;

        const x = this.aim[0] * distance;
        const y = this.aim[1] * distance;
        const z = this.aim[2] * distance;

        const translation = v3_add(this.actor.translation, [x,y,z]);

        this.actor.set({translation});

    }

}
GoBehavior.register("GoBehavior");

//------------------------------------------------------------------------------------------
//-- GotoBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves to a target point

class GotoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get forward() {return this.actor.forward || [0,0,1]}
    get up() { return this.actor.up || [0,1,0]}

    get neverSucceed() { return this._neverSucceed }
    get radius() { return this._radius || 0}
    get speed() { return this._speed || 3}
    get target() {return this._target || this.actor.translation}

    do(delta) {
        let distance = this.speed * delta / 1000;

        const to = v3_sub(this.target, this.actor.translation);
        const left = v3_magnitude(to);

        if (left < this.radius) {
            this.progress(1);
            if (!this.neverSucceed) this.succeed();
            return;
        }

        if (left<distance) {
            this.actor.set({translation:this.target});
            this.progress(1);
            if (!this.neverSucceed) this.succeed();
            return;
        }

        const aim = v3_normalize(to);
        const x = aim[0] * distance;
        const y = aim[1] * distance;
        const z = aim[2] * distance;
        const translation = v3_add(this.actor.translation, [x,y,z]);
        const rotation = q_lookAt(this.forward, this.up, aim);

        this.actor.set({translation, rotation});

    }

}
GotoBehavior.register("GotoBehavior");