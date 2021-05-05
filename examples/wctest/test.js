// World Core Test
//
// Croquet Studios, 2021

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, AM_Avatar, PM_Avatar,
    ActorManager, RenderManager, PM_Visible, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, Triangles, CachedObject, q_multiply, q_normalize, q_identity, Sphere, v3_normalize, Cylinder, AM_Spatial, PM_Spatial,Widget, BoxWidget, JoystickWidget, AudioManager, PM_Camera, AM_Player, PM_Player, PM_AudioListener, PM_AudioSource, AM_AudioSource, InputManager, TextWidget, ButtonWidget, SliderWidget, TextFieldWidget, VerticalWidget, QRWidget, ImageWidget, NineSliceWidget,
    ToggleWidget, ToggleSet, GetNamedModel, HorizontalWidget } from "@croquet/worldcore";
import paper from "./assets/paper.jpg";
import llama from "./assets/llama.jpg";
import photon from "./assets/Photon.mp3";


//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Avatar, AM_AudioSource) {
    init() {
        super.init("MovePawn", {translation: [0,0,-4]});
        // console.log("Creating child!");
        // const child = ChildActor.create({parent: this, translation: [0,1.1,0]});

        // console.log(child.translation);
        // this.q = q_identity();
        // this.spin = 0;
        // this.pitch = 0;
        // this.addChild(child);
        // this.future(50).tick();
        // this.subscribe("hud", "joy", this.joy);
        this.subscribe("input", "qDown",  () => this.destroy());
    }

    // tick() {
    //     this.q = q_multiply(this.q, q_axisAngle([0,1,0], this.spin * 0.15));
    //     this.q = q_multiply(this.q, q_axisAngle([1,0,0], this.pitch * 0.15));
    //     this.q = q_normalize(this.q);
    //     this.rotateTo(this.q);
    //     this.future(50).tick();
    // }

    // joy(xy) {
    //     this.spin = xy[0];
    //     this.pitch = xy[1];
    // }


}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_InstancedVisible, PM_AudioSource) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("moveDrawCall", () => this.buildDraw()));
        this.subscribe("hud", "joy", this.joy);
    }

    buildDraw() {
        const mesh = CachedObject("moveMesh", () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const mesh = Sphere(0.5, 8, [1, 1, 1, 1]);

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

    joy(xy) {
        const spin = xy[0];
        const pitch = xy[1];
        let q = q_multiply(q_identity(), q_axisAngle([0,1,0], spin * 0.005));
        q = q_multiply(q, q_axisAngle([1,0,0], pitch * 0.005));
        q = q_normalize(q);
        this.setSpin(q);
    }


}
MovePawn.register('MovePawn');


//------------------------------------------------------------------------------------------
// ChildActor
//------------------------------------------------------------------------------------------

class ChildActor extends mix(Actor).with(AM_Avatar) {
    init(options) {
        super.init("ChildPawn", options);
        // this.q = q_identity();
        // this.future(50).tick();
        this.mp = this.parent;
        // console.log(mp);
        this.subscribe("input", "dDown", this.rot0);
        this.subscribe("input", "fDown", this.rot1);
        this.subscribe("input", "gDown", () => this.set({parent: this.mp}));
        // this.subscribe("input", "gDown", () => console.log(this.mp));
        this.subscribe("input", "hDown", () => this.set({parent: null}));
    }

    tick() {
        const axis = v3_normalize([2,1,3]);
        let q = this.rotation;
        q = q_multiply(q, q_axisAngle(axis, 0.13));
        q = q_normalize(q);
        // console.log(this.rotation);
        this.rotateTo(q);
        this.future(50).tick();
    }

    rot0() {
        this.setRotation(q_identity());
    }

    rot1() {
        this.setRotation(q_axisAngle([1,0,0], 0.13));
    }

}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
// ChildPawn
//------------------------------------------------------------------------------------------

class ChildPawn extends mix(Pawn).with(PM_Avatar, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("childDrawCall", () => this.buildDraw()));

        // console.log(this.scale);
        // console.log(this.rotation);
        // console.log(this.translation);
        // console.log(this.local);
        // console.log(this.global);
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

    // refresh() {
    //     console.log("child refresh");
    //     super.refresh();
    // }

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
// // CameraActor
// //------------------------------------------------------------------------------------------

// class CameraActor extends mix(Actor).with(AM_Spatial, AM_Player) {
//     init(options) {
//         super.init("CameraPawn", options);

//     }

// }
// CameraActor.register('CameraActor');

// //------------------------------------------------------------------------------------------
// // CameraPawn
// //------------------------------------------------------------------------------------------

// class CameraPawn extends mix(Pawn).with(PM_Spatial, PM_Camera, PM_Player) {
//     constructor(...args) {
//         super(...args);

//     }

// }
// CameraPawn.register('CameraPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Start Model!");
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

        const cameraMatrix = m4_scalingRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(0)), [0,0,-1]);
        this.render.camera.setLocation(cameraMatrix);
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);


        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.1);
            ao.density = 0.5;
            ao.falloff = 1;
        }

        this.HUD = new Widget(this.ui.root, {autoSize: [1,1]});
        this.vertical = new VerticalWidget(this.HUD, {local: [20,120], size: [200,300], margin: 10})


        this.button0 = new ToggleWidget();
        this.button1 = new ToggleWidget();
        this.image = new ImageWidget(null, {url: llama});
        // this.joyC = new JoystickWidget(null);

        this.toggleSet = new ToggleSet(this.button0, this.button1);

        this.vertical.addSlot(this.button1);
        this.vertical.addSlot(this.image);
        // this.vertical.addSlot(this.joyC);
        this.vertical.addSlot(this.button0);

        // this.horizontal = new HorizontalWidget(this.HUD, {anchor: [0,1], pivot: [0,1], local: [20,-20], size: [400,150]})
        this.box = new Widget(this.HUD, {anchor: [0,1], pivot: [0,1], local: [20,-20], size: [400,150]})



        // this.joyA = new JoystickWidget(this.box, {size: [50,50], autoSize: [0,1], anchor: [0,0], pivot: [0,0], lockAspectRatio: true});
        // this.joyB = new JoystickWidget(this.box, {size: [100,100], autoSize: [0,1], anchor: [1,0], pivot: [1,0], lockAspectRatio: true});
        // this.slider = new SliderWidget(null);

        // this.horizontal.addSlot(this.joyA);
        // this.horizontal.addSlot(this.joyB);
        // this.horizontal.markChanged();
        // this.horizontal.addSlot(this.image);

        // this.horizontal.addSlot(this.button0);
        // this.horizontal.addSlot(this.image);
        // this.horizontal.addSlot(this.button1);
        // this.joyA.markChanged();

        // this.button0.onClick = () => console.log("0");
        // this.button1 = new ButtonWidget(this.HUD, {local: [20,140], size: [200,100]});
        // this.button1.onClick = () => console.log("1");
        // this.sliderx = new SliderWidget(this.HUD, {anchor: [1,0], pivot: [1,0], local: [-20, 20], size: [50, 300], throttle: 100});
        // this.slider.onChange = p => console.log(p);
        this.joy0 = new JoystickWidget(this.HUD, {anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [200, 200]});
        this.joy0.onChange = xy => {this.publish("hud", "joy", xy)};
        // this.joy1 = new JoystickWidget(this.HUD, {anchor: [0,1], pivot: [0,1], local: [20,-20], size: [200, 200]});

        // this.field = new TextFieldWidget(this.HUD, {local:[20,20], size: [300, 40]});
        // this.field.text.setText("Hello World!");

        // this.subscribe("ui", "pointerDown", () => console.log("Down!"));
        // this.subscribe("ui", "pointerUp", () => console.log("Up!"));
        // this.subscribe("ui", "pointerMove", () => console.log("Move!"));

        // this.subscribe("input", "dDown", () => { console.log("ddd"); this.field.entry.toggleVisible()});
    }

    createManagers() {
        this.input = this.addManager(new InputManager(this.model));
        // this.input = this.addManager(new WebInputManager(this.model));
        this.render = this.addManager(new RenderManager(this.model));
        this.ui = this.addManager(new UIManager(this.model));
        this.pawnManager = this.addManager(new PawnManager(this.model));
    }

}


async function go() {

    const session = await Session.join({
        appId: 'io.croquet.wctest',
        name: 'test',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 15,
    });
}

go();
