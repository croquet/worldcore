// Drive Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, ModelService, Behavior, v3_add, v3_sub, v3_scale, 
    UserManager, User, AM_Avatar, q_axisAngle, v3_normalize, v3_rotate, v3_distance, AM_NavGrid, AM_OnNavGrid } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
const missileSpeed = 50;
class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGrid) {

    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
        this.listen("spawn", this.doSpawn);
    }

    // unused...
    doSpawn(xyz) {
        const translation = [...xyz];
        SimpleActor.create({pawn:"ClickPawn", parent: this, translation});
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//--SimpleActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SimpleActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
    }
    get color() { return this._color || [0.5,0.5,0.5]}
}
SimpleActor.register('SimpleActor');

//------------------------------------------------------------------------------------------
//--MissileActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MissileActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_OnNavGrid) {

    init(options) {
        super.init(options);
//      const mcm = this.service("ModelCollisionManager");
//      mcm.colliders.add(this);
        this.future(8000).destroy(); // destroy in 10 seconds
        this.lastTranslation = [0,0,0];
        this.tick();
    }

    tick() {
        this.test();
        if (!this.doomed) this.future(10).tick();
    }

    test() {
        const v_dist2Sqr = function (a,b) {
            const dx = a[0] - b[0];
            const dy = a[2] - b[2];
            return dx*dx+dy*dy;
        }

        const v_equals = function(a, b){
            return a[0]===b[0] && a[2]===b[2];
        }

        const bollard = this.pingClosest("bollard", 2);
        if (bollard) {
            //console.log(v_equals(this.lastTranslation, this.translation), this.translation);
            //console.log(this.translation);
            const d2 = v_dist2Sqr(this.translation, bollard.translation);
            if (d2 < 2.5) {
                // if (d<0.5) {console.log("inside")}
                let aim = v3_sub(this.translation, bollard.translation);
                aim[1]=0;
                aim = v3_normalize(aim);
                if (this.go) this.go.destroy();

                this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
            }
        }

        const avatar = this.pingClosest("avatar", 1);
        if (avatar) {
            const d = v3_distance(this.translation, avatar.translation);
            if (d < 2) {
                const aim = v3_normalize(v3_sub(this.translation, avatar.translation));
                if (this.go) this.go.destroy();
                this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
                avatar.doBounce( v3_scale(aim, -0.5) )
                //console.log("avatar hit!");
            }
        }
        this.lastTranslation = this.translation;
    }

    translationSet(t,o) {
        super.translationSet(t,o);
        if (t[0] < 5) this.destroy(); // kill plane
        if (t[2] < 5) this.destroy();
    }

    step(){
        this.translateTo(v3_add(this.translation, this._velocity));
        this.future(100).step();
    }

    get color() { return this._color || [0.5,0.5,0.5]}

    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }
}
MissileActor.register('MissileActor');
//------------------------------------------------------------------------------------------
//--BollardActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BollardActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid) {

    init(options) {
        super.init(options);
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.add(this);
    }
    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }
}
BollardActor.register('BollardActor');

//------------------------------------------------------------------------------------------
//-- AvatarActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar, AM_OnNavGrid) {
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
        /*
        const yawQ = q_axisAngle([0,1,0], where[1]);
        let velocity = [0, 0, -4];
        const v = v3_rotate(velocity, yawQ);

        const missile = MissileActor.create({pawn: "MissilePawn", parent: this.parent, translation: v3_add(where[0], v3_scale(v,0.5)), rotation: yawQ, velocity: v, color: [...this.color]});
*/

        const aim = v3_rotate([0,0,-1], q_axisAngle([0,1,0], where[1])); //
        const translation = v3_add(this.translation, v3_scale(aim, 5));
        const missile = MissileActor.create({parent: this.parent, pawn: "MissilePawn", translation, color: [...this.color]});
            missile.go = missile.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});

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
        const translation = [175+ this.random() * 10, 0, 160+this.random()*10];
        const rotation = q_axisAngle([0,1,0], Math.PI/2);
        this.avatar = AvatarActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            translation: translation,
            rotation: rotation,
            instanceName: 'tankTracks',
            tags: ["avatar"]
        });
        SimpleActor.create({pawn: "InstancePawn", parent: this.avatar, color:this.color, instanceName:'tankBody'});
        SimpleActor.create({pawn: "InstancePawn", parent: this.avatar, color:this.color, instanceName:'tankTurret'});
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
        let gridScale = 10;
        let bollardDistance = gridScale;
        this.base = BaseActor.create({gridSize: 25, gridScale:gridScale, subdivisions: 1, noise: 1});
        this.parent = SimpleActor.create({pawn: "TestPawn", parent: this.base, translation:[-12,7,-35]});
        this.child = SimpleActor.create({pawn: "CollidePawn", parent: this.parent, translation:[0,0,4]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        for (let x=0; x<10; x++) 
        for (let y=0; y<10; y++){
            //BollardActor.create({pawn: "BollardPawn", tags: ["bollard"], parent: this.base, translation:[-20+10*n,0,-20+10*m]});
            BollardActor.create({pawn: "BollardPawn", tags: ["bollard"], parent: this.base, obstacle: true, translation:[10*gridScale+bollardDistance*x+1.5,0, 10*gridScale+bollardDistance*y+1.5]});
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

