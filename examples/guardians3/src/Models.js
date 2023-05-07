// Guardian Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, ModelService, v3_add, v3_sub, v3_scale,
    UserManager, User, AM_Avatar, q_axisAngle, v3_normalize, v3_rotate, AM_NavGrid, AM_OnNavGrid } from "@croquet/worldcore";

// The Guardian game is basically a 2D game. Virtually all computations in the model are 2D.
// The flat world is placed on a Perlin noise generated surface, but all interactions including
// driving and collisions are computed in 2D.

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
// This is the ground plane.
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
        this.future(8000).destroy(); // destroy in 8 seconds
        this.lastTranslation = [0,0,0];
        this.bounceWait = this.now(); // need to bounce otherwise we might instantly bounce again
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
        };

        if (this.now()>=this.bounceWait) {
            let aim;
            const bollard = this.pingClosest("bollard", 2);
            if (bollard) {
                //console.log(v_equals(this.lastTranslation, this.translation), this.translation);
                //console.log(this.translation);
                const d2 = v_dist2Sqr(this.translation, bollard.translation);
                if (d2 < 2.5) {
                    //console.log("bollard bounce");
                    this.bounceWait = this.now()+20;
                    // if (d<0.5) {console.log("inside")}
                    aim = v3_sub(this.translation, bollard.translation);
                    aim[1]=0;
                    aim = v3_normalize(aim);
                    if (this.go) this.go.destroy();

                    this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
                }
            }

            const avatar = this.pingClosest("avatar", 1);
            if (avatar) {
                const d = v_dist2Sqr(this.translation, avatar.translation);
                if (d < 3) {
                    this.bounceWait = this.now()+20;
                    aim = v3_sub(this.translation, avatar.translation);
                    aim[1]=0;
                    aim = v3_normalize(aim);
                    if (this.go) this.go.destroy();
                    this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
                    avatar.doBounce( v3_scale(aim, -0.5) )
                    //console.log("avatar hit!");
                }
            }
        }
        this.lastTranslation = this.translation;
    }

    translationSet(t,o) {
        //don't let the missile off of the grid...
        if (this.now()>=this.bounceWait) {
            const mx = 75*3-2.5;
            if (t[0] < 2.5 || t[0]>mx) {
                if (t[0]<2.5) t[0]=2.5;
                if (t[0]>mx) t[0]=mx;
                if (this.go) {
                    //doTranslate = false; // don't go there
                    this.bounceWait = this.now()+20;
                    this.go.destroy();
                    //console.log("bounce Z");
                    const aim = this.go.aim;
                    aim[0] = -aim[0];
                    this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
                }
            }
            if (t[2] < 2.5 || t[2] > mx) {
                if (t[2]<2.5) t[2]=2.5;
                if (t[2]>mx) t[2]=mx;
                if (this.go) {
                    //doTranslate = false;
                    this.bounceWait = this.now()+20;
                    //console.log("bounce X");
                    this.go.destroy();
                    const aim = this.go.aim;
                    aim[2] = -aim[2];
                    this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
                }
            }
        }
        super.translationSet(t,o);
    }

    step() {
        this.translateTo(v3_add(this.translation, this._velocity));
        this.future(100).step();
    }

    get color() { return this._color || [0.5,0.5,0.5]}

    destroy() {
        super.destroy();
        //const mcm = this.service("ModelCollisionManager");
        //mcm.colliders.delete(this);
    }
}
MissileActor.register('MissileActor');
//------------------------------------------------------------------------------------------
//--BollardActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BollardActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid) {

    init(options) {
        super.init(options);
        //const mcm = this.service("ModelCollisionManager");
        //mcm.colliders.add(this);
    }
    destroy() {
        super.destroy();
        //const mcm = this.service("ModelCollisionManager");
       //mcm.colliders.delete(this);
    }
}
BollardActor.register('BollardActor');

//------------------------------------------------------------------------------------------
//-- AvatarActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar, AM_OnNavGrid) {
    init(options) {
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
    doBounce(bounce) {
        this.say("doBounce", bounce);
    }

    doShoot(where) {
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

        this.color = [0.25+0.75*this.random(), 0.5, 0.25+0.75*this.random()];
        const trans = [170 + this.random() * 10, 0, 170+this.random()*10];
        const rot = q_axisAngle([0,1,0], Math.PI/2);

        this.avatar = AvatarActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            translation: trans,
            rotation: rot,
            instanceName: 'tankTracks',
            tags: ["avatar"]
        });
        SimpleActor.create({pawn: "GeometryPawn", parent: this.avatar, color:this.color, instanceName:'tankBody'});
        SimpleActor.create({pawn: "GeometryPawn", parent: this.avatar, color:this.color, instanceName:'tankTurret'});
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
        const bollardScale = 3;
        const bollardDistance = bollardScale*3;
        this.base = BaseActor.create({gridSize: 75, gridScale: bollardScale, subdivisions: 1, noise: 1});
        this.parent = SimpleActor.create({pawn: "TestPawn", parent: this.base, translation:[-12,7,-35]});
        this.child = SimpleActor.create({pawn: "CollidePawn", parent: this.parent, translation:[0,0,4]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        //place the bollards
        const maxSize = 15;
        for (let x=0; x<maxSize; x++) for (let y=0; y<maxSize; y++) {
            if ((x<=4 || x>=maxSize-5) && (y<=4 || y>=maxSize-5)) {
                // bottom of bollard
                const bollard = BollardActor.create( {pawn: "BollardPawn", tags: ["bollard"], parent: this.base, obstacle: true,
                    translation:[15*bollardScale+bollardDistance*x+1.5,0, 15*bollardScale+bollardDistance*y+1.5]} );
                // the three floating parts of the bollard
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, color:this.color, instanceName:'pole2', translation:[0,3,0]} );
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, color:this.color, instanceName:'pole2', translation:[0,3.5,0]} );
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, color:this.color, instanceName:'pole2', translation:[0,4,0]} );
            }
        }
        const m = 75*3;
        const r =  q_axisAngle([0,1,0], Math.PI/2);

        // build the fence
        for (let i=0; i<75; i++) {
            const b = i*bollardScale+1.5;
            SimpleActor.create({pawn: "InstancePawn", parent:this.base, translation:[b, 0, 0], instanceName:'fence', perlin:true} );
            SimpleActor.create({pawn: "InstancePawn", parent:this.base, translation:[b, 0, m], instanceName:'fence', perlin:true} );
            SimpleActor.create({pawn: "InstancePawn", parent:this.base, translation:[0, 0, b], rotation:r, instanceName:'fence', perlin:true} );
            SimpleActor.create({pawn: "InstancePawn", parent:this.base, translation:[m, 0, b], rotation:r, instanceName:'fence', perlin:true} );
        }

        //this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
        // this.spare0.set({color});
        // this.spare1.set({color});
    }

}
MyModelRoot.register("MyModelRoot");

