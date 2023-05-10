import { Behavior, q_multiply, q_axisAngle, v3_sub, v3_magnitude, v3_normalize, v3_add, v3_floor, v3_scale, Constants, v3_distance, v2_random, q_lookAt,
v2_sub, v2_magnitude, v2_add} from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- SpreadBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SpreadBehavior extends Behavior {

    get radius() { return this._radius || 1}

    onStart() {
        this.tickRate = 100;
    }

    do() {
        const bots = this.actor.pingAll("bot", 1);
        if (bots.length===0) return;
        bots.forEach(bot => this.flee(bot));
    }

    flee(bot) {
        const from = v2_sub(this.actor.xy, bot.xy);
        const mag = v2_magnitude(from);
        if (mag > this.radius) return;
        if (mag===0) {
            const a = Math.random() * 2 * Math.PI;
            from[0] = this.radius * Math.cos(a);
            from[2] = this.radius* Math.sin(a);
        } else {
            from[0] = this.radius * from[0] / mag;
            from[2] = this.radius * from[2] / mag;
        }

        if (this.actor.isBlocked(from)) return;
        const xy = v2_add(this.actor.xy, from);
        this.actor.set({xy});
    }


}
SpreadBehavior.register("SpreadBehavior");

//------------------------------------------------------------------------------------------
//-- FollowBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FollowBehavior extends Behavior {

    get target() { return this._target}
    get distance() { return this._distance || 3}

    onStart() {
        this.tickRate = 100;
    }

    do() {
        const bots = this.actor.pingAll("bot", 1);
        if (bots.length===0) return;
        bots.forEach(bot => this.flee(bot));
    }

    flee(bot) {
        const from = v2_sub(this.actor.xy, bot.xy);
        const mag = v2_magnitude(from);
        if (mag > this.radius) return;
        if (mag===0) {
            const a = Math.random() * 2 * Math.PI;
            from[0] = this.radius * Math.cos(a);
            from[2] = this.radius* Math.sin(a);
        } else {
            from[0] = this.radius * from[0] / mag;
            from[2] = this.radius * from[2] / mag;
        }

        if (this.actor.isBlocked(from)) return;
        const xy = v2_add(this.actor.xy, from);
        this.actor.set({xy});
    }


}
FollowBehavior.register("FollowBehavior");

