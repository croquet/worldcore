import { Model } from "@croquet/croquet";
import { RegisterMixin } from "./Mixins";
import { q_axisAngle, toRad } from "./Vector";

let RAPIER;

async function load() {
    console.log("Loading Rapier physics ...");
    RAPIER = await import("@dimforge/rapier3d");
    console.log("Rapier physics loaded ...");
}

load();

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
                read:  snapshot => RAPIER.World.restoreSnapshot(snapshot)
            }
        };
    }

    init() {
        super.init();
        console.log("Starting rapier physics");
        this.beWellKnownAs('RapierPhysicsManager');
        this.world = new RAPIER.World(0.0, -10, 0.0);
        this.timeStep = 50; // In ms
        this.world.timestep = this.timeStep / 1000;
        this.future(0).tick();
    }

    destroy() {
        super.destroy();
        this.world = null;
    }

    tick() {
        this.world.step();
        this.future(this.timeStep).tick();
    }

}
RapierPhysicsManager.register("RapierPhysicsManager");


//------------------------------------------------------------------------------------------
//-- RapierPhysics -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierPhysics = superclass => class extends superclass {

    init(...arg) {
        super.init(...arg);

        const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        const rbd = new RAPIER.RigidBodyDesc('dynamic');

        const rb = physicManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle();

        const cdBall = RAPIER.ColliderDesc.ball(0.5);
        cdBall.density = 1;

        const cdBox = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        cdBox.density = 1;
        const c = rb.createCollider(cdBox);

    }

    get rigidBody() {
        if  (!this.$rigidBody) {
            const physicsManager = this.wellKnownModel('RapierPhysicsManager');
            this.$rigidBody = physicsManager.world.getRigidBody(this.rigidBodyHandle);
        }
        return this.$rigidBody
    }

    destroy() {
        super.destroy();
        const physicsManager = this.wellKnownModel('RapierPhysicsManager');
        physicsManager.world.removeRigidBody(this.rigidBody);
    }


};
RegisterMixin(AM_RapierPhysics);

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierPhysicsStatic = superclass => class extends superclass {

    init(...arg) {
        super.init(...arg);

        const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        const rbd = new RAPIER.RigidBodyDesc('static');
        rbd.setTranslation(0,-3,0);

        const rb = physicManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle();

        const cdBall = RAPIER.ColliderDesc.ball(0.5);
        cdBall.density = 1;

        const cdBox = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        cdBox.density = 1;
        const c = rb.createCollider(cdBox);

    }

    get rigidBody() {
        if  (!this.$rigidBody) {
            const physicsManager = this.wellKnownModel('RapierPhysicsManager');
            this.$rigidBody = physicsManager.world.getRigidBody(this.rigidBodyHandle);
        }
        return this.$rigidBody
    }

    destroy() {
        super.destroy();
        const physicsManager = this.wellKnownModel('RapierPhysicsManager');
        physicsManager.world.removeRigidBody(this.rigidBody);
    }


};
RegisterMixin(AM_RapierPhysicsStatic);


