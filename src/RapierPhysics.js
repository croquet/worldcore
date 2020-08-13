import { Model } from "@croquet/croquet";
import { RegisterMixin } from "./Mixins";

let RAPIER;

// export async function LoadRapier() {
//     RAPIER = await import("@dimforge/rapier3d");
// }

//------------------------------------------------------------------------------------------
//-- RapierPhysicsManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierPhysicsManager extends Model {

    static types() {
        return {
            "RAPIER.World": {
                cls: RAPIER.World,
                write: world => world.takeSnapshot(),
                read: snapshot => {
                    const world = RAPIER.World.restoreSnapshot(snapshot);
                    // // provide a mapping solely for use in reading objects
                    // world._bodyMap = new Map();
                    // world._colliderMap = new Map();
                    // // world._jointMap = new Map();
                    // world.forEachRigidBody(body => { body.world = world; world._bodyMap.set(body.handle(), body); });
                    // world.forEachCollider(collider => { collider.world = world; world._colliderMap.set(collider.handle(), collider); });
                    // // world.forEachJoint(joint => { joint.world = world; world._jointMap.set(joint.handle(), joint); });
                    return world;
                },
            }
        };
    }

    init(rrr) {
        super.init();
        console.log("Starting rapier physics");
        RAPIER = rrr;
        this.beWellKnownAs('RapierPhysicsManager');
        this.world = new RAPIER.World(0.0, -9.81, 0.0);

        const rbd = new RAPIER.RigidBodyDesc('static');
        rbd.setTranslation(0, 100, 0);
        console.log(rbd);


        const rb0 = this.world.createRigidBody(rbd);
        console.log(rb0);
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
