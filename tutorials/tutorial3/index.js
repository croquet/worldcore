// World Core Tutorial 3
//
// Copyright Croquet Corporation, 2021
//
// This is the third in a series of tutorials illustrating how to build a Worldcore app. It
// assumes that you have familarity with the basics of the Croquet SDK, and understand the
// general concepts behind Worldcore. For more inforamation, see croquet.io/sdk.
//
// This tutorial shows how to create user interface elements, and create avatars that only
// respond to one user's input.

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, PM_Visible, RenderManager, DrawCall, Cube,
    v3_normalize, q_axisAngle, toRad, InputManager, q_multiply, UIManager, Widget, ButtonWidget, JoystickWidget, AM_Avatar, PM_Avatar, q_identity, q_normalize, PlayerManager, AM_Player, PM_Player } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- MyAvatar ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// This actor is extended with the Avatar and Player mixins. Avatar supports speculative
// execution by the actor's pawn, which makes user-controlled actors more responsive. Player
// allows an instance of the actor to be automatially spawned by the PlayerManager when a
// new user joins. How both these features work will be discussed in more detail below.
//
// The avatar creates its own children in its init routine. This is a better way to build
// hierarchical objects if you're going to spawn multiple instances of them.
//
// The actor also listens for messages from its pawn telling it to toggle its child on and off
// or change its child's color.

class MyAvatar extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() {return AvatarPawn}
    get color() {return this._color || [1,1,1,1]}

    init(options) {
        super.init(options);

        this.orbit = OrbitActor.create({parent: this});
        this.child = ChildActor.create({parent: this.orbit, translation: [1.5,0,0], scale: [0.5, 0.5, 0.5], color: [0, 0.7, 0.7, 1]});

        this.listen("color", this.randomColor);
        this.listen("toggle", this.toggleChild);
    }

    randomColor() {
        if (!this.child) return;
        this.child.set({color: [Math.random(), Math.random(), Math.random(), 1]});
        this.child.say("colorChanged", this.child.color);
    }

    toggleChild() {
        if(this.child) {
            this.child.destroy();
            this.child = null;
        } else {
            this.child = ChildActor.create({parent: this.orbit, translation: [1.5,0,0], scale: [0.5, 0.5, 0.5], color: [0, 0.7, 0.7, 1]});
        }
    }

}
MyAvatar.register('MyAvatar');

//------------------------------------------------------------------------------------------
//-- AvatarPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// In a multiplayer session, every user is represented by an avatar/pawn pair. But only one
// pawn on a given client "belongs" to the local user. The "isPlayerPawn" property identifies
// this pawn. Only that pawn should subscribe to local control inputs. It can then pass them
// on only to its own avatar. That way, each avatar is controlled by the user it belongs to.
//
// Speculative execution is handled by the Avatar mixin. This mixin extends the pawn with methods
// like setSpin() and moveTo(). Calling these methods sends a message to the avatar, but it also
// immediately changes the pawn's local transformation.
//
// So in this example, calling setSpin() from the pawn sets the actor's rotational velocity.
// But it also immediately applies that rotational velocity to the pawn itself. That
// means the pawn starts spinning instantly, without having to wait for the message to travel to
// the reflector and back. That makes user inputs feel more tight and responsive.
//
// The Avatar mixin also handles reconciliation of the speciulative position of the pawn with the
// correct position of the actor. This is done with the same view smoothing mechanism that normal
// smoothed pawns use.

class AvatarPawn extends mix(Pawn).with(PM_Avatar, PM_Player, PM_Visible) {
    constructor(...args) {
        super(...args);

        this.mesh = Cube(1,1,1);
        this.mesh.load();
        this.mesh.clear()
        this.setDrawCall(new DrawCall(this.mesh));

        if (this.isMyPlayerPawn) {
            this.subscribe("hud", "joy", this.joy);
            this.subscribe("input", "cDown", () => this.say("color")); // Forward these inputs to the actor
            this.subscribe("input", "dDown", () => this.say("toggle"));
            this.subscribe("hud", "color", () => this.say("color")); // We duplicate our previous keyboard events with HUD events.
            this.subscribe("hud", "toggle", () => this.say("toggle"));
        }
    }

    destroy() {
        super.destroy();
        this.mesh.destroy();
    }

    joy(xy) {
        const spin = xy[0];
        const pitch = xy[1];
        let q = q_multiply(q_identity(), q_axisAngle([0,1,0], spin * 0.005));
        q = q_multiply(q, q_axisAngle([1,0,0], pitch * 0.005));
        q = q_normalize(q);
        this.setSpin(q);
    }

}

