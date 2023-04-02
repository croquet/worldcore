// Tutorial 9 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, Behavior, sphericalRandom, v3_add, UserManager, User, AM_Avatar, AM_NavGrid, AM_OnNavGrid, v3_sub, v3_distance } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We added the AM_NavGrid mixin to our base. Actors on a NavGrid can use it for
// pathfinding and finding other nearby actors. We also created a method to populate
// the NavGrid with random obstacles. An obstacle blocks all pathing into its
// grid cell.

// We made a small modification to the TestActor that spawn when you click on the base.
// Now they have the tag "mine". All actors have a tag property so you can filter them by type.

class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGrid) {

    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
        this.listen("spawn", this.doSpawn);
        this.blocks = new Set();
        this.reset();

        this.subscribe("input", "nDown", this.reset);
    }

    reset() {
        this.navClear();
        for ( const block of this.blocks) block.destroy()
        for (let n = 0; n<200;n ++) {
            const x = this.random()*this.gridScale*this.gridSize;
            const z = this.random()*this.gridScale*this.gridSize;
            this.addBlock(x,z);
        }
    }

    addBlock(x,z) {
        const xx = this.gridScale*(Math.floor(x/this.gridScale) + 0.5);
        const zz = this.gridScale*(Math.floor(z/this.gridScale) + 0.5);
        const block = BlockActor.create({pawn:"BlockPawn", parent: this, translation: [xx,1,zz], obstacle: true});
        this.blocks.add(block);
    }

    doSpawn(xyz) {
        TestActor.create({pawn:"ClickPawn", parent: this, translation: xyz, tags:["mine"]});
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- BlockActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// These are the obstacles on our NavGrid. They have the AM_OnNavGrid mixin.

class BlockActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid) {
}
BlockActor.register('BlockActor');

//------------------------------------------------------------------------------------------
//-- TestActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We added the AM_OnNavGrid to our test actor. Every actor on a nav grid is sorted into a bins
// according to the cell it's in. If you want to find nearby actors you can search in the bins
// of nearby cells on the grid.

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_OnNavGrid) {

    init(options) {
        super.init(options);
        this.listen("kill", this.doKill);
    }

    doKill() {
        if (this.dying) return; // Prevent an actor from being killed twice
        if (this.parent && this.parent.blocks) this.parent.blocks.delete(this);
        this.dying = true;
        const translation = v3_add(this.translation, [0,2,0]);
        this.set({translation});
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
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We replaced our AvatarActor with BotActor. The BotActor uses nav grid to steer around
// obstacles. It also constantly pings for nearby actors with the "mine" tag.
// If it finds one and it's less than 4m away, it kills it.
//
// The bot steers toward its target by running the PathToBehavior. PathTo succeeds when the
// bot reaches the target destination. The noise option introduces a slight wiggle to be
// the bot's path which makes it look more natural.

class BotActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar, AM_OnNavGrid) {

    get color() { return this._color || [0.5,0.5,0.5]}

    init(options) {
        super.init(options);
        this.listen("goto", this.goto)
        this.look()
    }

    look() {
        const mines = this.ping("mine", 4);
        for (const mine of mines) if (v3_distance(mine.translation, this.translation) < 4) mine.doKill();
        if (!this.doomed) this.future(50).look() // When actor is destroyed its doomed flag is set.
    }

    goto(xyz) {
        const target = v3_sub(xyz, this.parent.translation);
        if (this.path) this.path.destroy();
        this.path = this.behavior.start({name: "PathToBehavior", target, speed: 20, noise: 1});
    }

}
BotActor.register('BotActor');

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

// When a user joins the session we give them a bot to control. The bot appears at a random
// location near the center of the grid.

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser;}
}
MyUserManager.register('MyUserManager');

class MyUser extends User {
    init(options) {
        super.init(options)
        const base = this.wellKnownModel("ModelRoot").base
        const center = base.gridScale * base.gridSize / 2;
        const translation = [center - 5 + this.random()*10, 0, center- 5 + this.random()*10]
        this.color = [this.random(), this.random(), this.random()];
        this.avatar = BotActor.create({
            pawn: "BotPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            translation
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

// Note that when we create the base we give it an offset from the center of the world.
//
// For efficiency, all actors on a nav grid must always have positive coordinates.
// When you create a nav grid you should give it an offset so any actors moving on it
// will never have a negative translation.
//
// Other nav grid options:
//
//  * gridSize: the number rows and columns (grids are always square)
//  * gridScale: the size in meters of each cell
//  * subdivisions: bins can be smaller than the grid cells

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(options) {
        super.init(options);
        console.log("Start model root!");

        const gridSize = 32;
        const gridScale = 3;
        const offset = -gridScale*gridSize/2;
        this.base = BaseActor.create({gridSize, gridScale, subdivisions:1, translation:[offset,0,offset]});
        this.parent = ColorActor.create({pawn: "ColorPawn", translation:[0,1,0]});
        this.child = ColorActor.create({pawn: "ColorPawn", parent: this.parent, translation:[0,0,2]});

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
