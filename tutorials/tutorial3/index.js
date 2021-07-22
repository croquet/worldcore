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
//-- MyAvatar -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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

class AvatarPawn extends mix(Pawn).with(PM_Avatar, PM_Player, PM_Visible) {
    constructor(...args) {
        super(...args);

        this.mesh = Cube(1,1,1);
        this.mesh.load();
        this.mesh.clear()
        this.setDrawCall(new DrawCall(this.mesh));

        if (this.isMyPlayerPawn) {
            this.subscribe("hud", "joy", this.joy);
            this.subscribe("input", "cDown", () => this.say("color"));
            this.subscribe("input", "dDown", () => this.say("toggle"));
            this.subscribe("hud", "color", () => this.say("color"));
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

class ChildActor extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return MyPawn}
    get color() {return this._color || [1,1,1,1]}

    // init(options) {
    //     super.init(options);
    //     // this.subscribe("input", "cDown", this.randomColor);
    //     // this.subscribe("hud", "color", this.randomColor);
    // }

    randomColor() {
        this.set({color: [Math.random(), Math.random(), Math.random(), 1]});
        this.say("colorChanged", this.color);
    }

}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
//-- OrbitActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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

class OrbitPawn extends mix(Pawn).with(PM_Smoothed) {}

//------------------------------------------------------------------------------------------
//-- MyPlayerManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.translation = [0,0,-4];
        return MyAvatar.create(options);
        // player.orbit = OrbitActor.create({parent: player});
        // player.child = ChildActor.create({parent: player.orbit, translation: [1.5,0,0], scale: [0.5, 0.5, 0.5], color: [0, 0.7, 0.7, 1]});
        // return player;
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static viewRoot() { return MyViewRoot };

    // init(...args) {
    //     super.init(...args);

    //     // this.avatar = MyAvatar.create({translation: [0,0,-4]});
    //     // this.orbit = OrbitActor.create({parent: this.avatar});
    //     // this.child = ChildActor.create({parent: this.orbit, translation: [1.5,0,0], scale: [0.5, 0.5, 0.5], color: [0, 0.7, 0.7, 1]});

    //     // this.subscribe("input", "dDown", this.toggleChild);
    //     // this.subscribe("hud", "toggle", this.toggleChild);
    // }

    createServices() {
        this.addService(MyPlayerManager);
    }

    // toggleChild() {
    //     if(this.child) {
    //         this.child.destroy();
    //         this.child = null;
    //     } else {
    //         this.child = ChildActor.create({parent: this.orbit, translation: [1.5,0,0], scale: [0.5, 0.5, 0.5], color: [0, 0.7, 0.7, 1]});
    //     }
    // }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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

StartWorldcore({appId: 'io.croquet.appId', name: 'tutorial', password: 'password'});

