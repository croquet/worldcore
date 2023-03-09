import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial } from "@croquet/worldcore";

import { TestPawn, BasePawn, AvatarPawn, OtherPawn } from "./Views";


//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    // get pawn() {return  "TestPawn"}
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// OtherActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class OtherActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    // get pawn() {return  OtherPawn }
    // get pawn() {return  "OtherPawn" }
}
OtherActor.register('OtherActor');

//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return BasePawn}
}
BaseActor.register('BaseActor');



//------------------------------------------------------------------------------------------
// AvatarActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Avatar) {
    get pawn() {return  AvatarPawn}
}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- MyUser --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    init(options) {
        super.init(options);
        this.avatar = AvatarActor.create({name: "Avatar", driver: this, translation: [0,0,20]});

        // const halo = TestActor.create({parent: this.avatar, translation: [0,1.5,0]})
        // halo.behavior.start({name: "SpinBehavior", axis:[1,0,0], speed:3});
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

        this.test0 = TestActor.create({pawn: "TestPawn",translation:[0,5,0]});
        this.test1 = TestActor.create({pawn: "TestPawn", parent: this.test0, translation:[5,0,0]});

        // this.other = OtherActor.create({pawn: "OtherPawn", translation:[3,2,0]});

        this.test0.behavior.start({name: "SpinBehavior", axis:[0,1,0], speed: 2});
        this.test1.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

        this.test00 = TestActor.create({pawn: "TestPawn",translation:[-5,0,0]});
        this.test01 = TestActor.create({pawn: "TestPawn",translation:[5,0,0]});
        this.test10 = TestActor.create({pawn: "TestPawn",translation:[0,0,-5]});
        this.test11 = TestActor.create({pawn: "TestPawn",translation:[0,0,5]});

        this.subscribe("input", "pDown", this.pawnToggle)

    }

    pawnToggle() {
        if (this.test0.pawn === "OtherPawn") {
            this.test0.set({pawn: "TestPawn"});
        } else {
            this.test0.set({pawn: "OtherPawn"});
        }

    }
}
MyModelRoot.register("MyModelRoot");
