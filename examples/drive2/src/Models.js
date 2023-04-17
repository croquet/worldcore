// Drive Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, Behavior, v3_add, v3_scale, 
    UserManager, User, AM_Avatar, q_axisAngle, v3_rotate, toRad } from "@croquet/worldcore";

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
    get color() { return this._color || [0.5,0.5,0.5]}
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//--MissileActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MissileActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
        console.log(this._velocity);
        this.future(100).step();
    }

    step(){
        this.translateTo(v3_add(this.translation, this._velocity));
        this.future(100).step();
    }

    get color() { return this._color || [0.5,0.5,0.5]}
}
MissileActor.register('MissileActor');
//------------------------------------------------------------------------------------------
//--BollardActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BollardActor extends mix(Actor).with(AM_Spatial) {

    init(options) {
        super.init(options);
    }
}
BollardActor.register('BollardActor');

//------------------------------------------------------------------------------------------
//-- AvatarActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar) {
    init(options){
        super.init(options);
        this.listen("bounce", this.doBounce);
        this.listen("shoot", this.doShoot);
    }

    get color() { return this._color || [0.5,0.5,0.5]}

    // Since the view side control is happening so often, it is possible to miss a
    // collision with another avatar because the view will be updated before the 
    // bounce gets integrated into the avatar position. By sending it to the view 
    // here, it gets fully integrated. This does increase latency somewhat for you 
    // seeing the other user's bounce.
    doBounce(bounce){
        this.say("doBounce", bounce);
    }

    doShoot(where){
        //[this.translation, this.yaw]
        const yawQ = q_axisAngle([0,1,0], where[1]);
        let velocity = [0, 0, -5];
        const v = v3_rotate(velocity, yawQ);

        MissileActor.create({pawn: "MissilePawn", parent: this.parent, translation: v3_add(where[0], v3_scale(v,3)), rotation: yawQ, velocity: v, color: [...this.color]});
    }

}
AvatarActor.register('AvatarActor');

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
        const translation = [-5 + this.random() * 10, 0, 10];
        this.avatar = AvatarActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            translation: translation,
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
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(options) {
        super.init(options);
        console.log("Start model root!!");
        this.base = BaseActor.create();
        this.parent = TestActor.create({pawn: "TestPawn", parent: this.base, translation:[-12,7,-35]});
        this.child = TestActor.create({pawn: "CollidePawn", parent: this.parent, translation:[0,0,4]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        for (let n=0; n<10; n++) 
        for (let m=0; m<10; m++){
            BollardActor.create({pawn: "BollardPawn", tags: ["bollard"], parent: this.base, translation:[-20+10*n,0,-20+10*m]});
        }

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

