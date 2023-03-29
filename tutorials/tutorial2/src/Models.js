// Tutorial 2 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// ParentActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ParentActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
        this.subscribe("input", "zDown", this.moveLeft);
        this.subscribe("input", "xDown", this.moveRight);
    }

    moveLeft() {
        console.log("left");
        const translation = this.translation;
        translation[0] += -1
        this.set({translation});
    }

    moveRight() {
        console.log("right");
        const translation = this.translation;
        translation[0] += 1
        this.set({translation});

    }
}
ParentActor.register('ParentActor');

//------------------------------------------------------------------------------------------
// ChildActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We also define another actor that doesn't subscribe to input events.

class ChildActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We create three actors this time. A parent and two children. A child's translation is
// performed in relation to its parent.

export class MyModelRoot extends ModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        const parent = ParentActor.create({pawn: "TestPawn", translation:[0,0,0]});
        const child = ChildActor.create({pawn: "TestPawn", parent: parent, translation:[0,2,0]});

        parent.behavior.start({name: "SpinBehavior", axis: [0,0,1]});
        child.behavior.start({name: "SpinBehavior", speed: 2});
    }

}
MyModelRoot.register("MyModelRoot");
