import { RegisterMixin, ModelService, q_identity, v3_multiply, v3_zero, ActorManager  } from "@croquet/worldcore";

export let RAPIER;

export function RapierVersion() {
    return RAPIER.version();
}

//------------------------------------------------------------------------------------------
//-- RapierManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierManager extends ModelService {

    static async asyncStart() {
        console.log("Starting Rapier physics!");
        RAPIER = await import("@dimforge/rapier3d");
    }

    static types() {
        if (!RAPIER) return {};
        return {
            "RAPIER.World": {
                cls: RAPIER.World,
                write: world => world.takeSnapshot(),
                read:  snapshot => RAPIER.World.restoreSnapshot(snapshot)
            },
            "RAPIER.EventQueue": {
                cls: RAPIER.EventQueue,
                write: q => {},
                read:  q => new RAPIER.EventQueue(true)
            },
        };
    }

    init(options = {}) {
        super.init('RapierManager');
        console.log("Starting RapierManager");

        this.eventQueue = new RAPIER.EventQueue(true);
        this.world = new RAPIER.World(new RAPIER.Vector3(0, -0.1,0));

        console.log(this.world.gravity);

        this.timeStep = 50; // In ms
        this.world.timestep = this.timeStep / 1000;
        this.rigidBodies = new Map();

        this.future(0).tick();
    }

    destroy() {
        super.destroy();
        if (this.eventQueue) this.eventQueue.free();
        if (this.world) this.world.free();
    }


    tick() {
        // console.log("Rapier tick");
        this.world.step(this.eventQueue); // may be undefined
        this.world.forEachActiveRigidBody(rb => {
            // const h = rb.handle;
            const actor = this.rigidBodies.get(rb.handle);
            // console.log(actor);
            const t = rb.translation();
            const translation = [t.x, t.y, t.z]
            // console.log(translation);
            actor.set({translation});
            // console.log(actor.translation);
        });

        // this.world.forEachActiveRigidBodyHandle(h => {
        //     const rb = this.rigidBodies[h];
        //     const t = rb.rigidBody.translation();
        //     const r = rb.rigidBody.rotation();

        //     const v = [t.x, t.y, t.z];
        //     const q = [r.x, r.y, r.z, r.w];

        //     rb.moveTo(v);
        //     rb.say("translating", v);
        //     rb.rotateTo(q);
        // });
        // if (this.queue) {
        //     if (this.contactEventHandler) {
        //         queue.drainContactEvents((handle1, handle2, started) => {
        //             let rb1 = this.rigidBodies[handle1];
        //             let rb2 = this.rigidBodies[handle2];
        //             this.contactEventHandler.contactEvent(rb1, rb2, started);
        //         });
        //     }
        //     if (this.intersectionEventHandler) {
        //         queue.drainIntersectionEvents((handle1, handle2, intersecting) => {
        //             let rb1 = this.rigidBodies[handle1];
        //             let rb2 = this.rigidBodies[handle2];
        //             this.intersectionEventHandler.intersectionEvent(rb1, rb2, intersecting);
        //         });
        //     }
        // }

        this.future(this.timeStep).tick();
    }

}
RapierManager.register("RapierManager");


//------------------------------------------------------------------------------------------
//-- Rapier -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierDynamic = superclass => class extends superclass {

    init(options) {
        super.init(options);
        const rm =  this.service('RapierManager');
        const rbd = RAPIER.RigidBodyDesc.newDynamic()
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);
        rbd.mass = 1;
        const rb = rm.world.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle;
        rm.rigidBodies.set(this.rigidBodyHandle, this);
        // console.log(this.rigidBody);
        // console.log(this.rigidBody.mass());
        // console.log(rm.rigidBodies);
    }

    get rigidBody() {
        if (!this.$rigidBody) {
            const rm =  this.service('RapierManager');
            this.$rigidBody = rm.world.getRigidBody(this.rigidBodyHandle);
        }
        return this.$rigidBody;
    }

    destroy() {
        super.destroy();
    }

    // createRigidBody() {
    //     const rbd = RAPIER.RigidBodyDesc.dynamic()
    //     rbd.translation = new RAPIER.Vector3(...this.translation);
    //     rbd.rotation = new RAPIER.Quaternion(...this.rotation);
    //     console.log(rbd);
    // }



    // get rigidBody() {
    //     if (!this.$rigidBody) {
    //         if (this.rigidBodyHandle === undefined) return undefined;
    //         const physicsManager =  this.service('RapierPhysicsManager');
    //         this.$rigidBody = physicsManager.world.getRigidBody(this.rigidBodyHandle);
    //     }
    //     return this.$rigidBody;
    // }

    // createRigidBody(rbd) {
    //     this.removeRigidBody();
    //     rbd.translation = new RAPIER.Vector3(...this.translation);
    //     rbd.rotation = new RAPIER.Quaternion(...this.rotation);
    //     const physicsManager =  this.service('RapierPhysicsManager');
    //     this.$rigidBody = physicsManager.world.createRigidBody(rbd);
    //     this.rigidBodyHandle = this.$rigidBody.handle;
    //     physicsManager.rigidBodies[this.rigidBodyHandle] = this;

    //     if (this.rigidBody.bodyType() === RAPIER.RigidBodyType.KinematicPositionBased) {
    //         this.listen("setTranslation", this.setKinematicTranslation);
    //         this.listen("setRotation", this.setKinematicRotation);
    //         this.listen("moveTo", this.setKinematicTranslation);
    //         this.listen("rotateTo", this.setKinematicRotation);
    //     }
    // }

    // setKinematicTranslation(v) { this.rigidBody.setNextKinematicTranslation(new RAPIER.Vector3(...v)); }
    // setKinematicRotation(q) { this.rigidBody.setNextKinematicRotation(new RAPIER.Quaternion(...q)); }

    // removeRigidBody() {
    //     if (!this.rigidBody) return;
    //     const physicsManager = this.service('RapierPhysicsManager');
    //     physicsManager.rigidBodies[this.rigidBodyHandle] = undefined;
    //     physicsManager.world.removeRigidBody(this.rigidBody);
    //     this.rigidBodyHandle = undefined;
    //     this.$rigidBody = undefined;
    // }

    // createCollider(cd) {
    //     const physicsManager = this.service('RapierPhysicsManager');
    //     const c = physicsManager.world.createCollider(cd, this.rigidBodyHandle);
    //     return c.handle;
    // }

};
RegisterMixin(AM_RapierDynamic);
