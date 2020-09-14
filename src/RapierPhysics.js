import { Model } from "@croquet/croquet";
import { RegisterMixin } from "./Mixins";
import { v3_multiply } from "./Vector";

let RAPIER;

export async function LoadRapier() {
    RAPIER = await import("@dimforge/rapier3d");
}

export function setRapier(r) {
    RAPIER = r;
}

//------------------------------------------------------------------------------------------
//-- RapierPhysicsManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierPhysicsManager extends Model {

    static types() {
        if (!RAPIER) return {};
        return {
            "RAPIER.World": {
                cls: RAPIER.World,
                write: world => world.takeSnapshot(),
                read:  snapshot => RAPIER.World.restoreSnapshot(snapshot)
            }
        };
    }

    init(options = {}) {
        super.init();
        console.log("Starting rapier physics!!");
        this.beWellKnownAs('RapierPhysicsManager');

        const gravity = options.gravity || [0.0, -9.8, 0.0];
        const timeStep = options.timeStep || 50; // In ms

        this.world = new RAPIER.World(...gravity);
        this.timeStep = timeStep;
        this.world.timestep = this.timeStep / 1000;
        this.rigidBodies = [];
        this.future(0).tick();
    }

    destroy() {
        super.destroy();
        this.world = null;
    }

    tick() {
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
        this.future(this.timeStep).tick();
    }

}
RapierPhysicsManager.register("RapierPhysicsManager");


//------------------------------------------------------------------------------------------
//-- RapierPhysics -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierPhysics = superclass => class extends superclass {

    static types() {
        return {
            ...super.types(),
            "RAPIER.RigidBody": {
                cls: RAPIER.RigidBody,
                write: rb => ({world: rb.world, handle: rb.handle()}),
                read: ({world, handle}) => {
                    const rb = world.getRigidBody(handle);
                    rb.world = world; // We save a ref to the world in the rb so it can rebuild itself from its handle.
                    return rb;
                }
            }
        };
    }

    // init(...args) {
    //     super.init(...args);
    //     // this.listen("smoothed_moveTo", this.rapierOnMoveTo)
    //     // this.listen("smoothed_rotateTo", this.rapierOnRotateTo)
    // }

    destroy() {
        this.removeRigidBody();
        super.destroy();
    }

    rapierOnMoveTo(v) {
        this.rigidBody.setNextKinematicTranslation(...v);
    }

    rapierOnRotateTo(q) {
        this.rigidBody.setNextKinematicRotation(...q);
    }

    setRigidBodyTranslation(v) {
        if (!this.rigidBody) return;
        this.rigidBody.setNextKinematicTranslation(...v);
    }

    setRigidBodyRotation(q) {
        if (!this.rigidBody) return;
        this.rigidBody.setNextKinematicRotation(...q);
    }

    applyForce(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector(...v);
        this.rigidBody.applyForce(rv, true);
        //rv.free();
    }

    applyImpulse(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector(...v);
        this.rigidBody.applyImpulse(rv, true);
        // rv.free();
    }

    applyTorque(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector(...v);
        this.rigidBody.applyTorque(rv, true);
        // rv.free();
    }

    applyTorqueImpulse(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector(...v);
        this.rigidBody.applyTorqueImpulse(rv, true);
        //rv.free();
    }

    addRigidBody(options = {}) {
        this.removeRigidBody();
        const type = options.type || 'dynamic';

        const rbd = new RAPIER.RigidBodyDesc(type);
        rbd.setTranslation(...this.location);
        rbd.setRotation(...this.rotation);

        const physicsManager =  this.wellKnownModel('RapierPhysicsManager');

        this.rigidBody = physicsManager.world.createRigidBody(rbd);
        this.rigidBody.world = physicsManager.world; // We save a ref to the world in the rb so it can rebuild itself from its handle.
        physicsManager.rigidBodies[this.rigidBody.handle()] = this;

        if (this.rigidBody.isKinematic()) {
            this.listen("smoothed_moveTo", this.rapierOnMoveTo);
            this.listen("smoothed_rotateTo", this.rapierOnRotateTo);
        }
    }

    removeRigidBody() {
        if (this.rigidBody) {
            if (this.rigidBody.isKinematic()) {
                this.ignore("smoothed_moveTo");
                this.ignore("smoothed_rotateTo");
            }
            const physicsManager = this.wellKnownModel('RapierPhysicsManager');
            physicsManager.rigidBodies[this.rigidBody.handle()] = null;
            physicsManager.world.removeRigidBody(this.rigidBody);
            this.rigidBody = null;
        }
    }

    addBallCollider(options = {}) {
        const radius = options.radius * this.scale[0]; // Non-uniform scales won't work with ball colliders

        const cd = RAPIER.ColliderDesc.ball(radius);
        cd.density = options.density || 1;  // Zero or negative density causes errors
        cd.friction = options.friction || 0;
        cd.restitution = options.restitution || 0;

        const c = this.rigidBody.createCollider(cd);
    }

    addBoxCollider(options = {}) {
        const size = v3_multiply(this.scale, (options.size || [1,1,1]));

        const cd = RAPIER.ColliderDesc.cuboid(...size);
        cd.density = options.density || 1;  // Zero or negative density causes errors
        cd.friction = options.friction || 0;
        cd.restitution = options.restitution || 0;

        const c = this.rigidBody.createCollider(cd);
    }


};
RegisterMixin(AM_RapierPhysics);
