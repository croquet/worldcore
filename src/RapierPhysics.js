import { Model } from "@croquet/croquet";
import { RegisterMixin } from "./Mixins";

let RAPIER;

//------------------------------------------------------------------------------------------
//-- RapierPhysicsManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierPhysicsManager extends Model {

    init() {
        super.init();
        this.beWellKnownAs('RapierPhysicsManager');
        // this.world = new RAPIER.World(0.0, -9.81, 0.0);
    }

    destroy() {
        super.destroy();
    }


}
RapierPhysicsManager.register("RapierPhysicsManager");


//------------------------------------------------------------------------------------------
//-- RapierPhysics --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The player actor is automatically created whenever a player joins. You should only ever
// declare one actor as the player actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierPhysics = superclass => class extends superclass {

    // static register(...args) {
    //     super.register(...args);
    //     if (PlayerManager.playerType) (console.warn("Multiple player actors declared!!"));
    //     PlayerManager.playerType = this;
    // }

    init(...arg) {
        super.init(...arg);

    }


};
RegisterMixin(AM_RapierPhysics);
