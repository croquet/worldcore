// Demolition Demo

import { ModelRoot,  Actor, mix, AM_Spatial, v3_scale, v3_add, v3_sub, v3_normalize, v3_magnitude, 
    RapierManager, RAPIER, AM_RapierRigidBody, AM_RapierWorld, User,UserManager } from "@croquet/worldcore";

import { BlockPawn, BasePawn, BarrelPawn, BulletPawn } from "./Views";

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
}

//------------------------------------------------------------------------------------------
//-- BlockActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BlockActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
    get pawn() {return BlockPawn}

    get shape() { return this._shape || "111" }

    init(options) {
        super.init(options);
        this.buildCollider();
        this.worldActor.blocks.add(this);
    }

    destroy() {
        super.destroy();
        this.worldActor.blocks.delete(this);
    }

    buildCollider() {
        let d = [0.5,0.5,0.5]
        switch(this.shape) {
            case "121":
                d = [0.5,1,0.5];
                break;
            case "414":
                d = [2,0.5,2];
                break;

            case "111":
            default:
        }
        const cd = RAPIER.ColliderDesc.cuboid(...d);
        cd.setDensity(1)
        cd.setFriction(2)
        cd.setRestitution(0.1);
        this.createCollider(cd);

    }

    translationSet(t) {
        if (t[1] > -50) return;
        // console.log("kill plane");
        this.future(0).destroy();
    }

}
BlockActor.register('BlockActor');



//------------------------------------------------------------------------------------------
//-- BulletActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BulletActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
    get pawn() {return BulletPawn}

    get index() {return this._index}

    init(options) {
        super.init(options);
        this.buildCollider();
        this.future(10000).destroy()
    }


    buildCollider() {
        const cd = RAPIER.ColliderDesc.ball(0.5);
        cd.setDensity(3)
        cd.setRestitution(0.95);
        this.createCollider(cd);
    }

}
BulletActor.register('BulletActor');



//------------------------------------------------------------------------------------------
//-- BarrelActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BarrelActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
    get pawn() {return BarrelPawn}

    init(options) {
        super.init(options);
        this.buildCollider();

        this.worldActor.blocks.add(this);

        this.future(2000).set({hasAccelerometer: true});
    }

    arm() {
        this.set({hasAccelerometer: true});
    }

    destroy() {
        super.destroy();
        this.worldActor.blocks.delete(this);
    }

    translationSet(t) {
        if (t[1] > -20) return;
        console.log("kill plane");
        this.future(0).destroy();
    }

    buildCollider() {
        const cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
        cd.setDensity(1)
        cd.setRestitution(0.2);
        this.createCollider(cd);
    }

    accelerationSet(acceleration) {
        const a = v3_magnitude(acceleration);
        if (a > 35) {
            this.explode();
        }
    }

    explode() {
        this.set({hasAccelerometer: false});
        const radius = 10;
        const world = this.getWorldActor();
        world.blocks.forEach(block => {
            const to = v3_sub(block.translation, this.translation)
            const force = radius - v3_magnitude(to)
            if (force < 0) return;
            const aim = v3_normalize(to);
            const push = v3_scale(aim, force * 25);
            block.rigidBody.applyImpulse(new RAPIER.Vector3(...push), true);
        })

        this.future(0).destroy();
    }

}
BarrelActor.register('BarrelActor');



//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BaseActor extends mix(Actor).with(AM_Spatial, AM_RapierWorld, AM_RapierRigidBody) {
    get pawn() {return BasePawn}

    init(options) {
        super.init(options);
        this.active = [];
        this.blocks = new Set();
        let cd = RAPIER.ColliderDesc.cuboid(50, 5, 50);
        cd.translation = new RAPIER.Vector3(0,0,0);
        this.createCollider(cd);

        this.subscribe("ui", "shoot", this.shoot);
        this.subscribe("ui", "new", this.reset);
    }

    shoot(data) {
        const gun = data.shoot;
        const index = data.index;
        const aim = v3_normalize(v3_sub([0,0,1], gun))
        const translation = v3_add(gun, [0,0,0]);
        const bullet = BulletActor.create({parent: this, translation, index});
        const force = v3_scale(aim, 50);
        bullet.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
    }

    reset() {
        this.blocks.forEach (b => b.destroy());
        this.buildAll();
   
    }

    buildAll() {
        this.buildBuilding(2,5,2);
        this.buildBuilding(-2,5,2);
        this.buildBuilding(2,5,-2);
        this.buildBuilding(-2,5,-2);

        this.buildBuilding(10,5,2);
        this.buildBuilding(10,5,-2);
        this.buildBuilding(10,5,6);
        this.buildBuilding(10,5,-6);

        this.buildBuilding(-10,5,2);
        this.buildBuilding(-10,5,-2);
        this.buildBuilding(-10,5,6);
        this.buildBuilding(-10,5,-6);

        this.buildBuilding(2,5,10);
        this.buildBuilding(-2,5,10);
        this.buildBuilding(6,5,10);
        this.buildBuilding(-6,5,10);
        this.buildBuilding(2,5,-10);
        this.buildBuilding(-2,5,-10);
        this.buildBuilding(6,5,-10);
        this.buildBuilding(-6,5,-10);

    }

    build121(x,y,z) {
        BlockActor.create({parent: this, shape: "121", translation: [x,y+1,z]});
        BlockActor.create({parent: this, shape: "121", translation: [x,y+3,z]});
    }

    buildFloor(x,y,z) {
        this.build121(x-1.5,y,z-1.5);
        this.build121(x-1.5,y,z+1.5);
        this.build121(x+1.5,y,z-1.5);
        this.build121(x+1.5,y,z+ 1.5);
        BlockActor.create({parent: this, shape: "414", translation: [x+0, y+4.5, z+0]});
    }

    buildBuilding(x,y,z) {
        this.buildFloor(x,y,z);
        this.buildFloor(x,y+5.6,z);

        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-1.5, y+11, z-1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-1.5, y+11, z+1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+1.5, y+11, z-1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+1.5, y+11, z+1.5]});

        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+0, y+11, z-1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-0, y+11, z+1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+1.5, y+11, z-0]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-1.5, y+11, z+0]});

        if (Math.abs(x)<4 && Math.abs(z)<4) BarrelActor.create({parent: this, rigidBodyType: "dynamic", translation: [x, y+5.5, z]});

    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- MyUser --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    init(options) {
        super.init(options);
        this.index = Math.floor(Math.random()*21);
        
    }

}
MyUser.register("MyUser");

//------------------------------------------------------------------------------------------
//-- MyUserManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser;}
}
MyUserManager.register("MyUserManager");



//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager, RapierManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!!");
        this.seedColors();

        this.base = BaseActor.create({rigidBodyType: "static", gravity: [0,-9.8,0], timestep:15, translation: [0,0,0]});
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


// // webpack will replace process.env.NODE_ENV with the actual value
// const apiKey = process.env.NODE_ENV === 'production'
//     ? '1rN7t58Mo1ani03Djcl4amvdEAnoitB6g3oNxEDrC'
//     : '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9';

// App.makeWidgetDock();
// StartWorldcore({
//     appId: 'io.croquet.demolition',
//     apiKey,
//     model: MyModelRoot,
//     name: App.autoSession(),
//     password: App.autoPassword(),
//     view: MyViewRoot,
//     tps:60
// });