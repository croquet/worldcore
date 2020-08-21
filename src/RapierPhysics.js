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

let rb;
let c;

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

    init() {
        super.init();
        console.log("Starting rapier physics!!!!!!!!");
        this.beWellKnownAs('RapierPhysicsManager');
        this.world = new RAPIER.World(0.0, -9.8, 0.0);
        console.log(RAPIER);
        console.log(this.world);
        this.world.timestep = 0.02;
        console.log(this.world.timestep);

        this.world.step();

        // const rbd = new RAPIER.RigidBodyDesc('dynamic');
        // rbd.setTranslation(0, 0, 0);
        // console.log(rbd);

        // rb = this.world.createRigidBody(rbd);
        // console.log(rb);

        // this.rbh = rb.handle();

        // const cd = RAPIER.ColliderDesc.ball(5);
        // cd.density = 1;
        // c = rb.createCollider(cd);

        //this.future(20).tick();

        // this.world.removeRigidBody(rb);

        this.subscribe("input", "dDown", this.start);
    }

    start()  {
        this.future(20).tick();
    }

    destroy() {
        super.destroy();
        this.world = null;
    }

    tick() {
        this.world.step();
        // const pointer = this.world.getRigidBody(this.rbh);
        // const t = pointer.translation();
        // console.log(t.y);
        this.future(20).tick();
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

    init(...arg) {
        super.init(...arg);
        console.log("Actor Physics Plugin");

        const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        const rbd = new RAPIER.RigidBodyDesc('dynamic');

        const q = q_axisAngle([0,1,0], toRad(45));

        rbd.setTranslation(0, 0, 0);
        rbd.setRotation(q[0], q[1], q[2], q[3]);

        const rb = physicManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle();
        console.log("Creating dynamic");
        console.log(this.rigidBodyHandle);

        const cd = RAPIER.ColliderDesc.ball(0.5);
        cd.density = 1;
        c = rb.createCollider(cd);

        // physicManager.world.removeRigidBody(rb);

    }

    destroy() {
        super.destroy();
        // const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        // const pointer = physicManager.world.getRigidBody(this.rbh);
        // physicManager.world.removeRigidBody(pointer);
    }


};
RegisterMixin(AM_RapierPhysics);

//-- Actor ---------------------------------------------------------------------------------

export const AM_RapierPhysicsS = superclass => class extends superclass {

    init(...arg) {
        super.init(...arg);
        console.log("Static Physics Plugin");

        const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        const rbd = new RAPIER.RigidBodyDesc('static');

        const q = q_axisAngle([0,1,0], toRad(0));

        rbd.setTranslation(0, -2, 0);
        rbd.setRotation(q[0], q[1], q[2], q[3]);

        const rb = physicManager.world.createRigidBody(rbd);
        this.rigidBodyHandle = rb.handle();
        console.log("Creating static");
        console.log(this.rigidBodyHandle);

        const cd = RAPIER.ColliderDesc.ball(0.5);
        cd.density = 1;
        c = rb.createCollider(cd);

        // physicManager.world.removeRigidBody(rb);

    }

    destroy() {
        super.destroy();
        // const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        // const pointer = physicManager.world.getRigidBody(this.rbh);
        // physicManager.world.removeRigidBody(pointer);
    }


};
RegisterMixin(AM_RapierPhysicsS);
