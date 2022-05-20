// World Core Test
//
// Croquet Studios, 2021

import { Session, ModelRoot, ViewRoot, q_axisAngle, toRad, m4_scaleRotationTranslation, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed,  CachedObject, q_multiply, q_normalize, q_identity,  AM_Spatial, PM_Spatial, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, v3_normalize, StartWorldcore, FocusManager, PM_Focusable, m4_scale, m4_translation, m4_rotationX, m4_rotationZ,  m4_identity, PM_Predictive, AM_Predictive, GetPawn, PM_SmoothedDriver } from "@croquet/worldcore-kernel";
import {WebGLRenderManager, PM_WebGLVisible, PM_WebGLCamera, Material, DrawCall, Triangles, Sphere, Cylinder } from "@croquet/worldcore-webgl"
import { UIManager, Widget, JoystickWidget, ButtonWidget, ImageWidget, TextWidget, SliderWidget } from "@croquet/worldcore-widget";

import { AM_Behavioral, Behavior, SequenceBehavior, DelayBehavior, SelectorBehavior, InvertBehavior, PM_Behavioral } from "@croquet/worldcore-behavior";

import paper from "./assets/paper.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";

//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Predictive, AM_Player) {

    get pawn() {return MovePawn}

    init(options = {}) {
        super.init(options);
        this.child = SpinActor.create({zzz: 123, parent: this, translation: [0,1.5,0]});
    }

    test0() {
        console.log("test0");
        this.destroy();
    }

    test1() {
        console.log("test1");
        this.moveTo([0,0,-5]);
    }

}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

class MovePawn extends mix(Pawn).with(PM_Predictive, PM_WebGLVisible, PM_Player) {
    constructor(...args) {
        super(...args);

        this.setDrawCall(this.buildDraw());

        this.subscribe("hud", "joy", this.joy);
        // this.subscribe("input", "dDown", this.reset);
        // this.subscribe("input", "xDown", this.big);
        // this.subscribe("input", "cDown", this.small);

        const render = this.service("WebGLRenderManager");

    }

    buildDraw() {
        const mesh = this.buildMesh();
        const material = CachedObject("paperMaterial", this.buildMaterial);
        const draw = new DrawCall(mesh, material);
        return draw;
    }

    buildMesh() {
        const mesh = Sphere(0.5, 4, [1, 1, 1, 1]);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.texture.loadFromURL(paper);
        return material;
    }

    joy(xy) {
        const spin = xy[0];
        const pitch = xy[1];
        let q = q_multiply(q_identity(), q_axisAngle([0,1,0], spin * 0.005));
        q = q_multiply(q, q_axisAngle([1,0,0], pitch * 0.005));
        q = q_normalize(q);
        // this.setSpin(q, 100);
        this.set({spin: q}, 100)
    }

    reset() {
        this.rotateTo(q_identity());
    }

    big() {
        console.log("right");
        this.moveTo([1, 0, -5]);
    }

    small() {
        this.moveTo([0, 0, -5]);
    }

}


//------------------------------------------------------------------------------------------
// Behaviors
//------------------------------------------------------------------------------------------

class SpinBehavior extends Behavior {
    onStart() {
        this.axis = v3_normalize([2,1,3]);
        this.speed = 1;
    }

    do(delta) {
        let q = this.actor.rotation;
        q = q_multiply(q, q_axisAngle(this.axis, 0.13 * delta * this.speed / 50));
        q = q_normalize(q);
        this.actor.rotateTo(q);
        // this.actor.rotation = q;
    }
}
SpinBehavior.register("SpinBehavior");

//------------------------------------------------------------------------------------------
// SpinActor
//------------------------------------------------------------------------------------------

class SpinActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {

    get pawn() {return SpinPawn}

    init(options) {
        super.init(options);

    this.startBehavior(SpinBehavior);

    }

}
SpinActor.register('SpinActor');


//------------------------------------------------------------------------------------------
// SpinPawn
//------------------------------------------------------------------------------------------

