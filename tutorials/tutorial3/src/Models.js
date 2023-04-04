// Tutorial 3 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, q_axisAngle, q_euler, toRad } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// -- ParentActor --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We add a reset method to pop the actor back to [0,0,0] and set its rotation to 45 degrees.
// Instead of using set() to change the properties, we use snap(). Snap tells the pawn to use the
// new values without view smoothing; it's useful if you need to instantly teleport
// an actor to a new position.
//
// Note that we can snap the rotation and translation simultaneously, while the spin behavior
// continues from the actor's new orientation.
//
// Worldcore stores rotations internally as quaternions; you can create new quaternions with
// helper functions like q_euler() or q_axisAngle().

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
        const rotation = q_euler(0,0,toRad(45));
        this.snap({rotation, translation:[0,0,0]});
    }
}
ParentActor.register('ParentActor');

//------------------------------------------------------------------------------------------
// -- ChildActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ChildActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        const parent = ParentActor.create({pawn: "TestPawn", translation:[0,0,0]});
        const child = ChildActor.create({pawn: "TestPawn", parent, translation:[0,2,0]});

        parent.behavior.start({name: "SpinBehavior", axis: [0,0,1], tickRate:500});
        child.behavior.start({name: "SpinBehavior", speed: 3});
    }

}
MyModelRoot.register("MyModelRoot");
