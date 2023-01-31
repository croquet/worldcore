import { RegisterMixin, ModelService, q_identity, v3_multiply, v3_zero, ActorManager, q_axisAngle, WorldcoreModel, Actor  } from "@croquet/worldcore";

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
        console.log("Starting RapierManager");
        console.log(RAPIER.version());
        this.worlds = new Map();

        this.createWorld({ name: "default", gravity:[0,-9.8,0]});
        this.createWorld({ name: "bob", gravity:[0,-0.8,0]});
    }

    createWorld(options = {}) {
        options.name = options.name || "default";
        const world = RapierWorld.create(options);
        this.worlds.set(options.name, world);
        return world;
    }

    getWorld(name) {
        if (!this.worlds.has(name)) {
            console.error( name + " is not a valid physics world! Using the default world instead")
            name = "default";
        }
        return this.worlds.get(name)
    }

    destroy() {
        super.destroy();
        this.worlds.forEach(world => world.destroy());
    }


}
RapierManager.register("RapierManager");

//------------------------------------------------------------------------------------------
//-- RapierWorld ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierWorld extends Actor {

    init(options) {
        super.init(options)
        console.log("New Rapier world: " + options.name);
        console.log(this.gravity);
        this.q = new RAPIER.EventQueue(true);
        this.w = new RAPIER.World(new RAPIER.Vector3(...this.gravity));
        this.w.timestep = this.timeStep / 1000;
        this.rigidBodies = new Map();
        this.future(0).tick();
    }

    get timeStep() {return this._timeStep || 50}
    get gravity() {return this._gravity || [0,-0.5,0]}

    destroy() {
        super.destroy();
        this.q.free();
        this.w.free();
    }

    tick() {
        if (this.doomed) return;
        this.w.step(this.q);
        this.w.forEachActiveRigidBody(rb => {
            const actor = this.rigidBodies.get(rb.handle);
            const t = rb.translation();
            const r = rb.rotation();
            const translation = [t.x, t.y, t.z];
            const rotation = [r.x, r.y, r.z, r.w]
            actor.set({translation, rotation});
        });
        if (!this.doomed) this.future(this.timeStep).tick();
    }

}
RapierWorld.register("RapierWorld");

//------------------------------------------------------------------------------------------
//-- AM_Rapier -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Rapier = superclass => class extends superclass {

    destroy() {
        super.destroy();
        if (this.rigidBody) {
            this.myWorld.removeRigidBody(this.rigidBody);
            this.myWorld.rigidBodies.set(this.rigidBodyHandle, null);
        }  
    }

    get world() { return this._world || "default"}
    get myWorld() { return this.service('RapierManager').getWorld(this.world) }

    get rigidBody() {
        if (!this.$rigidBody) this.$rigidBody = this.myWorld.w.getRigidBody(this.rigidBodyHandle);
        return this.$rigidBody;
    }

    createCollider(cd){
        return this.myWorld.w.createCollider(cd, this.rigidBody);
    }

}
RegisterMixin(AM_Rapier);

//------------------------------------------------------------------------------------------
//-- AM_RapierDynamic ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_RapierDynamic = superclass => class extends AM_Rapier(superclass) {

    init(options) {
        super.init(options);
        const rm =  this.service('RapierManager');
        const rbd = RAPIER.RigidBodyDesc.newDynamic()
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);

        const rb = this.myWorld.w.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle;
        this.myWorld.rigidBodies.set(this.rigidBodyHandle, this);
    }

};
RegisterMixin(AM_RapierDynamic);

//------------------------------------------------------------------------------------------
//-- AM_RapierStatic ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_RapierStatic = superclass => class extends AM_Rapier(superclass) {

    init(options) {
        super.init(options);
        const rm =  this.service('RapierManager');
        const rbd = RAPIER.RigidBodyDesc.newStatic()
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);

        const rb = this.myWorld.w.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle;
        this.myWorld.rigidBodies.set(this.rigidBodyHandle, this);
    }

};
RegisterMixin(AM_RapierStatic);
