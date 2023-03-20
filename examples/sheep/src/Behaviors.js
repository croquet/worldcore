import { Behavior, q_multiply, q_axisAngle, v3_sub, v3_magnitude, v3_normalize, v3_add, v3_floor, v3_scale, Constants, v3_distance, v2_random, q_lookAt} from "@croquet/worldcore";
import { packKey, unpackKey } from "./Paths";

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

    get target() {return this._target || this.actor.xyz}
    set target(target) {this.set({target})};
    get speed() { return this._speed || 3}

    onStart() {
        this.aim = v3_normalize(v3_sub(this.target, this.actor.translation));
        const rotation = q_lookAt([0,0,1], [0,1,0], this.aim);
        this.actor.set({rotation});
    }

    do(delta) {
        let distance = this.speed * delta / 1000;

        const forward = this.aim;
        // const yaw = v2_signedAngle([0,1], forward);

        const x = forward[0] * distance;
        const y = 0;
        const z = forward[2] * distance;

        let translation = v3_add(this.actor.translation, [x,y,z]);

        this.actor.set({translation});

    }

}
GoBehavior.register("GoBehavior");

//------------------------------------------------------------------------------------------
//-- GotoBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves to a target point

class GotoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 80} // More than 15ms for smooth movement
    get stop() { return this._stop } // Stop at the target
    get radius() { return this._radius || 0}


    get target() {return this._target || this.actor.translation}
    set target(target) {this.set({target})};
    get speed() { return this._speed || 3}

    do(delta) {
        let distance = this.speed * delta / 1000;

        const to = v3_sub(this.target, this.actor.translation);
        const left = v3_magnitude(to);

        if (left < this.radius) {
            this.progress(1);
            if (this.stop) this.succeed();
            return;
        }

        if (distance>left) {
            this.actor.set({translation:this.target});

            this.progress(1);
            if (this.stop) this.succeed();
            return;
        }

        const forward = v3_normalize(to);
        const rotation = q_lookAt([0,0,1], [0,1,0], forward);

        const x = forward[0] * distance;
        const y = 0;
        const z = forward[2] * distance;

        let translation = v3_add(this.actor.translation, [x,y,z]);

        this.actor.set({translation, rotation});

    }

}
GotoBehavior.register("GotoBehavior");

//------------------------------------------------------------------------------------------
//-- WalkToBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WalkToBehavior extends Behavior {

    get destination() {return this._destination}
    get speed() { return this._speed || 3}
    get radius() { return this._radius || 0}


    onStart() {
        this.tickRate = 500;
        const paths = this.service("Paths");
        const endCell = v3_floor(v3_scale(this.destination, 1/Constants.scale));
        endCell[1] = 1;
        const endKey = packKey(...endCell);
        this.path = paths.findPath(this.actor.key, endKey);

        if (this.path.length === 0) { // No path to destination
            console.log("no path!")
            this.fail();
            return;
        }

        const speed = this.speed;
        this.step = 0;

        if (this.path.length === 1) {
            console.log("short!");
            this.goto = this.start({name: "GotoBehavior", speed, target: this.destination, stop: true});
        } else {
            this.goto = this.start({name: "GotoBehavior", speed});
            this.nextStep();
        }

    }

    nextStep() {
        this.step++
        if (this.step === this.path.length) { // at end
            this.goto.set({target: this.destination, radius: this.radius});
        } else {
            const nextCell = unpackKey(this.path[this.step]);
            nextCell[0] += 0.25 + this.random()*0.5;
            nextCell[1] = 0;
            nextCell[2] += 0.25 + this.random()*0.5;
            // nextCell[0] += 0.5;
            // nextCell[1] = 0;
            // nextCell[2] += 0.5;
            const target = v3_scale(nextCell, Constants.scale);
            this.goto.set({target})
        }
    }

    onProgress(child) {

        if (this.step<this.path.length) {
            this.nextStep();
            this.progress(this.step/this.path.length);
        } else {
            this.succeed();
        }
    }

    do() {
        const range = v3_distance(this.destination, this.actor.translation);
        if (range < this.radius) this.succeed();
    }

    onFail() {
        console.log("Goto fail!");
    }

    onSucceed() {
        console.log("Short success!");
        this.succeed();
    }

}
WalkToBehavior.register("WalkToBehavior");

//------------------------------------------------------------------------------------------
//-- CohereBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class CohereBehavior extends Behavior {

    get radius() { return this._radius || 1};

    onStart() {
        if(!this.actor.flock) return;
        this.tickRate = 100;
        this.center = this.actor.flock.xyz;
        const destination = this.center;
        this.start({name: "WalkToBehavior", speed: 3.2, destination});
    }

    do() {
        const range = v3_distance(this.center, this.actor.translation);
        if (range < this.radius) this.kill("WalkToBehavior");
    }

}
CohereBehavior.register("CohereBehavior");

//------------------------------------------------------------------------------------------
//-- SpreadBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SpreadBehavior extends Behavior {

    get radius() { return this._radius || 1};

    onStart() {
        this.tickRate = 200;
    }

    do() {
        const bot = this.actor.closest(1,"bot")
        if (!bot) return;

        const from = v3_sub(this.actor.translation, bot.translation);
        const mag = v3_magnitude(from);
        if (mag===0) {
            const a = Math.random() * 2 * Math.PI;
            from[0] = this.radius * Math.cos(a);
            from[1] = 0;
            from[2] = this.radius* Math.sin(a);
        } else {
            from[0] = this.radius * from[0] / mag;
            from[1] = this.radius * from[1] / mag;
            from[2] = this.radius * from[2] / mag;
        }

        if (mag < this.radius){
            const translation = v3_add(this.actor.translation, from);
            this.actor.set({translation});
        }
    }


}
SpreadBehavior.register("SpreadBehavior");

