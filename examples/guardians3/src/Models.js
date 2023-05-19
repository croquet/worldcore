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
// FireballActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FireballActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    init(...args) {
        super.init(...args);
        this.fireUpdate();
        this.fireballVisible = false;
        this.subscribe("menu","FireballToggle", this.fireballToggle);
        this.timeOffset = Math.random()*100;
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.counter = 0;
        this.maxCounter = 30;
        this.fireScale = 0.025;
        this.scale = [0.025,0.025, 0.025];
    }

    fireUpdate() {
        this.future(50).fireUpdate();
        let fs = this.fireScale + this.counter * 0.001;
        let rise = 0.025;
        this.scale = [fs, fs, fs];
        this.translation = [this.translation[0], this.translation[1]+rise, this.translation[2]];
        if(this.counter++ > this.maxCounter) this.destroy();
        else this.say("updateFire", [this.now()+this.timeOffset,(this.maxCounter-this.counter)/this.maxCounter]);
    }

    fireballToggle() {
        this.fireballVisible = !this.fireballVisible;
    }
    get pawn() {return "FireballPawn"}
}
FireballActor.register('FireballActor');

//------------------------------------------------------------------------------------------
// BotActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    init(...args) {
        super.init(...args);
        this.listen("killMe", this.killMe);
    }

    killMe() {
        FireballActor.create({translation:this.translation});
        this.destroy();
    }

    get pawn() {return "BotPawn"}

}
BotActor.register('BotActor');

//------------------------------------------------------------------------------------------
// BotEyeActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotEyeActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get pawn() {return "BotEyePawn"}
}
BotEyeActor.register('BotEyeActor');

//------------------------------------------------------------------------------------------
//--SimpleActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SimpleActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
    }
    get userColor() { return this._userColor }
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

    get userColor() { return this._userColor }

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
        this.subscribe("all", "godMode", this.doGodMode);
    }

    get userColor() { return this._userColor }
    get color() { return this._color || [0.5,0.5,0.5]}

    // Since the view side control is happening so often, it is possible to miss a
    // collision with another avatar because the view will be updated before the
    // bounce gets integrated into the avatar position. By sending it to the view
    // here, it gets fully integrated. This does increase latency somewhat for you
    // seeing the other user's bounce.
    doBounce(bounce) {
        this.say("doBounce", bounce);
    }

    doGodMode(gm) {
        this.say("doGodMode", gm);
    }

    doShoot(where) {
        const aim = v3_rotate([0,0,-1], q_axisAngle([0,1,0], where[1])); //
        const translation = v3_add(this.translation, v3_scale(aim, 5));
        const missile = MissileActor.create({parent: this.parent, pawn: "MissilePawn", translation, userColor: this.userColor, color: [...this.color]});
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
        console.log(options);
        const base = this.wellKnownModel("ModelRoot").base;

        this.color = [0.25+0.75*this.random(), 0.5, 0.25+0.75*this.random()];
        this.userColor = options.userNumber%20;
        const trans = [110 + this.random() * 10-5, 0, 155+this.random()*10-5];
        const rot = q_axisAngle([0,1,0], Math.PI/2);

        this.avatar = AvatarActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            userColor: this.userColor,
            translation: trans,
            rotation: rot,
            instanceName: 'tankTracks',
            tags: ["avatar"]
        });
        SimpleActor.create({pawn: "GeometryPawn", parent: this.avatar, userColor:this.userColor, color:this.color, instanceName:'tankBody'});
        SimpleActor.create({pawn: "GeometryPawn", parent: this.avatar, userColor:this.userColor, color:this.color, instanceName:'tankTurret'});
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
        //this.parent = SimpleActor.create({pawn: "TestPawn", parent: this.base, translation:[-12,7,-35]});
        //this.child = SimpleActor.create({pawn: "CollidePawn", parent: this.parent, translation:[0,0,4]});
        //this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        //this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        //place the bollards
        const maxSize = 15;
        for (let x=0; x<maxSize; x++) for (let y=0; y<maxSize; y++) {
            if ((x<=4 || x>=maxSize-5) && (y<=4 || y>=maxSize-5)) {
                // bottom of bollard
                const bollard = BollardActor.create( {pawn: "BollardPawn", tags: ["bollard"], instanceName:'pole', parent: this.base, obstacle: true,
                    translation:[15*bollardScale+bollardDistance*x+1.5,0, 15*bollardScale+bollardDistance*y+1.5]} );
                // the three floating parts of the bollard
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3,0]} );
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3.5,0]} );
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,4,0]} );
            }
        }
        //place the bollards

        for (let x=0; x<25; x++) for (let y=0; y<25; y++) {
            if ((y<=1 || y>=23) || (x<=1 || x>=23)) {
                // bottom of bollard
                const bollard = BollardActor.create( {pawn: "BollardPawn", tags: ["bollard"], instanceName:'pole', parent: this.base, obstacle: true,
                    translation:[bollardDistance*x+1.5,0, bollardDistance*y+1.5]} );
                // the three floating parts of the bollard
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3,0]} );
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3.5,0]} );
                SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,4,0]} );
            }
        }

        [[7-1, 7-1, -Math.PI/4],[7-1, 7+1, Math.PI/4], [7+1, 7+1, Math.PI-Math.PI/4], [7+1, 7-1, Math.PI+Math.PI/4]].forEach( xy => {
            const powerPole = BollardActor.create( {pawn: "BollardPawn", tags: ["bollard"], instanceName:'pole3', parent: this.base, obstacle: true,
            translation:[15*bollardScale+bollardDistance*xy[0]+1.5,0, 15*bollardScale+bollardDistance*xy[1]+1.5], rotation:q_axisAngle([0,1,0],xy[2])} );
            SimpleActor.create({pawn: "InstancePawn", parent: powerPole, instanceName:'pole4', translation:[5.3,20,0]} );
            SimpleActor.create({pawn: "InstancePawn", parent: powerPole, instanceName:'pole4', translation:[5.6,21,0]} );
            SimpleActor.create({pawn: "InstancePawn", parent: powerPole, instanceName:'pole4', translation:[5.9,22,0]} );
        });

        [[0,0, -Math.PI/4], [0, 74, Math.PI/4], [74, 74, Math.PI-Math.PI/4], [74,0, Math.PI+Math.PI/4]].forEach( xy => {
            const powerPole2 = BollardActor.create( {pawn: "BollardPawn", tags: ["bollard"], instanceName:'pole3', parent: this.base, obstacle: true,
            translation:[bollardScale*xy[0]+1.5,0, bollardScale*xy[1]+1.5], rotation:q_axisAngle([0,1,0],xy[2])} );
            SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.3,20,0]} );
            SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.6,21,0]} );
            SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.9,22,0]} );
        });

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
        for (let i=0; i<10; i++) for (let j=0; j<10; j++) {
            const bot = BotActor.create({translation:[95+i*3+Math.random()/2, 0.5, 55+j*3+Math.random()/2]});
            const eye = BotEyeActor.create({parent: bot});
        }
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
    }

}
MyModelRoot.register("MyModelRoot");