class SpinPawn extends mix(Pawn).with(PM_SmoothedDriver, PM_WebGLVisible, PM_Behavioral) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(this.buildDraw());

        this.subscribe("input", "dDown", this.test1);
        this.subscribe("input", "sDown", this.test2);

    }

    buildDraw() {
        const mesh = this.buildMesh();
        const material = CachedObject("paperMaterial", this.buildMaterial);
        const draw = new DrawCall(mesh, material);
        return draw;
    }

    buildMesh() {
        const mesh = Cylinder(0.4, 0.75, 16, [1,1,1,1]);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.texture.loadFromURL(paper);
        return material;
    }

    test1() {
        console.log("test1!");
        this.translateTo([0, 2.5, 0]);
    }

    test2() {
        console.log("test2!");
        this.translateTo([0, 1.5, 0]);
    }
}

//------------------------------------------------------------------------------------------
// BackgroundActor
//------------------------------------------------------------------------------------------

class BackgroundActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return BackgroundPawn}

}
BackgroundActor.register('BackgroundActor');

//------------------------------------------------------------------------------------------
// BackgroundPawn
//------------------------------------------------------------------------------------------

class BackgroundPawn extends mix(Pawn).with(PM_Spatial, PM_WebGLVisible) {

    constructor(...args) {
        super(...args);

        const c =  [0.6,1,0.6,1];

        this.mesh = new Triangles();
        this.mesh.addFace([[-20, -20, -10], [20, -20, -10], [20, 20, -10], [-20, 20, -10]], [c,c,c,c], [[0,0], [25,0], [25,25], [0,25]]);
        this.mesh.load();
        this.mesh.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.setDrawCall(new DrawCall(this.mesh, this.material));
    }
}


//------------------------------------------------------------------------------------------
// Parent
//------------------------------------------------------------------------------------------

class TestActor extends Actor {

    get pawn() { return Pawn}

}
TestActor.register("TestActor");



//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    // static modelServices() {
    //     return [ MyPlayerManager];
    // }

    init(...args) {
        super.init(...args);
        console.log("Start Model!!!");

        BackgroundActor.create();
        MoveActor.create({translation: [0,0,-5]});

    }


}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [ InputManager, UIManager, WebGLRenderManager];
    }

    constructor(model) {
        super(model);
        console.log("Start View!");

        const render = this.service("WebGLRenderManager");

        render.setBackground([0.45, 0.8, 0.8, 1.0]);
        render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        render.lights.setDirectionalAim([0.2,-1,0.1]);

        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(0)), [0,0,0]);
        render.camera.setLocation(cameraMatrix);
        render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = render.aoShader;
        if (ao) {
            ao.setRadius(0.1);
            ao.density = 0.5;
            ao.falloff = 1;
        }

        const ui = this.service("UIManager");
        this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});
        this.joy = new JoystickWidget({parent: this.HUD, anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [200, 200], onChange: xy => {this.publish("hud", "joy", xy)}});

        this.button0 = new ButtonWidget({
            parent: this.HUD,
            local: [20,20],
            size: [200,80],
            label: new TextWidget({fontURL: kwark, text: "Test 0", style: "italic"}),
            onClick: () => { this.joy.set({scale: 2})}
        });

        this.button1 = new ButtonWidget({
            parent: this.HUD,
            local: [20,110],
            size: [200,80],
            label: new TextWidget({fontURL: kwark, text: "Test 1", style: "oblique"}),
            onClick: () => { this.joy.set({scale: 1})}
        });

        this.slider = new SliderWidget({
            parent: this.HUD,
            anchor: [1,0],
            pivot: [1,0],
            local: [-20,20],
            size: [20, 300],
            onChange: p => {console.log(p)}
        })

        this.image = new ImageWidget({parent: this.HUD, local: [20, 200], size: [200,80], url: llama});

    }

}

StartWorldcore({
    appId: 'io.croquet.wctest',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: 'test',
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 15,
})

