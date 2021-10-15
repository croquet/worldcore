import { RegisterMixin, ModelService, q_identity, v3_multiply, v3_zero  } from "@croquet/worldcore-kernel";

export let RAPIER;

export function RapierVersion() {
    return RAPIER.version();
}

//------------------------------------------------------------------------------------------
//-- RapierPhysicsManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierPhysicsManager extends ModelService {

    static async asyncStart() {
        console.log("Starting Rapier physics!");
        RAPIER = await import("@dimforge/rapier3d");
    }

    static types() {
        return {
            "RAPIER.World": {
                cls: RAPIER.World,
                write: world => world.takeSnapshot(),
                read:  snapshot => RAPIER.World.restoreSnapshot(snapshot)
            }
        };
    }

    init(options = {}) {
        super.init('RapierPhysicsManager');

        const gravity = options.gravity || [0.0, -9.8, 0.0];
        const timeStep = options.timeStep || 50; // In ms

        const g = new RAPIER.Vector3(...gravity);
        this.world = new RAPIER.World(g);

        this.timeStep = timeStep;
        this.world.timestep = this.timeStep / 1000;
        this.rigidBodies = [];
        this.future(0).tick();
    }

    destroy() {
        super.destroy();
        this.world.free();
        this.world = null;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    tick() {
        if (!this.isPaused) {
            this.world.step();
            this.world.forEachActiveRigidBodyHandle(h => {
                const rb = this.rigidBodies[h];
                const t = rb.rigidBody.translation();
                const r = rb.rigidBody.rotation();

                const v = [t.x, t.y, t.z];
                const q = [r.x, r.y, r.z, r.w];

                rb.moveTo(v);
                rb.rotateTo(q);
            });
        }
        this.future(this.timeStep).tick();
    }

}
RapierPhysicsManager.register("RapierPhysicsManager");


//------------------------------------------------------------------------------------------
//-- RapierPhysics -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierPhysics = superclass => class extends superclass {

    destroy() {
        this.removeRigidBody();
        super.destroy();
    }

    get rigidBody() {
        if (!this.$rigidBody) {
            if (this.rigidBodyHandle === undefined) return undefined;
            const physicsManager =  this.service('RapierPhysicsManager');
            this.$rigidBody = physicsManager.world.getRigidBody(this.rigidBodyHandle);
        }
        return this.$rigidBody;
    }

    createRigidBody(rbd) {
        this.removeRigidBody();
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);
        const physicsManager =  this.service('RapierPhysicsManager');
        this.$rigidBody = physicsManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = this.$rigidBody.handle;
        physicsManager.rigidBodies[this.rigidBodyHandle] = this;

        if (this.rigidBody.bodyType() === RAPIER.RigidBodyType.KinematicPositionBased) {
            this.listen("setTranslation", this.setKinematicTranslation);
            this.listen("setRotation", this.setKinematicRotation);
            this.listen("moveTo", this.setKinematicTranslation);
            this.listen("rotateTo", this.setKinematicRotation);
        }
    }

    setKinematicTranslation(v) { this.rigidBody.setNextKinematicTranslation(new RAPIER.Vector3(...v)); }
    setKinematicRotation(q) { this.rigidBody.setNextKinematicRotation(new RAPIER.Quaternion(...q)); }

    removeRigidBody() {
        if (!this.rigidBody) return;
        const physicsManager = this.service('RapierPhysicsManager');
        physicsManager.rigidBodies[this.rigidBodyHandle] = undefined;
        physicsManager.world.removeRigidBody(this.rigidBody);
        this.rigidBodyHandle = undefined;
        this.$rigidBody = undefined;
    }

    createCollider(cd) {
        const physicsManager = this.service('RapierPhysicsManager');
        const c = physicsManager.world.createCollider(cd, this.rigidBodyHandle);
        return c.handle;
    }

};
RegisterMixin(AM_RapierPhysics);