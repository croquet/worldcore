// Microverse Base

import { ModelRoot, Actor, mix, AM_Spatial, sphericalRandom, v3_scale, v3_add, v3_sub, v3_normalize} from "@croquet/worldcore";
import { RAPIER, RapierManager, AM_RapierWorld, AM_RapierRigidBody} from "@croquet/worldcore-rapier";

// import { SprayPawn, FountainPawn } from "./Views";

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
}

//------------------------------------------------------------------------------------------
//-- SprayActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
    get pawn() {return "SprayPawn"}

    get shape() {return this._shape || "cube"}
    get index() { return this._index || 0 }

    init(options) {
        super.init(options);
        this.parent.live.push(this);
        if (this.parent.live.length > this.parent.max) this.parent.live.shift().destroy();

        this.buildCollider();
    }

    buildCollider() {
        let cd;
        switch (this.shape) {
            case "cone":
                cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
                cd.setDensity(4);
                break;
            case "ball":
                cd = RAPIER.ColliderDesc.ball(0.5);
                cd.setDensity(2);
                break;
            case "cylinder":
                cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
                cd.setDensity(1.5);
                break;
            case "cube":
            default:
                cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
                cd.setDensity(1);
            break;
        }

        this.createCollider(cd);

    }

}
SprayActor.register('SprayActor');

//------------------------------------------------------------------------------------------
//-- BlockActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {

    get pawn() {return "SprayPawn"}

    get shape() {return this._shape || "cube"}
    get index() { return this._index || 0 }

    init(options) {
        super.init(options);

        this.buildCollider();

        this.subscribe("input", "zDown", this.goLeft);
        this.subscribe("input", "xDown", this.goRight);
    }

    buildCollider() {
        let cd;
        switch (this.shape) {
            case "cone":
                cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
                cd.setDensity(4);
                break;
            case "ball":
                cd = RAPIER.ColliderDesc.ball(0.5);
                cd.setDensity(2);
                break;
            case "cylinder":
                cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
                cd.setDensity(1.5);
                break;
            case "cube":
            default:
                cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
                cd.setDensity(1);
            break;
        }

        this.createCollider(cd);

    }

    // init(options) {
    //     super.init(options);

    //     console.log("new block");

    //     this.subscribe("input", "zDown", this.goLeft);
    //     this.subscribe("input", "xDown", this.goRight);
    // }

    goLeft() {
        console.log("left");
        const translation = [...this.translation];
        translation[0] -= 0.1;
        this.set({translation});
    }

    goRight() {
        console.log("right");
        const translation = [...this.translation];
        translation[0] += 0.1;
        this.set({translation});
    }

}
BlockActor.register('BlockActor');



//------------------------------------------------------------------------------------------
//-- FountainActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// class TestActor extends mix(Actor).with(AM_Spatial) {}

class FountainActor extends mix(Actor).with(AM_Spatial, AM_RapierWorld, AM_RapierRigidBody) {
    get pawn() {return "FountainPawn"}

    init(options) {
        super.init(options);
        this.live = [];

        let cd = RAPIER.ColliderDesc.cuboid(25, 0.5, 25);
        this.createCollider(cd);
        cd = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(0.5, 10, 25);
        cd.translation = new RAPIER.Vector3(-24,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(0.5, 10, 25);
        cd.translation = new RAPIER.Vector3(24,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(25, 10, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,24);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(25, 10, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,-24);
        this.createCollider(cd);

        this.subscribe("ui", "shoot", this.doShoot);

        this.future(1000).spray();
    }

    get max() { return this._max || 50}

    spray() {
        this.spawn();
        if (!this.doomed) this.future(300).spray();
    }

    spawn() {
        const type = this.random();
        let shape = "cube";

        if (type > 0.4) shape = "cylinder";
        if (type > 0.7) shape = "ball";
        if (type > 0.9) shape = "cone";

        const index = Math.floor(this.random()*20);
        const spray = SprayActor.create({parent: this, shape, index, translation: [0,3,0], rigidBodyType: "dynamic"});

        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
        const force = [0, 17.5 + 5 * Math.random(), 0];

        spray.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        spray.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
    }

    doShoot(gun) {
        const aim = v3_normalize(v3_sub([0,15,0], gun));
        const shape = "cube";
        const index = Math.floor(this.random()*20);
        const translation = v3_add(gun, [0,0,0]);
        const bullet = SprayActor.create({parent: this, shape, index, translation, rigidBodyType: "dynamic"});
        const force = v3_scale(aim, 40);
        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);

        bullet.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        bullet.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
    }

}
FountainActor.register('FountainActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [RapierManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
        this.seedColors();

        this.fountain = FountainActor.create({gravity: [0,-9.8,0], timestep:50, translation: [0,0,0], max: 200, rigidBodyType: "static"});

        this.block = BlockActor.create({parent: this.fountain, translation: [0,1,5], rigidBodyType: "kinematic", index: 2});
    }

    seedColors() {
        this.colors = [
            rgb(242, 215, 213),        // Red
            rgb(217, 136, 128),        // Red
            rgb(192, 57, 43),        // Red

            rgb(240, 178, 122),        // Orange
            rgb(230, 126, 34),        // Orange
            rgb(175, 96, 26),        // Orange

            rgb(247, 220, 111),        // Yellow
            rgb(241, 196, 15),        // Yellow
            rgb(183, 149, 11),        // Yellow

            rgb(125, 206, 160),        // Green
            rgb(39, 174, 96),        // Green
            rgb(30, 132, 73),        // Green

            rgb(133, 193, 233),         // Blue
            rgb(52, 152, 219),        // Blue
            rgb(40, 116, 166),        // Blue

            rgb(195, 155, 211),        // Purple
            rgb(155, 89, 182),         // Purple
            rgb(118, 68, 138),        // Purple

            [0.9, 0.9, 0.9],        // White
            [0.5, 0.5, 0.5],        // Gray
            [0.2, 0.2, 0.2]        // Black
        ];

    }

}
MyModelRoot.register("MyModelRoot");
