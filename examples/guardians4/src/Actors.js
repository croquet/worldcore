// Guardian Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, ModelService, v3_add, v3_sub, v3_scale,
    UserManager, User, AM_Avatar, q_axisAngle, v3_normalize, v3_rotate, AM_Grid, AM_OnGrid } from "@croquet/worldcore";
import { BotActor } from "./Bots";
// The Guardian game is basically a 2D game. Virtually all computations in the model are 2D.
// The flat world is placed on a Perlin noise generated surface, but all interactions including
// driving and collisions are computed in 2D.

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
// This is the ground plane.
//------------------------------------------------------------------------------------------
const missileSpeed = 50;
class BaseActor extends mix(Actor).with(AM_Spatial, AM_Grid) {

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
/*
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
*/
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

class MissileActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
//      const mcm = this.service("ModelCollisionManager");
//      mcm.colliders.add(this);
        this.future(8000).destroy(); // destroy after some time
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

            const bollard = this.parent.pingAny("block", this.translation, 4, this);

            if (bollard) {

                //console.log(v_equals(this.lastTranslation,w this.translation), this.translation);
                //console.log(this.translation);
                const d2 = v_dist2Sqr(this.translation, bollard.translation);
                if (d2 < 2.5) {
                    //console.log("bollard bounce");
                    this.bounceWait = this.now()+20;
                    aim = v3_sub(this.translation, bollard.translation);
                    aim[1]=0;
                    aim = v3_normalize(aim);
                    if (this.go) this.go.destroy();

                    this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
                }
            }
            const avatar = this.parent.pingAny("avatar", this.translation, 4, this);
            if (avatar) {
                const d = v_dist2Sqr(this.translation, avatar.translation);
                if (d < 2.5) {
                    this.bounceWait = this.now()+20;
                    aim = v3_sub(this.translation, avatar.translation);
                    aim[1]=0;
                    aim = v3_normalize(aim);
                    if (this.go) this.go.destroy();
                    this.go = this.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
                    //avatar.doBounce( v3_scale(aim, -0.5) )
                    //console.log("avatar hit!");
                }
            }
        }
        this.lastTranslation = this.translation;
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

class BollardActor extends mix(Actor).with(AM_Spatial, AM_OnGrid) {

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


class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar, AM_OnGrid) {
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
        this.userColor = options.userCount%20;
        const trans = [this.random() * 10-5, 0, this.random()*10-5];
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
        const bollardScale = 3; // size of the bollard
        const bollardDistance = bollardScale*3; // distance between bollards

        this.base = BaseActor.create({gridScale: bollardScale});

        let v = [-10,0,0];
        for (let i=0; i<3;i++) {
            const p3 = Math.PI*2/3;
            this.makePowerPole(v[0],v[2],i*p3);
            v = v3_rotate( v, q_axisAngle([0,1,0], p3) );
        }

        let corner = 12;
        [[-corner,-corner, -Math.PI/4], [-corner, corner, Math.PI/4], [corner, corner, Math.PI-Math.PI/4], [corner,-corner, Math.PI+Math.PI/4]].forEach( xy => {
            this.makePowerPole(bollardDistance*xy[0]+1.5,bollardDistance*xy[1]+1.5,xy[2]);
        });

        //place the bollards
        corner--;
        for (let x=-corner; x<=corner; x++) for (let y=-corner; y<=corner; y++) {
            if ((y<=-corner+2 || y>=corner-2) || (x<=-corner+2 || x>=corner-2) || (y<=-corner+7 && x<=-corner+7)) {
                this.makeBollard(bollardDistance*x, bollardDistance*y);
            }
        }

        const ss = 200;
/*
        for (let n = 0; n < 1000; n++) {
            const x = -ss/2 + Math.floor(ss * Math.random()) + 0.5;
            const y = -ss/2 + Math.floor(ss * Math.random()) + 0.5;

            this.makeBollard(3*x, 3*y);
            //const translation = [3*x,0,3*y];
            //TestActor.create({pawn: "BlockPawn", parent: this.base, translation, tags: ["block"]});
        }
        */
        this.bots = [];
        for (let n = 0; n<1000; n++) {
            const x = -ss/2 + ss * Math.random();
            const y = -ss/2 + ss * Math.random();
            //const translation = [x*3,0, y*3];
            const index = Math.floor(20*Math.random());
            const bot = this.makeBot(x*3, y*3, index);
            //const bot = BotActor.create({parent: this.base,  index, pawn: "AvatarPawn", translation, tags: ["bot", "block"]});
            this.bots.push(bot);
        }

    }

    makeBollard(x, z) {
        const bollard = BollardActor.create( {pawn: "BollardPawn", tags: ["block"], instanceName:'pole', parent: this.base, obstacle: true,
            translation:[x, 0, z]} );
    // the three floating parts of the bollard
        SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3.5,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,4,0], perlin:true} );
    }

    makePowerPole(x, z, r) {
        const powerPole2 = BollardActor.create( {pawn: "BollardPawn", tags: ["block"], instanceName:'pole3', parent: this.base, obstacle: true,
            translation:[x, 0, z], rotation:q_axisAngle([0,1,0],r)} );
        SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.3,20,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.6,21,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.9,22,0], perlin:true} );
    }

    makeBot(x, z, index) {
        const bot = BotActor.create({parent: this.base, tags:["block", "bot"], pawn:"BotPawn", index, radius: 2, translation:[x, 0.5, z]});
        //const eye = BotEyeActor.create({parent: bot});
        return bot;
    }
}
MyModelRoot.register("MyModelRoot");

