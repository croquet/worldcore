// Drive Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, ModelService, Behavior, v3_add, UserManager, User, AM_Avatar, q_axisAngle, toRad } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
        this.listen("spawn", this.doSpawn);
    }

    doSpawn(xyz) {
        const translation = [...xyz];
        TestActor.create({pawn:"ClickPawn", parent: this, translation});
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//--TestActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//--BollardActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BollardActor extends mix(Actor).with(AM_Spatial) {

    init(options) {
        super.init(options);
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.add(this);
        console.log(mcm.colliders);
    }

    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }
}
BollardActor.register('BollardActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar) {

    get color() { return this._color || [0.5,0.5,0.5]}

    init(options) {
        super.init(options);
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.add(this);
        console.log(mcm.colliders);

    }

    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser}
}
MyUserManager.register('MyUserManager');

class MyUser extends User {
    init(options) {
        super.init(options);
        const base = this.wellKnownModel("ModelRoot").base;
        this.color = [this.random(), this.random(), this.random()];
        const translation = [-5 + this.random() * 10, 0, 10]
        this.avatar = ColorActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            translation,
            tags: ["avatar"]
        });
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
    }

}
MyUser.register('MyUser');

//------------------------------------------------------------------------------------------
//-- ModelCollisionManager -----------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ModelCollisionManager extends ModelService {

    init() {
        super.init("ModelCollisionManager");
        this.colliders = new Set();
    }
}
ModelCollisionManager.register('ModelCollisionManager');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager, ModelCollisionManager];
    }

    init(options) {
        super.init(options);
        console.log("Start model root!!");
        this.base = BaseActor.create();
        this.parent = TestActor.create({pawn: "TestPawn", parent: this.base, translation:[0,1,0]});
        this.child = ColorActor.create({pawn: "ColorPawn", parent: this.parent, translation:[0,0,2]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        for (let n=0; n<5; n++) {
            BollardActor.create({pawn: "BollardPawn", tags: ["bollard"], parent: this.base, translation:[-20+10*n,0,-20]});
        }



        // this.spare0 = ColorActor.create({
        //     pawn: "AvatarPawn",
        //     name: "Spare 0",
        //     parent: this.base,
        //     driver: null,
        //     translation: [-5,0,-30],
        //     rotation: q_axisAngle([0,1,0], toRad(-170)),
        //     tags: ["avatar"]
        // });

        // this.spare1 = ColorActor.create({
        //     pawn: "AvatarPawn",
        //     name: "Spare 1",
        //     parent: this.base,
        //     driver: null,
        //     translation: [5,0,-30],
        //     tags: ["avatar"],

        //     rotation: q_axisAngle([0,1,0], toRad(170))
        // });

        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
        // this.spare0.set({color});
        // this.spare1.set({color});
    }

}
MyModelRoot.register("MyModelRoot");

