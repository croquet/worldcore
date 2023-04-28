// Drive2 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, ModelService, Behavior, v3_add, UserManager, User, AM_Avatar, q_axisAngle,
    toRad, AM_NavGrid, AM_OnNavGrid, fromS, v3_rotate, v3_scale, v3_distance, v3_sub, v3_normalize, v3_magnitude } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid, AM_Behavioral) {

    init(options) {
        super.init(options);
        this.spread = this.behavior.start({name: "SpreadBehavior", radius: 2});
        this.subscribe("hud", "go", this.go);
    }
    destroy() {
        super.destroy();
        console.log("bot destroy! "+ this.name);
    }

    go(target) {
        console.log("go!");
        target[1] = 0;
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }

        const speed = 16 + 4 * Math.random();

        this.ggg = this.behavior.start({name: "PathToBehavior", target, speed, noise:3, radius:3});
    }

}
BotActor.register("BotActor");

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGrid) {

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
//-- TestActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- BollardActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BollardActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid) {

    init(options) {
        super.init(options);
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.add(this);
        // console.log(mcm.colliders);
    }

    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }
}
BollardActor.register('BollardActor');

//------------------------------------------------------------------------------------------
//-- MissileActor --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MissileActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid, AM_Behavioral) {

    init(options) {
        super.init(options);
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.add(this);
        this.future(fromS(10)).destroy();
        this.tick();
    }

    tick() {
        this.test();
        if (!this.doomed) this.future(10).tick();
    }

    test() {
        const bollard = this.pingClosest("bollard", 2);
        if (bollard) {
            const d = v3_distance(this.translation, bollard.translation);
            if (d < 1.55) {
                // if (d<0.5) {console.log("inside")}
                const aim = v3_normalize(v3_sub(this.translation, bollard.translation));
                if (this.go) this.go.destroy();

                this.go = this.behavior.start({name: "GoBehavior", aim, speed: 30, tickRate: 20});
            }
        }

        const bot = this.pingClosest("bot", 1);
        if (bot) {
            const d = v3_distance(this.translation, bot.translation);
            if (d < 1) {
                console.log("bot hit!");
                this.destroy();
                bot.destroy();
            }
        }
    }

    translationSet(t,o) {
        super.translationSet(t,o);
        if (t[0] < 5) this.destroy(); // kill plane
        if (t[2] < 5) this.destroy();
    }

    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }
}
MissileActor.register('MissileActor');

//------------------------------------------------------------------------------------------
//-- AvatarActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar, AM_OnNavGrid) {

    get color() { return this._color || [0.5,0.5,0.5]}

    init(options) {
        super.init(options);
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.add(this);

        this.listen("shove", this.doShove);
        this.listen("shoot", this.doShoot);
    }

    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }

    doShove(v) {
        const translation = v3_add(this.translation, v);
        this.snap({translation});
    }

    multishoot(v) {
        this.doShoot(v);
        this.future(10).doShoot(v);
        this.future(20).doShoot(v);
        this.future(30).doShoot(v);
    }

    doShoot(v) {
        // console.log("shoot!");
        const aim = v3_rotate([0,0,-1], this.rotation);
        const translation = v3_add(this.translation, v3_scale(aim, 5));
        const missile = MissileActor.create({parent: this.parent, pawn: "MissilePawn", translation});
            missile.go = missile.behavior.start({name: "GoBehavior", aim, speed: 30, tickRate: 20});
    }

}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar ) {

    get color() { return this._color || [0.5,0.5,0.5]}

    init(options) {
        super.init(options);
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.add(this);

        this.listen("shove", this.doShove);
    }

    destroy() {
        super.destroy();
        const mcm = this.service("ModelCollisionManager");
        mcm.colliders.delete(this);
    }

    doShove(v) {
        const translation = v3_add(this.translation, v);
        this.snap({translation});
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
        const translation = [200-5 + this.random() * 10, 0, 200+10];
        this.avatar = AvatarActor.create({
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
        console.log("Start model root!!!");
        this.base = BaseActor.create({gridSize: 100, gridScale:3, subdivisions: 3, noise: 1});
        this.parent = TestActor.create({pawn: "TestPawn", parent: this.base, translation:[0,1,0]});
        this.child = ColorActor.create({pawn: "ColorPawn", parent: this.parent, translation:[0,0,2]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        for (let x=0; x<10; x++) {
            for (let y=0; y<10; y++) {
                BollardActor.create({pawn: "BollardPawn", tags: ["bollard"], parent: this.base, obstacle: true, translation:[60+12*x+1.5,0, 60+12*y+1.5]});
                BollardActor.create({pawn: "BollardPawn", tags: ["bollard"], parent: this.base, obstacle: true, translation:[60+12*x+1.5, 0, 60+12*y+1.5]});
            }
        }

        for (let x=0; x<100; x++) {
                // BotActor.create({pawn: "TestPawn", tags: ["bot"], parent: this.base, translation:[70+10*x,0, 70]});
                BotActor.create({pawn: "TestPawn", tags: ["bot"], parent: this.base, translation:[50,0, 50]});
        }


        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- SpreadBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SpreadBehavior extends Behavior {

    get radius() { return this._radius || 1}

    onStart() {
        this.tickRate = 500;
    }

    do() {
        const bot = this.actor.pingClosest("bot", 3);
        if (!bot) return;

        const from = v3_sub(this.actor.translation, bot.translation);
        const mag = v3_magnitude(from);
        if (mag===0) {
            const a = Math.random() * 2 * Math.PI;
            from[0] = this.radius * Math.cos(a);
            from[1] = 0;
            from[2] = this.radius* Math.sin(a);
        } else {
            from[0] = this.radius * from[0] / mag;
            from[1] = this.radius * from[1] / mag;
            from[2] = this.radius * from[2] / mag;
        }

        if (mag < this.radius) {
            if (this.actor.isBlocked(from)) return;
            const translation = v3_add(this.actor.translation, from);
            this.actor.set({translation});
        }
    }


}
SpreadBehavior.register("SpreadBehavior");

