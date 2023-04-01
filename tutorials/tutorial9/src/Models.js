// Tutorial 9 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, Behavior, sphericalRandom, v3_add, UserManager, User, AM_Avatar, AM_NavGrid, AM_OnNavGrid } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGrid) {

    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
        this.listen("spawn", this.doSpawn);
        this.blocks = new Set();

        this.subscribe("input", "nDown", this.reset);
    }

    reset() {

        this.navClear();

        for ( const block of this.blocks) block.destroy()

        for (let n = 0; n<1;n ++) {
            const x = this.random()*this.gridScale*this.gridSize;
            const z = this.random()*this.gridScale*this.gridSize;
            this.addBlock(x,z);
        }
    }

    addBlock(x,z) {
        const xx = this.gridScale*(Math.floor(x/this.gridScale) + 0.5);
        const zz = this.gridScale*(Math.floor(z/this.gridScale) + 0.5);
        const block = BlockActor.create({pawn:"BlockPawn", parent: this, translation: [xx,0,zz], obstacle: true});
        this.blocks.add(block);
    }

    doSpawn(xyz) {
        TestActor.create({pawn:"ClickPawn", parent: this, translation: xyz});
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- BlockActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_OnNavGrid) {
}
BlockActor.register('BlockActor');

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_OnNavGrid) {

    init(options) {
        super.init(options);
    }

}
BotActor.register('BotActor');

//------------------------------------------------------------------------------------------
//-- TestActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_OnNavGrid) {

    init(options) {
        super.init(options);
        this.listen("kill", this.doKill);
    }

    doKill() {
        if (this.dying) return; // Prevent an actor from being killed twice
        if (this.parent && this.parent.blocks) this.parent.blocks.delete(this);
        this.set({obstacle:false});
        this.dying = true;
        this.behavior.start({name: "RiseBehavior", height: 5, speed: 1});
        this.behavior.start({name: "SpinBehavior", axis: sphericalRandom(), speed: 0.2});
        this.behavior.start({name: "SequenceBehavior", behaviors:[
            {name: "InflateBehavior", size: 2, speed: 0.1},
            "DestroyBehavior"
        ]})
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar) {

    get color() { return this._color || [0.5,0.5,0.5]}

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class MyUserManager extends UserManager {
    get defaultUser() {return MyUser;}
}
MyUserManager.register('MyUserManager');


class MyUser extends User {
    init(options) {
        super.init(options)
        const base = this.wellKnownModel("ModelRoot").base
        this.color = [this.random(), this.random(), this.random()];
        this.avatar = ColorActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            translation: [0,0,10]
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
        console.log("Start model root!");

        const gridSize = 8;
        const gridScale = 3;
        const offset = -gridScale*gridSize/2;
        this.base = BaseActor.create({gridSize, gridScale, translation:[offset,0,offset]});
        this.parent = TestActor.create({pawn: "TestPawn", parent: this.base, translation:[0,1,0]});
        this.child = ColorActor.create({pawn: "ColorPawn", parent: this.parent, translation:[0,0,2]});
        this.bot = BotActor.create({pawn: "TestPawn", parent: this.base, translation:[5,0,5]});
        ColorActor.create({pawn: "ColorPawn", translation:[0,0,0]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// -- Behaviors ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class InflateBehavior extends Behavior {

    get size() { return this._size || 3}
    get speed() { return this._speed || 0.5}

    onStart () {
        this.scale = this.actor.scale[0];
    }

    do(delta) { // Increases the actor's scale until it reaches a target size
        this.scale += this.speed * delta/1000;
        this.actor.set({scale:[this.scale,this.scale,this.scale]});
        if (this.scale > this.size) this.succeed();
    }

}
InflateBehavior.register('InflateBehavior');

class RiseBehavior extends Behavior {

    get height() { return this._height || 3}
    get speed() { return this._speed || 0.5}

    onStart () {
        this.top = this.actor.translation[1] + this.height;
    }

    do(delta) { // Moves the actor up until it reaches the top
        const y = this.speed * delta/1000;
        const translation = v3_add(this.actor.translation, [0,y,0]);
        this.actor.set({translation});
        if (translation[1] > this.top) this.succeed();
    }

}
RiseBehavior.register('RiseBehavior');
