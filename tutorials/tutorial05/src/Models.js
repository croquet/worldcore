// Tutorial 5 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, q_identity } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// -- ParentActor --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ParentActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
        this.subscribe("input", "zDown", this.moveLeft);
        this.subscribe("input", "xDown", this.moveRight);
        this.subscribe("input", "nDown", this.reset);
    }

    moveLeft() {
        console.log("left");
        const translation = this.translation;
        translation[0] += -1;
        this.set({translation});
    }

    moveRight() {
        console.log("right");
        const translation = this.translation;
        translation[0] += 1;
        this.set({translation});
    }

    reset() {
        console.log("reset");
        const rotation = q_identity();
        this.snap({rotation, translation:[0,0,0]});
    }
}
ParentActor.register('ParentActor');

//------------------------------------------------------------------------------------------
// -- ChildActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We add a color property to the ChildActor. This way of defining properties allows us to
// make use of all of Worldcore's built-in machinery for setting properties. The property
// is stored internally with an underline variable. If we never set it, the getter returns
// its default value.

class ChildActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    get color() { return this._color || [0.5,0.5,0.5]}

}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// When we create the child, we set its initial color to red.

// We also added a handler in the model root to change the child to a random color whenever "c" is pressed.
// Anytime you call random() in the the model it returns the same value everywhere. That means that
// although the new color is random, it's the SAME random color for every user. All the clients
// stay in synch.


export class MyModelRoot extends ModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        this.parent = ParentActor.create({pawn: "TestPawn", translation:[0,0,0]});
        this.child = ChildActor.create({pawn: "ColorPawn", parent: this.parent, color: [1,0,0], translation:[0,2,0]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,0,1], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", speed: 3});

        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
    }

}
MyModelRoot.register("MyModelRoot");
