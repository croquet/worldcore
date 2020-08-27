import { Model } from "@croquet/croquet";
import { RegisterMixin } from "./Mixins";
import { q_axisAngle, toRad, v3_multiply } from "./Vector";

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

    addRigidBody(rb) {
        this.rigidBodies[rb.rigidBodyHandle] = rb;
    }

    removeRigidBody(rb) {
        this.rigidBodies[rb.rigidBodyHandle] = null;
    }


}
RapierPhysicsManager.register("RapierPhysicsManager");


//------------------------------------------------------------------------------------------
//-- RapierPhysics -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierPhysics = superclass => class extends superclass {

    init(pawn, options) {
        super.init(pawn, options);

        options = options || {};

        const type = options.rigidBodyType || 'dynamic';
        const location = options.location || [0,0,0];
        const rotation = options.rotation || [0,0,0,1];

        const physicsManager =  this.wellKnownModel('RapierPhysicsManager');

        const rbd = new RAPIER.RigidBodyDesc(type);
        rbd.setTranslation(...location);
        rbd.setRotation(...rotation);

        const rb = physicsManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle();

        physicsManager.addRigidBody(this);

        // this.listen("spatial_setLocation", this.userLocationSet);


    }

    destroy() {
        super.destroy();
        const physicsManager = this.wellKnownModel('RapierPhysicsManager');
        physicsManager.removeRigidBody(this);
        physicsManager.world.removeRigidBody(this.rigidBody);
    }

    get rigidBody() {
        if  (!this.$rigidBody) {
            const physicsManager = this.wellKnownModel('RapierPhysicsManager');
            this.$rigidBody = physicsManager.world.getRigidBody(this.rigidBodyHandle);
        }
        return this.$rigidBody
    }

    addBoxCollider(options) {
        options = options || {};

        const size = v3_multiply(this.scale, (options.size || [1,1,1]));

        const cd = RAPIER.ColliderDesc.cuboid(...size);
        cd.density = options.density || 1;
        cd.friction = options.friction || 1;
        cd.restitution = options.restitution || 1;

        const c = this.rigidBody.createCollider(cd);
    }

    // userLocationSet(v) {
    //     this.rigidBody.setTranslation(...v);
    // }


};
RegisterMixin(AM_RapierPhysics);



