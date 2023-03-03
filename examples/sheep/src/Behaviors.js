import { Behavior, q_multiply, q_axisAngle} from "@croquet/worldcore";

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

