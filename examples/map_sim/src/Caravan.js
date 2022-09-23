import { Actor, Pawn, mix, PM_ThreeVisible, THREE, AM_Smoothed, PM_Smoothed, PM_Widget3, BoxWidget3, FocusWidget3, viewRoot, AM_Behavioral, Behavior, v2_sub, v2_normalize, v2_scale, v2_magnitude, q_axisAngle, toRad, toDeg, SequenceBehavior, ModelService  } from "@croquet/worldcore";

import { BotActor, WalkTo } from "./Bot";

//------------------------------------------------------------------------------------------
//-- CaravanManager ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CaravanManager extends ModelService {
    init() {
        super.init("CaravanManager");
        this.caravans = new Map();
    }

    createCaravan(name, home) {
        const old = this.caravans.get(name);
        if (old) old.destroy();
        const caravan = CaravanActor.create({name, home});
        this.caravans.set(name, caravan);
    }
}
CaravanManager.register("CaravanManager")

//------------------------------------------------------------------------------------------
//-- CaravanActor --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CaravanBehavior extends Behavior {

    init(options) {
        super.init(options);

        const paths = this.service("Paths");
        const destination = paths.randomNode();
        this.startChild(WalkTo, {destination, speed: 0.003});

    }

    onSucceed(child, data) {

        if (child instanceof WalkTo) {
            const paths = this.service("Paths");
            const destination = paths.randomNode();
            this.startChild(WalkTo, {destination, speed: 0.003});
        }
    }
}
CaravanBehavior.register("CaravanBehavior");

//------------------------------------------------------------------------------------------

export class CaravanActor extends BotActor {

    init(options) {
        super.init(options);
        this.startBehavior(CaravanBehavior);
    }

}
CaravanActor.register("CaravanActor");