// Guardian Actors
// Copyright (c) 2023 CROQUET CORPORATION
// The Guardian game is basically a 2D game. Virtually all computations in the model are 2D.
// The flat world is placed on a Perlin noise generated surface in the view, but all interactions including
// driving and collisions are computed in 2D.

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, v3_add, v3_sub, v3_scale,
    UserManager, User, AM_Avatar, q_axisAngle, v3_normalize, v3_rotate, AM_Grid, AM_OnGrid } from "@croquet/worldcore";

const v_dist2Sqr = function (a,b) {
    const dx = a[0] - b[0];
    const dy = a[2] - b[2];
    return dx*dx+dy*dy;
};

const v_mag2Sqr = function (a) {
    return a[0]*a[0]+a[2]*a[2];
}
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
// HealthCoinActor ---------------------------------------------------------------------------
// Displays the current state of health of the tower in a spinning coin
//------------------------------------------------------------------------------------------

class HealthCoinActor extends mix(Actor).with(AM_Spatial) {
    init(...args) {
        super.init(...args);
        this.angle = 0;
        this.deltaAngle = 0.1;
        this.spin();
    }

    spin() {
        this.angle+=this.deltaAngle;
        this.set({rotation: q_axisAngle([0,1,0], this.angle)});
        this.future(100).spin();
    }

    get pawn() {return "HealthCoinPawn"}
}

HealthCoinActor.register('HealthCoinActor');

//------------------------------------------------------------------------------------------
// FireballActor ---------------------------------------------------------------------------
// Bot explosions - small one when you shoot them, big one when they suicide at the tower
//------------------------------------------------------------------------------------------

class FireballActor extends mix(Actor).with(AM_Spatial) {
    init(...args) {
        super.init(...args);
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.future(200).destroy();
    }

    get pawn() {return "FireballPawn"}
}
FireballActor.register('FireballActor');

//------------------------------------------------------------------------------------------
// BotActor --------------------------------------------------------------------------------
// The bad guys - they try to get to the tower to blow it up
//------------------------------------------------------------------------------------------
class BotActor extends mix(Actor).with(AM_Spatial, AM_OnGrid, AM_Behavioral) {

    get index() {return this._index || 0}

    init(options) {
        super.init(options);
        this.radius = 5;
        this.radiusSqr = this.radius*this.radius;
        this.doFlee();
        this.go([0,0,0]);
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

    killMe(s=0.3, onTarget) {
        FireballActor.create({translation:this.translation, scale:[s,s,s], onTarget});
        this.publish("bots","destroyedBot", onTarget);
        this.destroy();
    }

    resetGame() {
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }
        this.destroy();
    }

    doFlee() {
        // blow up at the tower
        if ( v_mag2Sqr(this.translation) < 20 ) this.killMe(1, true);
        // otherwise, check if we need to move around an object
        if (!this.doomed) {
            this.future(100).doFlee();
            const blockers = this.pingAll("block");
            if (blockers.length===0) return;
            blockers.forEach(blocker => this.flee(blocker));
        }
    }

