import { RegisterMixin, ModelService, q_identity, v3_multiply, v3_zero  } from "@croquet/worldcore-kernel";

let RAPIER;

export function RapierVersion() {
    return RAPIER.version();
}

//------------------------------------------------------------------------------------------
//-- RapierPhysicsManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class RapierPhysicsManager extends ModelService {

    static async asyncStart() {
        RAPIER = await import("@dimforge/rapier3d");
    }

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
        super.init('RapierPhysicsManager');
        console.log("Starting rapier physics!");


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

    castRay(origin, direction, length) {
        const o = new RAPIER.Vector(...origin);
        const d = new RAPIER.Vector(...direction);
        const ray = new RAPIER.Ray(o,d);
        const intersect = this.world.castRay(ray, length);
        if (!intersect) return null;

        const colliderHandle = intersect.colliderHandle();
        const n = intersect.normal();
        const normal = [n.x, n.y, n.z];
        const distance = intersect.toi();

        const collider = this.world.getCollider(colliderHandle);
        const rigidBodyHandle = collider.parentHandle();
        const actor = this.rigidBodies[rigidBodyHandle];

        return {actor, normal, distance};
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
                write: rb => ({world: rb.world, handle: rb.handle}),
                read: ({world, handle}) => {
                    const rb = world.getRigidBody(handle);
                    rb.world = world; // We save a ref to the world in the rigid body so it can rebuild itself from its handle.
                    return rb;
                }
            },
            "RAPIER.Collider": {
                cls: RAPIER.Collider,
                write: c => ({world: c.world, handle: c.handle}),
                read: ({world, handle}) => {
                    const c = world.getCollider(handle);
                    c.world = world; // We save a ref to the world in the collider so it can rebuild itself from its handle.
                    return c;
                }
            }
        };
    }

    destroy() {
        this.removeRigidBody();
        super.destroy();
    }

    applyForce(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector3(...v);
        this.rigidBody.applyForce(rv, true);
    }

    applyImpulse(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector3(...v);
        this.rigidBody.applyImpulse(rv, true);
    }

    applyTorque(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector3(...v);
        this.rigidBody.applyTorque(rv, true);
    }

    applyTorqueImpulse(v) {
        if (!this.rigidBody) return;
        const rv = new RAPIER.Vector3(...v);
        this.rigidBody.applyTorqueImpulse(rv, true);
    }

    addRigidBody(options = {}) {
        this.removeRigidBody();
        const type = options.type || 'dynamic';
        let rbStatus = 0;
        switch(type) {
            case 'dynamic':
                rbStatus = RAPIER.RigidBodyType.Dynamic;
                break;
            case 'static':
                rbStatus = RAPIER.RigidBodyType.Static;
                break;
            case 'kinematic':
                rbStatus = RAPIER.RigidBodyType.Kinematic;
                break;
        }

        const rbd = new RAPIER.RigidBodyDesc(rbStatus);
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);

        const physicsManager =  this.service('RapierPhysicsManager');

        this.rigidBody = physicsManager.world.createRigidBody(rbd);
        this.rigidBody.world = physicsManager.world; // We save a ref to the world in the rb so it can rebuild itself from its handle.
        physicsManager.rigidBodies[this.rigidBody.handle] = this;

        // if (this.rigidBody.bodyStatus() === RAPIER.BodyStatus.Kinematic) {
        //     this.listen("spatial_setTranslation", this.kinematicSetTranslation);
        //     this.listen("spatial_setRotation", this.kinematicSetRotation);
        //     this.listen("smoothed_moveTo", this.kinematicMoveTo);
        //     this.listen("smoothed_rotateTo", this.kinematicRotateTo);
        // }
    }

    // Kinematic bodies are driven by the player, not the physics system, so we catch move events and pass them on to Rapier.

    kinematicSetTranslation(v) { this.rigidBody.setTranslation(new RAPIER.Vector3(...v)); }
    kinematicSetRotation(q) { this.rigidBody.setRotation(new RAPIER.Quaternion(...q)); }
    kinematicMoveTo(v) {
        this.rigidBody.setNextKinematicTranslation(new RAPIER.Vector3(...v));
        // this.previous = this.next;
        // const n = this.rigidBody.translation();
        // this.next = [n.x, n.y, n.z];
        // const delta = v3_sub(this.next,this.previous);
        // const mag = v3_magnitude(delta);



        // console.log(mag );
    }
    kinematicRotateTo(q) { this.rigidBody.setNextKinematicRotation(new RAPIER.Quaternion(...q)); }

    removeRigidBody() {
        if (!this.rigidBody) return;

        this.removeCollider();

        // if (this.rigidBody.bodyStatus() === RAPIER.BodyStatus.Kinematic) {
        //     this.ignore("spatial_setTranslation");
        //     this.ignore("spatial_setRotation");
        //     this.ignore("smoothed_moveTo");
        //     this.ignore("smoothed_rotateTo");
        // }
        const physicsManager = this.service('RapierPhysicsManager');
        physicsManager.rigidBodies[this.rigidBody.handle] = null;
        physicsManager.world.removeRigidBody(this.rigidBody);

        this.rigidBody = null;
    }


    addBallCollider(options = {}) {
        const radius =  this.scale[0] * (options.radius|| 1); // Non-uniform scales won't work with ball colliders
        const translation = options.translation || v3_zero();
        const rotation = options.rotation || q_identity();

        const ball = new RAPIER.Ball(radius);
        const cd = new RAPIER.ColliderDesc(ball);

        cd.density = options.density || 1;  // Zero or negative density causes errors
        cd.friction = options.friction || 0;
        cd.restitution = options.restitution || 0;
        cd.translation = new RAPIER.Vector3(...translation);
        cd.rotation = new RAPIER.Quaternion(...rotation);

        const physicsManager = this.service('RapierPhysicsManager');
        const c = physicsManager.world.createCollider(cd, this.rigidBody.handle);
        c.world = physicsManager.world;
        this.collider = c;

    }

    addBoxCollider(options = {}) {
        const size = v3_multiply(this.scale, (options.size || [1,1,1]));

        const translation = options.translation || v3_zero();
        const rotation = options.rotation || q_identity();

        const cuboid = new RAPIER.Cuboid(...size);
        const cd = new RAPIER.ColliderDesc(cuboid);

        cd.density = options.density || 1;  // Zero or negative density causes errors
        cd.friction = options.friction || 0;
        cd.restitution = options.restitution || 0;
        cd.translation = new RAPIER.Vector3(...translation);
        cd.rotation = new RAPIER.Quaternion(...rotation);

        const physicsManager = this.service('RapierPhysicsManager');
        const c = physicsManager.world.createCollider(cd, this.rigidBody.handle);

        c.world = physicsManager.world;
        this.collider = c;

    }

    addConeCollider(options = {}) {
        const radius =  this.scale[0] * (options.radius|| 1); // Non-uniform scales won't work with cylinder colliders
        const halfHeight =  this.scale[0] * (options.halfHeight|| 1);
        const translation = options.translation || v3_zero();
        const rotation = options.rotation || q_identity();

        const cone = new RAPIER.Cone(halfHeight, radius);
        const cd = new RAPIER.ColliderDesc(cone);

        cd.density = options.density || 1;  // Zero or negative density causes errors
        cd.friction = options.friction || 0;
        cd.restitution = options.restitution || 0;
        cd.translation = new RAPIER.Vector3(...translation);
        cd.rotation = new RAPIER.Quaternion(...rotation);

        const physicsManager = this.service('RapierPhysicsManager');
        const c = physicsManager.world.createCollider(cd, this.rigidBody.handle);
        c.world = physicsManager.world;
        this.collider = c;
    }

    addCylinderCollider(options = {}) {
        const radius =  this.scale[0] * (options.radius|| 1); // Non-uniform scales won't work with cylinder colliders
        const halfHeight =  this.scale[0] * (options.halfHeight|| 1);
        const roundRadius = this.scale[0] * (options.roundRadius|| 0.0001);
        const translation = options.translation || v3_zero();
        const rotation = options.rotation || q_identity();

        const cylinder = new RAPIER.RoundCylinder(halfHeight, radius, roundRadius);
        const cd = new RAPIER.ColliderDesc(cylinder);

        cd.density = options.density || 1;  // Zero or negative density causes errors
        cd.friction = options.friction || 0;
        cd.restitution = options.restitution || 0;
        cd.translation = new RAPIER.Vector3(...translation);
        cd.rotation = new RAPIER.Quaternion(...rotation);

        const physicsManager = this.service('RapierPhysicsManager');
        const c = physicsManager.world.createCollider(cd, this.rigidBody.handle);
        c.world = physicsManager.world;
        this.collider = c;
    }

    addCapsuleCollider(options = {}) {
        const radius =  this.scale[0] * (options.radius|| 1); // Non-uniform scales won't work with cylinder colliders
        const halfHeight =  this.scale[0] * (options.halfHeight|| 1);
        const translation = options.translation || v3_zero();
        const rotation = options.rotation || q_identity();

        const capsule = new RAPIER.Capsule(halfHeight, radius);
        const cd = new RAPIER.ColliderDesc(capsule);

        cd.density = options.density || 1;  // Zero or negative density causes errors
        cd.friction = options.friction || 0;
        cd.restitution = options.restitution || 0;
        cd.translation = new RAPIER.Vector3(...translation);
        cd.rotation = new RAPIER.Quaternion(...rotation);

        const physicsManager = this.wellKnownModel('RapierPhysicsManager');
        const c = physicsManager.world.createCollider(cd, this.rigidBody.handle);
        c.world = physicsManager.world;
        this.collider = c;
    }

    removeCollider() {
        if (!this.collider) return;
        this.collider = null;
    }


};
RegisterMixin(AM_RapierPhysics);
