import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, q_axisAngle } from "@croquet/worldcore";

import { TestPawn, BasePawn, AvatarPawn } from "./Views";


//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get pawn() {return this._pawn || "TestPawn"}
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return "BasePawn"}
}
BaseActor.register('BaseActor');


//------------------------------------------------------------------------------------------
// AvatarActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Avatar) {

    get pawn() {return  "AvatarPawn"}

    init(options) {
        super.init(options);
        this.head = TestActor.create({parent: this, pawn: "HeadPawn", translation: [0,1.25,0]})
        this.listen("headPitch", this.doHead)
    }

    doHead(pitch) {
        const pitchQ = q_axisAngle([1,0,0], pitch);
        this.head.set({rotation: pitchQ});
    }
}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- MyUser --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    init(options) {
        super.init(options);
        this.index = Math.floor(Math.random()*20);
        this.avatar = AvatarActor.create({name: "Avatar", driver: this.userId, translation: [0,0.5,20]});
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
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
        return [MyUserManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");

        this.base = BaseActor.create({});

        this.test0 = TestActor.create({translation:[0,5,0]});
        this.test1 = TestActor.create({parent: this.test0, translation:[5,0,0]});

        this.test0.behavior.start({name: "SpinBehavior", axis:[0,1,0], speed: 2});
        this.test1.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

        this.test00 = TestActor.create({translation:[-5,0.5,0]});
        this.test01 = TestActor.create({translation:[5,0.5,0]});
        this.test10 = TestActor.create({translation:[0,0.5,-5]});
        this.test11 = TestActor.create({translation:[0,0.5,5]});

        AvatarActor.create({name: "Other", translation: [-10, 0.5, -10]})

    }
}
MyModelRoot.register("MyModelRoot");
