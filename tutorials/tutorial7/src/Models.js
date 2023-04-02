// Tutorial 7 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, Behavior, sphericalRandom, v3_add, UserManager, User, AM_Avatar } from "@croquet/worldcore";

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
        const translation = [...xyz]
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
        this.listen("kill", this.doKill);
    }

    doKill() {
        if (this.dying) return; // Prevent an actor from being killed twice
        this.dying = true;
        const translation = v3_add(this.translation, [0,2,0]);
        this.set({translation});
        this.behavior.start({name: "RiseBehavior", height: 5, speed: 1});
        this.behavior.start({name: "SpinBehavior", axis: sphericalRandom(), speed: 0.2});
        this.behavior.start({name: "SequenceBehavior", behaviors:[
            {name: "InflateBehavior", size: 4, speed: 0.2},
            "DestroyBehavior"
        ]})
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We add the AM_Avatar mixin to the ColorActor. This lets us use a ColorActor as an
// avatar. Avatars have a driver property that holds the viewId of the user controlling
// them.

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar) {

    get color() { return this._color || [0.5,0.5,0.5]}

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// UserManager is a model-side service that creates a special user actor whenever someone joins
// the session. You can query the UserManager to get a list of all current users, but right now
// we're going to use the user system to spawn an avatar.

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser;}
}
MyUserManager.register('MyUserManager');

// When someone joins a session, a new user is created for them. When it starts up, the user creates
// an avatar that only that person can use. We randomly generate a color for the user, so we'll be able
// to tell avatars controlled by different people apart.

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
        this.base = BaseActor.create();
        this.parent = TestActor.create({pawn: "TestPawn", parent: this.base, translation:[0,1,0]});
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