//------------------------------------------------------------------------------------------
//-- MyPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// No change from the previous tutorial.

class MyPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {

    constructor(...args) {
        super(...args);
        this.mesh = Cube(1,1,1);
        this.setColor(this.actor.color);
        this.setDrawCall(new DrawCall(this.mesh));
        this.listen("colorChanged", this.setColor);
    }

    destroy() {
        super.destroy();
        this.mesh.destroy();
    }

    setColor(color) {
        this.mesh.setColor(color);
        this.mesh.load();
    }

}

//------------------------------------------------------------------------------------------
//-- ChildActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// No change from the previous tutorial.

class ChildActor extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return MyPawn}
    get color() {return this._color || [1,1,1,1]}

    randomColor() {
        this.set({color: [Math.random(), Math.random(), Math.random(), 1]});
        this.say("colorChanged", this.color);
    }

}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
//-- OrbitActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// No change from the previous tutorial.

class OrbitActor extends mix(Actor).with(AM_Smoothed)  {

    get pawn() {return OrbitPawn}

    init(options) {
        super.init(options);
        this.future(50).tick();
    }

    tick() {
        const q = q_axisAngle(v3_normalize([0,1,0]), toRad(4));
        const rotation = q_multiply(this.rotation, q );
        this.rotateTo(rotation);
        this.future(50).tick();
    }
}
OrbitActor.register('OrbitActor');

//------------------------------------------------------------------------------------------
//-- OrbitPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// No change from the previous tutorial.

class OrbitPawn extends mix(Pawn).with(PM_Smoothed) {}

//------------------------------------------------------------------------------------------
//-- MyPlayerManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The player manager automatically spawns a player avatar whenever a new user joins the session.
// It also automatically deletes that avatar when the player leaves. The player manager is a model-side
// service that is owned by the model root.
//
// You should overload the player manager's createPlayer() method with your own avatar-creation logic.
// This can be fairly complex. For example you could randomize where the avatar appears, or check
// to make sure that the new avatar doesn't collide with existing ones. createPlayer should
// always return a pointer to the new avatar.
//
// (Note that any initialization options must be appended to the existing options object. The player
// manager user the options object to pass its own parameters to the new avatar, and if you replace it
// entirely, the player manager won't be able to keep track of the player.)
//

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.translation = [0,0,-4];
        return MyAvatar.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// This model root is much simpler than it was in the previous tutorial. All it does is add
// the player manager as a model service. All event handling is done by the player pawn, and
// the avatar and its children are spawned automatically by the player manager.

class MyModelRoot extends ModelRoot {

    static viewRoot() { return MyViewRoot };

    createServices() {
        this.addService(MyPlayerManager);
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// This view root adds another service, the UIManager. The UIManager provides an alternate
// framework for creating a 2D user interface. Worldcore is compatible with normal HTML and CSS,
// but it's often easier to build your UI procedurally using Worldcore widgets.
//
// (An additional advantage of the Worldcore widget system is that it's driven by the same
// InputManager events as the other parts of Worldcore.)
//
// First we create the HUD. This is an empty container widget that automatically scales to match
// the size of the app window.
//
// Then we create two buttons anchored to the upper left corner. Their onClick methods are replaced
// with publish calls to broadcast that they've been pressed.
//
// Finally we create a virtual joystick in the lower right corner. The anchor and pivot options are
// used to control where the widget attaches to its parent. The joystick's onChange method is
// is replaced with a publish call to broadcast its position.

class MyViewRoot extends ViewRoot {

    constructor(model) {
        super(model);

        const HUD = new Widget(this.service("UIManager").root, {autoSize: [1,1]});

        const button1 = new ButtonWidget(HUD, {local:[20,20], size: [150,70]});
        button1.label.set({text: "Color"});
        button1.onClick = () => button1.publish("hud", "color");

        const button2 = new ButtonWidget(HUD, {local:[20,100], size: [150,70]});
        button2.label.set({text: "Toggle"});
        button2.onClick = () => button2.publish("hud", "toggle");

        const joy = new JoystickWidget(HUD, {anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [150, 150] });
        joy.onChange = xy => {this.publish("hud", "joy", xy)};
    }

    createServices() {
        this.addService(InputManager);
        this.addService(RenderManager);
        this.addService(UIManager);
    }

}

// (Try running this tutorial in multiple windows at the same time. Each window will spawn
// its own avatar, and that avatar will only respond to control inputs from the window that
// owns it.)

StartWorldcore({appId: 'io.croquet.appId', name: 'tutorial', password: 'password'});

