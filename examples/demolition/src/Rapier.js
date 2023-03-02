import { RegisterMixin, ModelService, q_identity, v3_multiply, v3_zero, v3_sub, v3_scale, ActorManager, q_axisAngle, WorldcoreModel, Actor  } from "@croquet/worldcore";

export let RAPIER;

export function RapierVersion() {
    return RAPIER.version();
}

//------------------------------------------------------------------------------------------
//-- RapierManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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

    init(options) {
        super.init('RapierManager');
    }

}
RapierManager.register("RapierManager");

//------------------------------------------------------------------------------------------
//-- AM_RapierWorld ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_RapierWorld = superclass => class extends superclass {

    init(options) {
        super.init(options)
        this.queue = new RAPIER.EventQueue(true);
        this.world = new RAPIER.World(new RAPIER.Vector3(...this.gravity));
        this.world.timestep = this.timeStep / 1000;
        this.rigidBodyActors = new Map();
        this.future(0).tick();
    }

    destroy() {
        super.destroy();
        this.queue.free();
        this.world.free();
    }

    get timeStep() {return this._timeStep || 50}
    get gravity() {return this._gravity || [0,-9.8,0]}

    createRigidBody(actor, rbd) {
        const rb = this.world.createRigidBody(rbd);
        this.rigidBodyActors.set(rb.handle, actor);
        return rb.handle;
    }

    getRigidBody(handle) {
        return this.world.getRigidBody(handle);
    }

    destroyRigidBody(handle) {
        const rb = this.getRigidBody(handle);
        this.world.removeRigidBody(rb);
        this.rigidBodyActors.set(handle, null);
    }

    tick() {
        if (this.doomed) return;
        this.world.step(this.queue);
        this.world.forEachActiveRigidBody(rb => {
            const actor = this.rigidBodyActors.get(rb.handle);
            const t = rb.translation();
            const r = rb.rotation();
            const translation = [t.x, t.y, t.z];
            if (actor.accelerometer) {
                const velocity = v3_scale(v3_sub(translation, actor.translation), 1000/this.timeStep);
                let  acceleration = v3_scale(v3_sub(velocity, actor.velocity), 1000/this.timeStep);
                acceleration = v3_sub(acceleration, this.gravity);
                actor.set({acceleration,velocity});
                actor.accelerometer();
            }
            const rotation = [r.x, r.y, r.z, r.w]
            actor.set({translation, rotation});
        });
        if (!this.doomed) this.future(this.timeStep).tick();
    }

}
RegisterMixin(AM_RapierWorld);

//------------------------------------------------------------------------------------------
//-- AM_RapierRigidBody --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_RapierRigidBody = superclass => class extends superclass {

    init(options) {
        super.init(options);
        this.worldActor = this.getWorldActor();
    }

    destroy() { 
        super.destroy();
        this.worldActor.destroyRigidBody(this.rigidBodyHandle);   
    }

    getWorldActor() {
        let actor = this;
        do {
            if (actor.world) return actor;
            actor = actor.parent;
        } while (actor);
        console.error("AM_RapierRigidBody must have an AM_RapierWorld parent");
    }

    get rigidBody() {
        if (!this.$rigidBody) this.$rigidBody = this.worldActor.getRigidBody(this.rigidBodyHandle);
        return this.$rigidBody;
    }

    createCollider(cd) {
        this.worldActor.world.createCollider(cd, this.rigidBody);
    }
}
RegisterMixin(AM_RapierRigidBody);

//------------------------------------------------------------------------------------------
//-- AM_RapierDynamicRigidBody ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_RapierDynamicRigidBody = superclass => class extends AM_RapierRigidBody(superclass) {

    get velocity() { return this._velocity || [0,0,0]}
    get acceleration() { return this._acceleration || [0,0,0]}

    init(options) {
        super.init(options);
        const rbd = RAPIER.RigidBodyDesc.newDynamic()
        rbd.setCcdEnabled(true);
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);
        rbd.mass = 1;

        this.rigidBodyHandle = this.worldActor.createRigidBody(this, rbd);
    }

};
RegisterMixin(AM_RapierDynamicRigidBody);

//------------------------------------------------------------------------------------------
//-- AM_RapierStaticRigidBody ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_RapierStaticRigidBody = superclass => class extends AM_RapierRigidBody(superclass) {

    init(options) {
        super.init(options);
        const rbd = RAPIER.RigidBodyDesc.newStatic();
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);

        this.rigidBodyHandle = this.worldActor.createRigidBody(this, rbd);
    }

};
RegisterMixin(AM_RapierStaticRigidBody);
