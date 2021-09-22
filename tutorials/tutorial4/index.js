// World Core Tutorial 4
//
// Copyright Croquet Corporation, 2021
//
// This is the fourth in a series of tutorials illustrating how to build a Worldcore app. It
// assumes that you have familarity with the basics of the Croquet SDK, and understand the
// general concepts behind Worldcore. For more inforamation, see croquet.io/sdk.
//
// This tuturial shows how to use THREE.js as your renderer, and how to create a first-person
// avatar that is driven by mouselook.
//
// (Note that because this tutorial assumes the existence of a mouse for navigation control, it
// won't be fully functional on a touch device.)

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    AM_Player, PM_Player, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, AM_MouselookAvatar,
    PM_MouselookAvatar, PM_ThreeCamera, toRad, THREE } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- MyAvatar ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The player avatar is extended with the MouselookAvatar mixin. It's similar to the regular
// Avatar mixin, but with some added functionality for controlling a first-person character.

// Specifically it breaks rotation into a pitch and a yaw component. Only the yaw is used to
// determine the facing of the avatar, but both are combined to determine the look vector
// of the camera. This creates an avatar whose motion is confined to a 2d plane, but who can
// also look up and down.

class MyAvatar extends mix(Actor).with(AM_MouselookAvatar, AM_Player) {

    get pawn() {return AvatarPawn}
    get color() {return this._color || [1,1,1,1]}

}
MyAvatar.register('MyAvatar');

//------------------------------------------------------------------------------------------
//-- AvatarPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The avatar pawn is extended with the MouselookAvatar mixin. Instead of controlling the avatar's
// facing with setSpin() was we did in the previous tutorial, we use LookTo(), which takes pitch
// and yaw values derived from the mouse position. Specifically, we use ThrottledLookTo() which
// limits how often messages are sent to the reflector. This is important because pointer events
// are generated very rapidly, and without throttling them we could flood the reflector with tiny
// incremental facing changes.
//
// We only subscribe to mouse events when we're in pointer lock mode. This is a special browser mode
// that hides the cursor and stops reporting absolute cursor position. It's a better choice when you're using
// the mouse to drive the camera directly.
//
// We also subscribe to a variety of events that will move the avatar forward and back, and side to
// to side. We track opposing movements separately so that we properly respond to competing inputs.
// (Pressing the forward and back arrows simultaneously, for example.)
//
// The pawn also is extended with the ThreeVisible and ThreeCamera mixins. The ThreeVisible
// mixin allows us to attach a Three.js object to the pawn to be rendered by the Three.js renderer.
// The mixin automatically updates the render object with the pawn's global transform. The ThreeCamera
// mixin uses uses the pawn's position to control the Three.js camera, so our view will change
// as the pawn moves.
//


class AvatarPawn extends mix(Pawn).with(PM_MouselookAvatar, PM_Player, PM_ThreeVisible, PM_ThreeCamera) {
    constructor(...args) {
        super(...args);

        this.fore = this.back = this.left = this.right = 0;

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);

        if (this.isMyPlayerPawn) {
            this.subscribe("input", "pointerLock", this.onPointerLock);
            this.subscribe("input", "wDown", () => {this.fore = 1; this.changeVelocity()});
            this.subscribe("input", "wUp", () => {this.fore = 0; this.changeVelocity()});
            this.subscribe("input", "sDown", () => {this.back = 1; this.changeVelocity()});
            this.subscribe("input", "sUp", () => {this.back = 0; this.changeVelocity()});
            this.subscribe("input", "aDown", () => {this.left = 1; this.changeVelocity()});
            this.subscribe("input", "aUp", () => {this.left = 0; this.changeVelocity()});
            this.subscribe("input", "dDown", () => {this.right = 1; this.changeVelocity()});
            this.subscribe("input", "dUp", () => {this.right = 0; this.changeVelocity()});

            this.subscribe("input", "ArrowUpDown", () => {this.fore = 1; this.changeVelocity()});
            this.subscribe("input", "ArrowUpUp", () => {this.fore = 0; this.changeVelocity()});
            this.subscribe("input", "ArrowDownDown", () => {this.back = 1; this.changeVelocity()});
            this.subscribe("input", "ArrowDownUp", () => {this.back = 0; this.changeVelocity()});
            this.subscribe("input", "ArrowLeftDown", () => {this.left = 1; this.changeVelocity()});
            this.subscribe("input", "ArrowLeftUp", () => {this.left = 0; this.changeVelocity()});
            this.subscribe("input", "ArrowRightDown", () => {this.right = 1; this.changeVelocity()});
            this.subscribe("input", "ArrowRightUp", () => {this.right = 0; this.changeVelocity()});
        }
    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    onPointerLock(inPointerLock) {
        if (inPointerLock) {
            this.subscribe("input", "pointerDelta", this.onPointerDelta);
        } else {
            this.unsubscribe("input", "pointerDelta");
        }
    }

