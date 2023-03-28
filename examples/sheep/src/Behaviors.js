import { Behavior, q_multiply, q_axisAngle, v3_sub, v3_magnitude, v3_normalize, v3_add, v3_floor, v3_scale, Constants, v3_distance, v2_random, q_lookAt} from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- SpreadBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SpreadBehavior extends Behavior {

    get radius() { return this._radius || 1};

    onStart() {
        this.tickRate = 500;
    }

    do() {
        const bot = this.actor.pingClosest("bot", 3)
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
            if (this.actor.isBlocked(from)) return;
            const translation = v3_add(this.actor.translation, from);
            this.actor.set({translation});
        }
    }


}
SpreadBehavior.register("SpreadBehavior");

