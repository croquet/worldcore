import { RegisterMixin, ModelService, v3_sub, v3_scale } from "@croquet/worldcore-kernel";

export let RAPIER; // eslint-disable-line import/no-mutable-exports
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

    static okayToIgnore() {
        return [ "$rigidBody" ]; // we don't snapshot the rigidBody, only its handle and userData
    }

    static types() {
        if (!RAPIER) return {}; // RapierManager isn't being used in this app
        return {
            "RAPIER.World": {
                cls: RAPIER.World,
                write: world => {
                    const snapshot = world.takeSnapshot();
                    if (snapshot) {
                        // Preserving userData is tricky because RigidBodies are not
                        // snapshotted, but created lazily in the rigidBody getter.
                        // The getter uses getRigidBody() which we override below
                        // to restore userData from the snapshot.
                        // We also need to preserve userData for any RigidBodies that
                        // did not call getRigidBody() before the next snapshot is taken.
                        // In that case, we use the userData from the previous snapshot
                        // (which is still stored in world.snapshotUserData).
                        const oldSnapshotUserData = world.snapshotUserData || {};
                        const snapshotUserData = {};
                        world.forEachRigidBody(rb => {
                            const userData = "userData" in rb ? rb.userData : oldSnapshotUserData[rb.handle];
                            if (userData !== undefined) snapshotUserData[rb.handle] = userData;
                        });
                        return [snapshot, snapshotUserData];
                    }

                    // if an empty Rapier snapshot is returned, crash the session rather than write a Croquet snapshot that will be unloadable
                    console.error("empty RAPIER.World snapshot: ", JSON.stringify(snapshot));
                    throw Error("Failed to take Rapier snapshot");
                },
                read: ([snapshot, snapshotUserData]) => {
                    // Unfortunately, the contents of snapshotUserData is only available
                    // after this read function returns (that's a Croquet bug). So instead of
                    // restoring the userData to the RigidBodies here, we save it in
                    // world.snapshotUserData and override the getRigidBody() function below
                    const world = RAPIER.World.restoreSnapshot(snapshot);
                    if (world) {
                        const superGetRigidBody = world.getRigidBody.bind(world);
                        world.snapshotUserData = snapshotUserData;
                        world.getRigidBody = function(handle) {
                            const rb = superGetRigidBody(handle);
                            const userData = this.snapshotUserData[handle];
                            if (userData !== undefined) rb.userData = userData;
                            return rb;
                        }
                        return world;
                    }

                    // if our decode fails, crash the session to ensure that we don't later write a Croquet snapshot that has no RAPIER.World
                    console.error(`Rapier ${RapierVersion()} failed to decode snapshot.`, snapshot);
                    throw Error("Failed to decode Rapier snapshot");
                },
            },
            "RAPIER.EventQueue": {
                cls: RAPIER.EventQueue,
                write: () => 0, // we assume the queue always gets drained fully
                read:  () => new RAPIER.EventQueue(true),
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
        super.init(options);
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
        this.rigidBodyActors.delete(handle); // used to set null - but that just endlessly grows the collection
    }

    tick() {
        if (this.doomed) return;
        this.world.step(this.queue);
        this.world.forEachActiveRigidBody(rb => { try {
            const actor = this.rigidBodyActors.get(rb.handle);
            if (!actor) return; // ael: not sure this is possible, but just in case

            const t = rb.translation();
            const r = rb.rotation();
            const translation = [t.x, t.y, t.z];
            const rotation = [r.x, r.y, r.z, r.w];

            if (actor.hasAccelerometer) {
                const velocity = v3_scale(v3_sub(translation, actor.translation), 1000/this.timeStep);
                let acceleration = v3_scale(v3_sub(velocity, actor.velocity), 1000/this.timeStep);
                acceleration = v3_sub(acceleration, this.gravity);
                actor.set({acceleration,velocity});
            }

            actor.set({translation, rotation});
        } catch (e) { console.error(e) } }); // https://github.com/dimforge/rapier/issues/516
        if (!this.doomed) this.future(this.timeStep).tick();
    }

};
RegisterMixin(AM_RapierWorld);

//------------------------------------------------------------------------------------------
//-- AM_RapierRigidBody --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_RapierRigidBody = superclass => class extends superclass {

    init(options) {
        super.init(options);
        this.worldActor = this.getWorldActor();

        let rbd;
        switch (this.rigidBodyType) {
            default:
            case "dynamic": rbd = RAPIER.RigidBodyDesc.newDynamic(); break;
            case "static": rbd = RAPIER.RigidBodyDesc.newStatic(); break;
            case "kinematic": rbd = RAPIER.RigidBodyDesc.newKinematicPositionBased(); break;
        }
        rbd.setCcdEnabled(this.ccdEnabled);
        rbd.translation = new RAPIER.Vector3(...this.translation);
        rbd.rotation = new RAPIER.Quaternion(...this.rotation);

        this.rigidBodyHandle = this.worldActor.createRigidBody(this, rbd);
    }

    destroy() {
        super.destroy();
        this.worldActor.destroyRigidBody(this.rigidBodyHandle);
    }

    get rigidBodyType() { return this._rigidBodyType || "dynamic"}
    get ccdEnabled() { return this._ccdEnabled === undefined ? true : this._ccdEnabled }
    get velocity() { return this._velocity || [0,0,0]}
    get acceleration() { return this._acceleration || [0,0,0]}
    get hasAccelerometer() { return this._hasAccelerometer}

    get rigidBody() {
        if (!this.worldActor) return null;
        if (!this.$rigidBody) this.$rigidBody = this.worldActor.getRigidBody(this.rigidBodyHandle);
        return this.$rigidBody;
    }

    translationSet() {
        if (this.rigidBodyType !== "kinematic") return;
        if (this.rigidBody) this.rigidBody.setNextKinematicTranslation(new RAPIER.Vector3(...this.translation));
    }
    rotationSet() {
        if (this.rigidBodyType !== "kinematic") return;
        if (this.rigidBody) this.rigidBody.setNextKinematicRotation(new RAPIER.Vector3(...this.rotation));
    }

    getWorldActor() {
        let actor = this;
        do {
            if (actor.world) return actor;
            actor = actor.parent;
        } while (actor);
        console.error("AM_RapierRigidBody must have an AM_RapierWorld parent");
        return null;
    }

    createCollider(cd) {
        this.worldActor.world.createCollider(cd, this.rigidBody);
    }

};
RegisterMixin(AM_RapierRigidBody);

