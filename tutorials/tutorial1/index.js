// World Core Tutorial 1
//
// Copyright Croquet Corporation, 2021
//
// This is the first in a series of tutorials illustrating how to build a Worldcore app. It
// assumes that you have familarity with the basics of the Croquet SDK, and understand the
// general concepts behind Worldcore. For more inforamation, see croquet.io/sdk.
//
// This tutorial shows how to set up your root model and root view, and how to create a single
// static object in the world.

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, AM_Spatial, PM_Spatial, PM_WebGLVisible, WebGLRenderManager, DrawCall, Cube,
    v3_normalize, q_axisAngle, toRad, InputManager } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- MyActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Every object in Worldcore is represened by an actor/pawn pair. Spawning an actor in the
// model automatically instantiates a corresponding pawn in the view. The actor is replicated
// across all clients, while the pawn is unique to each client.
//
// Here we define a new type of actor from the Actor base class. Our actor is extended with
// the Spatial mixin, which allows it to have a position (translation/rotation/scale) in 3D space.
//
// Note that since actors are models, they need to be registered with Croquet after they are
// defined.
//
// Every actor class should define a pawn() getter that specifies the pawn associated with it.

class MyActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return MyPawn}

}
MyActor.register('MyActor');

//------------------------------------------------------------------------------------------
//-- MyPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Here we define our actor's pawn. The pawn is also extended with the corresponding Spatial mixin.
// By giving both the actor an pawn the spatial extension, the pawn will automatically track the position
// of the actor.
//
// The pawn is also extended with the Visible mixin. This provides an interface to the WebGL renderer
// that is an optional extension to Worldcore. The method setDrawCall() is part of the Visible mixin. The pawn's
// construtor creates a polygon mesh, builds a drawcall with it, and registers the drawcall with the
// renderer.
//
// The Visible mixin does all the work of managing the draw call. It will update the transform if the
// actor changes position, and it will remove the draw call from the renderer if the actor is destroyed.


class MyPawn extends mix(Pawn).with(PM_Spatial, PM_WebGLVisible) {
    constructor(...args) {
        super(...args);
        this.mesh = Cube(1,1,1);
        this.mesh.load();    // Meshes need to be loaded to buffer them onto the graphics card
        this.mesh.clear();   // However once a mesh is loaded it can be cleared so its not taking up memory.
        this.setDrawCall(new DrawCall(this.mesh));
    }

    destroy() {
        super.destroy();
        this.mesh.destroy(); // Meshes in the WebGL renderer can be reused, so we need to explicitly destroy them when we're done with them.
    }
}

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Here we define the top-level Worldcore model. This is the model that is spawned when the Croquet
// session starts, and every actor and model service is contained within it. Your app can only have one
// model root.
//
// In this case, our model root is very simple. All it does is spawn a single actor on start-up. Note that when
// we create our actor, we pass in options to initialize it. our actor was extended with the Spatial mixin, so
// we can pass in an initial translation and rotation. The translation is a vector in 3D space, and the
// rotation is a quaternion that represents a rotation around an axis.
//
// Creating an actor returns a pointer to it. You can save the pointer if want to refer to the actor later,
// but it's not required. The model root maintains an internal list of all actors.
//
// (Try modifying the init rountine to create more actors with different initialization values.)

class MyModelRoot extends ModelRoot {

    init(...args) {
        super.init(...args);
        MyActor.create({translation: [0,0,-3], rotation: q_axisAngle(v3_normalize([1,1,1]), toRad(45))});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Here we define the top-level Worldcore view. This is the view that is spawned when the Croquet
// session starts, and every pawn and view service is contained within it. Your app can only have one
// view root.
//
// Our view root is simple like our model root. It's extended with two view services: the input manager
// and the webGL render manager. Both of these are optional. You only need the renderMananger if you're
// using pawns with the Visible mixin. If your app doesn't render anything, or uses a different
// renderer (like THREE.js), you can omit it.
//
// The InputManager catches DOM events and translates them into Croquet events you can
// subscribe to. It's not absolutely required for this tutorial, but the RenderManager uses it
// to respond to window resize events.

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, WebGLRenderManager];
    }

}

// Finally this is where we connect to our Worldcore session. This function accepts an options
// object that will be passed to Croquet's session join.
//
// StartWorldcore() should always come at the end of your source file because it depends on your model root
// and your view root.

StartWorldcore({
    appId: 'io.croquet.tutorial',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'tutorial',
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
});
