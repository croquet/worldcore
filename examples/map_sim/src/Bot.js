import { Actor, Pawn, mix, PM_ThreeVisible, THREE, AM_Smoothed, PM_Smoothed, PM_Widget3, BoxWidget3, FocusWidget3, viewRoot, AM_Behavioral, Behavior, v2_sub, v2_normalize, v2_scale, v2_magnitude, q_axisAngle, toRad, toDeg, SequenceBehavior  } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
//-- Behaviors -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PickDestinationBehavior extends Behavior {

    init(options) {
        super.init(options);
        const paths = this.service("Paths");
        const destination = paths.randomNode();
        this.succeed(destination);
    }

}
PickDestinationBehavior.register("PickDestinationBehavior");

//------------------------------------------------------------------------------------------

class WalkToBehavior extends Behavior {

    init(options) {
        super.init(options);

        const paths = this.service("Paths");

        this.path = paths.findPath(this.actor.town, this.destination);
        this.step = 1;
        if (this.path.length === 0) this.fail() // No path to destination
        if (this.path.length === 1) this.succeed() // already there

    }

    get destination() { return this._destination;  }

    do(delta) {

        const speed = 0.003;

        if (this.step >= this.path.length) {
            this.succeed();
            return;
        }
        const next = this.path[this.step];

        const paths = this.service("Paths");
        const nextXY = paths.getNode(next).xy;
        const xyz = this.actor.translation;
        const xy = [xyz[0], xyz[2]];

        const remaining = v2_sub(nextXY, xy);
        if (v2_magnitude(remaining) < 0.2) { // xxx
            this.actor.translateTo([nextXY[0], 0, nextXY[1]]);
            this.actor.town = next;
            this.step += 1;
            return;
        }

        let  forward = v2_normalize(remaining);
        const move = v2_scale(forward, speed * delta);

        let angle = 0;
        if (forward[0] < 0) {
            angle = Math.acos(-forward[1])
        } else {
            angle = -Math.acos(-forward[1])
        }

        this.actor.rotateTo(q_axisAngle([0,1,0], angle));
        this.actor.translateTo([xyz[0] + move[0], 0, xyz[2] + move[1]]);
    }

}
WalkToBehavior.register("WalkToBehavior");

//------------------------------------------------------------------------------------------

class WanderBehavior extends Behavior {

    init(options) {
        super.init(options);
        this.startChild(PickDestinationBehavior);
    }

    onSucceed(child, data) {
        if (child instanceof PickDestinationBehavior) {
            this.startChild(WalkToBehavior, {destination: data});
        }

        if (child instanceof WalkToBehavior) {
            this.startChild(PickDestinationBehavior);
        }
    }
}
WanderBehavior.register("WanderBehavior");

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {
    get pawn() {return BotPawn}

    init(options) {
        super.init(options);
        this.goHome();
        this.startBehavior(WanderBehavior);
    }

    get home() { return this._home}

    goHome() {
        const paths = this.service("Paths");
        const xy = paths.getNode(this.home).xy;
        this.set({translation: [xy[0],0,xy[1]]});
        this.town = this.home;
    }

}
BotActor.register('BotActor');

//------------------------------------------------------------------------------------------
//-- BotPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class BotPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Widget3) {
    constructor(...args) {
        super(...args);

        this.focus = new FocusWidget3({parent:this.rootWidget, name:"bot"});
        this.widget = new BoxWidget3({parent:this.focus, collidable: true, size:[1,2], thick: 1, translation: [0,1,0], color: [0.5, 0.25, 0.1]});
        this.widget.mesh.castShadow = true;

        this.focus.onFocus = () => { viewRoot.hiliteMesh(this.widget.mesh) };
        this.focus.onBlur = () => { viewRoot.hiliteMesh(null) };

    }


}