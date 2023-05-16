// Guardian Actors
// Copyright (c) 2023 CROQUET CORPORATION
import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, ModelService, v3_add, v3_sub, v3_scale,
    UserManager, User, AM_Avatar, q_axisAngle, v3_magnitude, v3_normalize, v3_rotate, AM_Grid, AM_OnGrid } from "@croquet/worldcore";
// The Guardian game is basically a 2D game. Virtually all computations in the model are 2D.
// The flat world is placed on a Perlin noise generated surface in the view, but all interactions including
// driving and collisions are computed in 2D.

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
// This is the ground plane.
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_Grid) {

    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
    }
}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
// FireballActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FireballActor extends mix(Actor).with(AM_Spatial) {
    init(...args) {
        super.init(...args);
        //this.fireUpdate();
        this.fireballVisible = false;
        //this.subscribe("menu","FireballToggle", this.fireballToggle);
        this.timeOffset = Math.random()*100;
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.counter = 0;
        this.maxCounter = 5;
        this.fireScale = 0.1;
        this.scale = [0.2,0.2, 0.2];
        this.future(200).destroy();
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
class BotActor extends mix(Actor).with(AM_Spatial, AM_OnGrid, AM_Behavioral) {

    get index() {return this._index || 0}

    init(options) {
        super.init(options);
        this.radius = 1.5;
        this.doFlee();
        this.go([0,0,0]);
        this.subscribe("bots", "resetBots", this.reset);
    }

    go(target) {
        // console.log(target);
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }
        const speed = (16 + 4 * Math.random());
        this.ggg = this.behavior.start( {name: "GotoBehavior", target, speed, noise:2, radius:1} );
    }

    // this is to reset the bots for testing
    reset() {
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }
        const ss = 200;
        const x = -ss/2 + ss * Math.random();
        const z = -ss/2 + ss * Math.random();
        const translation = [3*x, 0, 3*z];
        this.set({translation});
        this.go([0,0,0]);
    }

    killMe() {
        FireballActor.create({translation:this.translation});
        this.publish("bots","destroyBot");
        this.destroy();
    }

    doFlee() {
        if (!this.doomed) {
            this.future(100).doFlee();
            const bots = this.pingAll("block", 0);
            if (bots.length===0) return;
            bots.forEach(bot => this.flee(bot));
        }
    }

    flee(bot) {
        const from = v3_sub(this.translation, bot.translation);
        const mag = v3_magnitude(from);
        if (mag > this.radius) return;
        if (mag===0) {
            const a = Math.random() * 2 * Math.PI;
            from[0] = this.radius * Math.cos(a);
            from[1] = 0;
            from[2] = this.radius* Math.sin(a);
        } else {
            from[0] = this.radius * from[0] / mag;
            from[1] = 0;
            from[2] = this.radius * from[2] / mag;
        }
        const translation = v3_add(this.translation, from);
        this.set({translation});
    }

}

BotActor.register("BotActor");
 
//------------------------------------------------------------------------------------------
//--SimpleActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SimpleActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
    }
    get userColor() { return this._userColor }
    //get color() { return this._color || [0.5,0.5,0.5]}
}
SimpleActor.register('SimpleActor');

//------------------------------------------------------------------------------------------
//--GridActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GridActor extends mix(Actor).with(AM_Spatial, AM_OnGrid) {

    init(options) {
        super.init(options);
    }
}
GridActor.register('GridActor');

//------------------------------------------------------------------------------------------
//--MissileActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
const missileSpeed = 75;

class MissileActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
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

            const bot = this.parent.pingAny("bot", this.translation, 4, this);

            if (bot) {
                const d2 = v_dist2Sqr(this.translation, bot.translation);
                if (d2 < 3.5) {
                    bot.killMe();
                    this.destroy();
                    return;
                }
            }

            const bollard = this.parent.pingAny("block", this.translation, 4, this);

            if (bollard) {
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
        if (!this.doomed) {
            this.translateTo(v3_add(this.translation, this._velocity));
            this.future(100).step();
        }
    }
}
MissileActor.register('MissileActor');

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
            tags: ["avatar", "block"]
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
        this.maxBots = 1000;
        this.spawnRadius = 400;
        this.totalBots = 0;

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
        this.subscribe("bots","destroyBot", this.destroyBot);
        this.makeWave(1, 10);
    }

    makeWave( wave, numBots ) {
        let actualBots = Math.min(this.maxBots, numBots);
        if ( this.totalBots + actualBots > this.maxBots) actualBots = this.maxBots-this.totalBots;
        this.totalBots += actualBots;
        console.log("WAVE#:",wave, "BOTS:", actualBots, "TOTAL:", this.totalBots);
        const r = this.spawnRadius; // radius of spawn
        const a = Math.PI*2*Math.random(); // come from random direction
        for (let n = 0; n<actualBots; n++) {
            const aa = a + (0.5-Math.random())*Math.PI/4; // angle +/- Math.PI/4 around r
            const rr = r+100*Math.random();
            const x = Math.sin(aa)*rr;
            const y = Math.cos(aa)*rr;
            const index = Math.floor(20*Math.random());
            // stagger when the bots get created
            const bot = this.future(Math.floor(Math.random()*200)).makeBot(x, y, index);
        }
        this.future(30000).makeWave(wave+1, Math.floor(numBots*1.2));
    }

    destroyBot() {
        this.totalBots--;
        console.log("bot's left:", this.totalBots);
    }

    makeBollard(x, z) {
        const bollard = GridActor.create( {pawn: "BollardPawn", tags: ["block"], instanceName:'pole', parent: this.base, obstacle: true,
            translation:[x, 0, z]} );
    // the three floating parts of the bollard
        SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,3.5,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: bollard, instanceName:'pole2', translation:[0,4,0], perlin:true} );
    }

    makePowerPole(x, z, r) {
        const powerPole2 = GridActor.create( {pawn: "BollardPawn", tags: ["block"], instanceName:'pole3', parent: this.base, obstacle: true,
            translation:[x, 0, z], rotation:q_axisAngle([0,1,0],r)} );
        SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.3,20,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.6,21,0], perlin:true} );
        SimpleActor.create({pawn: "InstancePawn", parent: powerPole2, instanceName:'pole4', translation:[5.9,22,0], perlin:true} );
    }

    makeBot(x, z, index) {
        const bot = BotActor.create({parent: this.base, tags:["block", "bot"], pawn:"BotPawn", index, radius: 2, translation:[x, 0.5, z]});
        const eye = SimpleActor.create({parent: bot, pawn:"BotEyePawn"});
        return bot;
    }
}
MyModelRoot.register("MyModelRoot");