    // The multipliers here determine how fast the player moves and turns.

    changeVelocity() {
        const velocity = [ -0.01 * (this.left - this.right), 0,  -0.01 * (this.fore - this.back)]
        this.setVelocity(velocity);
    }

    onPointerDelta(data) {
        const pitch = Math.max(-Math.PI, Math.min(Math.PI, this.lookPitch + data.xy[1] * -0.0025));
        const yaw = this.lookYaw + data.xy[0] * -0.0025;
        this.throttledLookTo(pitch, yaw);
    }

}

//------------------------------------------------------------------------------------------
// LevelActor
//------------------------------------------------------------------------------------------

// The level actor could hold simulation code. But in this case it just exists to spawn the
// level pawn with its scenery and lighting.

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
}
LevelActor.register('LevelActor');

//------------------------------------------------------------------------------------------
// LevelPawn
//------------------------------------------------------------------------------------------

// The level pawn holds all the static scenery and lighting for the scene. All of these Three.js
// objects are grouped together as one render object. A pawn can only have one root render object,
// but there is no limit to how many Three.js children that render object can have. Child objects
// can have their own rotations and offsets from the root.
//
// Worldcore does not automatically dispose of Three.js objects that you're done with. This is
// because your application may share geometry or materials between different pawns. If you use
// Three.js in Worldcore, you are responsible for disposing of unusued assets yourself. For example,
// the level pawn disposes of its geometries and materials in its destroy() method.

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        this.floorGeometry = new THREE.PlaneGeometry(60, 60);
        this.floorMaterial = new THREE.MeshStandardMaterial( {color: 0x145A32 } );
        const floor = new THREE.Mesh( this.floorGeometry, this.floorMaterial );
        floor.rotation.set(-Math.PI/2, 0, 0);
        floor.position.set(0,-0.5, 0);
        group.add(floor);

        this.pillarGeometry = new THREE.BoxGeometry( 1, 5, 1 );
        this.pillarMaterial = new THREE.MeshStandardMaterial( {color: 0x784212 } );
        const pillar0 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        group.add(pillar0);
        pillar0.position.set(29.5, 2, -29.5);
        const pillar1 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        pillar1.position.set(-29.5, 2, -29.5);
        group.add(pillar1);
        const pillar2 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        pillar2.position.set(29.5, 2, 29.5);
        group.add(pillar2);
        const pillar3 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        pillar3.position.set(-29.5, 2, 29.5);
        group.add(pillar3);

        const ambient = new THREE.AmbientLight( 0xffffff, 0.85 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.85 );
        sun.position.set(1000, 1000, 1000);
        group.add(sun);

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
        this.floorGeometry.dispose();
        this.floorMaterial.dispose();
        this.pillarGeometry.dispose();
        this.pillarMaterial.dispose();
    }
}

//------------------------------------------------------------------------------------------
//-- MyPlayerManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// When a new player avatar is spawned, it's assigned a random color and given an intial facing
// of 45 degrees. Note that we don't set the avatar's rotation directly, since its rotation
// is derived from its pitch and its yaw.

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.lookYaw = toRad(45);
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return MyAvatar.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The model root spawns the static level at start-up. The player manager then spawns avatars
// into the level as new users join.

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyPlayerManager];
    }

    init(...args) {
        super.init(...args);
        this.level = LevelActor.create();
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The THREE.js renderer is started by the ThreeRenderManager. The render manager creates the
// canvas that the renderer renders into, as well as the default scene that all the render
// objects occupy. If you want to change the render settings, you can access the
// Three.js renderer directly. For example, here we set the background to be blue.
//
// The render manager also performs some simple maintenance tasks like resizing the render
// canvas if the window changes size.
//
// The ViewRoot listens for the user clicking in the window. The browser will only let us
// enter pointerlock mode as the result of a direct user action, so we use the click event
// to request pointer lock from the input manager. Entering pointer lock publishes another
// message that we listen for in the AvatarPawn to subscribe to the mouse events that
// control the avatar's facing.
//
// (Pressing ESC cancels pointer lock.)

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager];
    }

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        this.subscribe("input", "click", () => {this.service("InputManager").enterPointerLock()});
    }

}

// Croquet defaults to 20 heartbeat ticks per second. However, since first-person avatars are
// particularly sensitive to sluggish simulation, you might find that increasing the
// tps of the session makes it feel more responsive.

StartWorldcore({
    appId: 'io.croquet.tutorial',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'tutorial',
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    tps:60
});