    flee(bot) {
        const from = v3_sub(this.translation, bot.translation);
        const mag2 = v_mag2Sqr(from);
        if (mag2 > this.radiusSqr) return;
        if (mag2===0) {
            const a = Math.random() * 2 * Math.PI;
            from[0] = this.radius * Math.cos(a);
            from[1] = 0;
            from[2] = this.radius* Math.sin(a);
        } else {
            let mag = Math.sqrt(mag2);
            if (bot.isAvatar) mag/=2;
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
//--SimpleActor ----------------------------------------------------------------------------
// All purpose actor for adding bits to other, smarter actors
//------------------------------------------------------------------------------------------

class SimpleActor extends mix(Actor).with(AM_Spatial) {

    init(options) {
        super.init(options);
    }
    get userColor() { return this._userColor }

}
SimpleActor.register('SimpleActor');

//------------------------------------------------------------------------------------------
//--GridActor ------------------------------------------------------------------------------
// Actors that place themselves on the grid so other actors can avoid them
//------------------------------------------------------------------------------------------

class GridActor extends mix(Actor).with(AM_Spatial, AM_OnGrid) {

    init(options) {
        super.init(options);
    }
}
GridActor.register('GridActor');

//------------------------------------------------------------------------------------------
//--MissileActor ---------------------------------------------------------------------------
// Fired by the tank - they destroy the bots but bounce off of everything else
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

    resetGame() {
        console.log("destroy the missile");
        this.destroy();
    }

    get userColor() { return this._userColor }

    tick() {
        this.test();
        if (!this.doomed) this.future(10).tick();
    }

    test() {

        if (this.now()>=this.bounceWait) {
            let aim;

            const bot = this.parent.pingAny("bot", this.translation, 4, this);

            if (bot) {
                const d2 = v_dist2Sqr(this.translation, bot.translation);
                if (d2 < 3.5) {
                    bot.killMe(0.3, false);
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
}
MissileActor.register('MissileActor');

//------------------------------------------------------------------------------------------
//-- AvatarActor ---------------------------------------------------------------------------
// This is you. Most of the control code for the avatar is in the pawn in Avatar.js.
//------------------------------------------------------------------------------------------

class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Avatar, AM_OnGrid) {
    init(options) {
        super.init(options);
        this.isAvatar = true;
        this.listen("shoot", this.doShoot);
        this.subscribe("all", "godMode", this.doGodMode);
    }

    get userColor() { return this._userColor }
    get color() { return this._color || [0.5,0.5,0.5]}

    doGodMode(gm) {
        this.say("doGodMode", gm);
    }

    doShoot(where) {
        const aim = v3_rotate([0,0,-1], q_axisAngle([0,1,0], where[1])); //
        const translation = v3_add(this.translation, v3_scale(aim, 5));
        const missile = MissileActor.create({parent: this.parent, pawn: "MissilePawn", translation, userColor: this.userColor, color: [...this.color]});
        missile.go = missile.behavior.start({name: "GoBehavior", aim, speed: missileSpeed, tickRate: 20});
    }

    resetGame() { // don't go home at end of game
        // this.say("goHome");
    }
}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
// Create a new avatar when a new user joins.
//------------------------------------------------------------------------------------------

class MyUserManager extends UserManager {
    init() {
        super.init();
        this.props = new Map();
        this.propsTimeout = 60*60*1000; // 1 hour
    }

    get defaultUser() {return MyUser}

    createUser(options) {
        const { userId } = options;
        // restore saved props
        const saved = this.props.get(userId);
        if (saved) {
            options = {...options, savedProps: saved.props};
            this.props.delete(userId);
        }
        // delete old saved props
        const expired = this.now() - this.propsTimeout;
        for (const [userId, {lastSeen}] of this.props) {
            if (lastSeen < expired) {
                this.props.delete(userId);
            }
        }
        return super.createUser(options);
   }

    destroyUser(user) {
        const props = user.saveProps();
        if (props) {
            this.props.set(user.userId, {props, lastSeen: this.now()});
        }
        super.destroyUser(user);
    }
}
MyUserManager.register('MyUserManager');

class MyUser extends User {
    init(options) {
        super.init(options);
        console.log(options);
        const base = this.wellKnownModel("ModelRoot").base;

        const props = options.savedProps || {
            userColor: options.userNumber%24,
            translation: [this.random() * 10-5, 0, this.random()*10-5],
            rotation: q_axisAngle([0,1,0], Math.PI/2),
        }

        this.avatar = AvatarActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            instanceName: 'tankTracks',
            tags: ["avatar", "block"],
            ...props
        });
        SimpleActor.create({pawn: "GeometryPawn", parent: this.avatar, userColor: props.userColor, instanceName:'tankBody'});
        SimpleActor.create({pawn: "GeometryPawn", parent: this.avatar, userColor: props.userColor, instanceName:'tankTurret'});
    }

    saveProps() {
        const { color, userColor, translation, rotation } = this.avatar;
        return { color, userColor, translation, rotation };
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
    }
}
MyUser.register('MyUser');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
// Construct the world, manage global game state.
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(options) {
        super.init(options);
        this.subscribe("stats", "update", this.updateStats);
        this.subscribe("bots","destroyedBot", this.destroyedBot);
        this.subscribe("game", "endGame", this.endGame);
        this.subscribe("game", "startGame", this.startGame);
        this.subscribe("game", "bots", this.demoBots);
        this.subscribe("game", "undying", this.undying);
        this.demoMode = false;

        const bollardScale = 3; // size of the bollard
        const bollardDistance = bollardScale*3; // distance between bollards

        this.base = BaseActor.create({gridScale: bollardScale});
        this.maxBots = 1000;
        this.spawnRadius = 400;
        this.totalBots = 0;
        this.health = 100;
        let v = [-10,0,0];

        // place the fins for collisions
        for (let i=0; i<3; i++) {
            const p3 = Math.PI*2/3;
            this.makeSkyscraper(v[0], 0, v[2],i*p3-Math.PI/2, -1, 1.5);
            v = v3_rotate( v, q_axisAngle([0,1,0], p3) );
        }

        HealthCoinActor.create({pawn: "HealthCoinPawn", parent: this.base, instanceName:'healthCoin', translation:[0,20,0]} );

        let corner = 12;
        [[-corner,-corner, Math.PI/2-Math.PI/4], [-corner, corner, Math.PI/2+Math.PI/4], [corner, corner, Math.PI/2+Math.PI-Math.PI/4], [corner,-corner, Math.PI/2+Math.PI+Math.PI/4]].forEach( xy => {
            this.makeSkyscraper(bollardDistance*xy[0]+1.5, 0, bollardDistance*xy[1]+1.5,xy[2], 5, 1.5);
        });

        //place the bollards
        corner--;
        for (let x=-corner; x<=corner; x++) for (let y=-corner; y<=corner; y++) {
            if ((y<=-corner+2 || y>=corner-2) || (x<=-corner+2 || x>=corner-2) || (y<=-corner+7 && x<=-corner+7)) {
                this.makeBollard(bollardDistance*x, bollardDistance*y);
            }
        }
        const d = 290;
        // the main tower
        this.makeSkyscraper( 0, -1.2, 0, -0.533, 0);
        this.makeSkyscraper( 0, 0,  d, Math.PI/2, 1, 0);
        this.makeSkyscraper( 0, 0, -d, 0, 2, 0);
        this.makeSkyscraper( d, 0,  0, 0, 3, 0);
        this.makeSkyscraper(-d-10, -2,  -8, Math.PI+2.5, 4, 0);
        this.startGame();
    }

    undying() {
        this.demoMode = !this.demoMode;
        console.log("demo mode is:", this.demoMode?"on":"off");
    }

    startGame() {
        console.log("Start Game");
        this.wave = 0;
        this.totalBots = 0;
        this.health = 100;
        this.gameEnded = false;
        this.updateStats();
        this.publish("game", "gameStarted"); // alert the users to remove the start button
        this.makeWave(1,10);
    }

    endGame() {
        console.log("End Game");
        this.gameEnded = true;
        this.service('ActorManager').actors.forEach( value => {if (value.resetGame) value.future(0).resetGame();});
    }

    demoBots( numBots ) {
        this.makeWave(0, numBots);
    }

    updateStats() {
        this.publish("stats", "wave", this.wave);
        this.publish("stats", "bots", this.totalBots);
        this.publish("stats", "health", this.health);
        if (this.gameEnded) this.publish("user", "endGame");
    }

    makeWave( wave, numBots ) {
        if (this.gameEnded) return;
        let actualBots = Math.min(this.maxBots, numBots);
        if ( this.totalBots + actualBots > this.maxBots) actualBots = this.maxBots-this.totalBots;
        this.totalBots += actualBots;
        this.wave = wave;
        this.publish("stats", "wave", wave);
        this.publish("stats", "bots", this.totalBots);
        const r = this.spawnRadius; // radius of spawn
        const a = Math.PI*2*Math.random(); // come from random direction
        for (let n = 0; n<actualBots; n++) {
            const aa = a + (0.5-Math.random())*Math.PI/4; // angle +/- Math.PI/4 around r
            const rr = r+100*Math.random();
            const x = Math.sin(aa)*rr;
            const y = Math.cos(aa)*rr;
            const index = Math.floor(20*Math.random());
            // stagger when the bots get created
            this.future(Math.floor(Math.random()*200)).makeBot(x, y, index);
        }
        if (wave>0) this.future(30000).makeWave(wave+1, Math.floor(numBots*1.2));
    }

    destroyedBot( onTarget ) {
        this.totalBots--;
        if (onTarget && !this.demoMode) {
            this.health--;
            this.publish("stats", "health", this.health);
            if (this.health === 0 ) {
                console.log("publish the endGame");
                this.publish("game", "endGame");
            }
        }
        this.publish("stats", "bots", this.totalBots);
    }

    makeBollard(x, z) {
        GridActor.create( {pawn: "InstancePawn", tags: ["block"], instanceName:'bollard', parent: this.base,
            obstacle:true, viewObstacle:true, perlin: true, radius:1.5, translation:[x, 0, z]} );
    }

    makeSkyscraper(x, y, z, r, index, radius) {
        console.log("makeSkyscraper", r, q_axisAngle([0,1,0],r));
        GridActor.create( {pawn: "TowerPawn", tags: ["block"], parent: this.base, index, obstacle: true,
            radius, translation:[x, y, z], height:y, rotation:q_axisAngle([0,1,0],r)} );
    }

    makeBot(x, z, index) {
        const bot = BotActor.create({parent: this.base, tags:["block", "bot"], pawn:"BotPawn", index, radius: 2, translation:[x, 0.5, z]});
        const eye = SimpleActor.create({parent: bot, pawn:"BotEyePawn"});
        return bot;
    }
}
MyModelRoot.register("MyModelRoot");