// Tutorial 0 Models

// Every object in Worldcore is represened by an actor/pawn pair. Spawning an actor
// automatically instantiates a corresponding pawn. The actor is replicated
// across all clients, while the pawn is unique to each client.

import { ModelRoot, Actor, mix, AM_Spatial } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Here we define a new actor. Actors and pawns can be extended with mixins to give them
// new methods and properties. TestActor is extended by AM_Spatial to give
// it a position in 3D space.

// The init method executes when the actor is created. In TestActor's init we create two
// subscriptions to listen for keyboard events. When any user presses 'z' the actor
// will move to the left. Pressing 'x' moves it right.

class TestActor extends mix(Actor).with(AM_Spatial) {

    init(options) {
        super.init(options);
        this.subscribe("input", "zDown", this.moveLeft);
        this.subscribe("input", "xDown", this.moveRight);
    }

    moveLeft() {
        console.log("left");
        const translation = this.translation;
        translation[0] += -0.1
        this.set({translation});
    }

    moveRight() {
        console.log("right");
        const translation = this.translation;
        translation[0] += 0.1
        this.set({translation});

    }
}
TestActor.register('TestActor'); // All Worldcore actors must be registered after they're defined.

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The model root has an init as well. It creates a single child actor. When you create an
// actor you can pass it an options object. Here we give the actor an initial translation [0,0,0],
// and tell it which pawn to use.

// Both of these properties can be changed later using set().

export class MyModelRoot extends ModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        this.test = TestActor.create({pawn: "TestPawn", translation:[0,0,0]});
    }

}
MyModelRoot.register("MyModelRoot");
