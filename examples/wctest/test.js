// World Core Test
//
// Croquet Studios, 2021

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, AM_Avatar, PM_Avatar,
    ActorManager, RenderManager, PM_Visible, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, Triangles, CachedObject, q_multiply, q_normalize, q_identity, Sphere, v3_normalize, Cylinder, AM_Spatial, PM_Spatial,Widget, BoxWidget, JoystickWidget, AudioManager, PM_Camera, AM_Player, PM_Player, PM_AudioListener, PM_AudioSource, AM_AudioSource, InputManager2, TextWidget, ButtonWidget, SliderWidget } from "@croquet/worldcore";
import paper from "./assets/paper.jpg";
import photon from "./assets/Photon.mp3";


//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Avatar, AM_AudioSource) {
    init(options) {
        super.init("MovePawn", options);
        this.setTranslation([0,0,-5]);
        const child = ChildActor.create({translation: [0,1.1,0]});
        this.q = q_identity();
        this.spin = 0;
        this.pitch = 0;
        this.addChild(child);
        this.future(50).tick();
        this.subscribe("hud", "joy", this.joy);
    }

    tick() {
        this.q = q_multiply(this.q, q_axisAngle([0,1,0], this.spin * 0.15));
        this.q = q_multiply(this.q, q_axisAngle([1,0,0], this.pitch * 0.15));
        this.q = q_normalize(this.q);
        this.rotateTo(this.q);
        this.future(50).tick();
    }

    joy(xy) {
        this.spin = xy[0];
        this.pitch = xy[1];
    }


}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

let mp;

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_InstancedVisible, PM_AudioSource) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("moveDrawCall", () => this.buildDraw()));
        mp = this;
    }

    buildDraw() {
        const mesh = CachedObject("moveMesh", () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

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
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }


}
MovePawn.register('MovePawn');


//------------------------------------------------------------------------------------------
// ChildActor
//------------------------------------------------------------------------------------------

class ChildActor extends mix(Actor).with(AM_Smoothed) {
    init(options) {
        super.init("ChildPawn", options);
        this.q = q_identity();
        this.future(50).tick();
    }

    tick() {
        const axis = v3_normalize([2,1,3]);
        this.q = q_multiply(this.q, q_axisAngle(axis, 0.13));
        this.q = q_normalize(this.q);
        this.rotateTo(this.q);
        this.future(50).tick();
    }

}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
// ChildPawn
//------------------------------------------------------------------------------------------

class ChildPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("childDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("childMesh", () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

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
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }


}
ChildPawn.register('ChildPawn');

//------------------------------------------------------------------------------------------
// FloorActor
//------------------------------------------------------------------------------------------

class FloorActor extends mix(Actor).with(AM_Spatial) {
    init(options) {
        super.init("FloorPawn", options);
    }
}
FloorActor.register('FloorActor');

//------------------------------------------------------------------------------------------
// FloorPawn
//------------------------------------------------------------------------------------------

class FloorPawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);

        const c =  [0.6,1,0.6,1];

        this.mesh = new Triangles();
        this.mesh.addFace([[-10, -10, -10], [10, -10, -10], [10, 10, -10], [-10, 10, -10]], [c,c,c,c], [[0,0], [25,0], [25,25], [0,25]]);
        this.mesh.load();
        this.mesh.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.setDrawCall(new DrawCall(this.mesh, this.material));
    }
}
FloorPawn.register('FloorPawn');

//------------------------------------------------------------------------------------------
// CameraActor
//------------------------------------------------------------------------------------------

class CameraActor extends mix(Actor).with(AM_Spatial, AM_Player) {
    init(options) {
        super.init("CameraPawn", options);

    }

}
CameraActor.register('CameraActor');

//------------------------------------------------------------------------------------------
// CameraPawn
//------------------------------------------------------------------------------------------

class CameraPawn extends mix(Pawn).with(PM_Spatial, PM_Camera, PM_Player) {
    constructor(...args) {
        super(...args);

    }


}
CameraPawn.register('CameraPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);

        FloorActor.create();
        this.move = MoveActor.create({pitch: toRad(0), yaw: toRad(0)});
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        // this.phyicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 50}));
        this.actorManager = this.addManager(ActorManager.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.ui.setScale(1);

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);
        this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalAim([0.2,-1,0.1]);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.1);
            ao.density = 0.5;
            ao.falloff = 1;
        }

        this.HUD = new Widget(this.ui.root, {autoSize: [1,1]});

        this.button0 = new ButtonWidget(this.HUD, {local: [20,20], size: [200,100]});
        this.button0.onClick = () => console.log("0");
        this.button1 = new ButtonWidget(this.HUD, {local: [20,140], size: [200,100]});
        this.button1.onClick = () => console.log("1");
        // this.slider = new SliderWidget(this.HUD, {anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [50, 300]});
        this.joy0 = new JoystickWidget(this.HUD, {anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [200, 200]});
        this.joy1 = new JoystickWidget(this.HUD, {anchor: [0,1], pivot: [0,1], local: [20,-20], size: [200, 200]});

        // this.subscribe("ui", "pointerDown", () => console.log("Down!"));
        // this.subscribe("ui", "pointerUp", () => console.log("Up!"));
        // this.subscribe("ui", "pointerMove", () => console.log("Move!"));
    }

    createManagers() {
        this.input = this.addManager(new InputManager2());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());
        this.pawnManager = this.addManager(new PawnManager());
    }

}


async function go() {

    const session = await Session.join({
        appId: 'io.croquet.wctest',
        name: 'test',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 30,
    });
}

go();
