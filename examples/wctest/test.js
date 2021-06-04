// World Core Test
//
// Croquet Studios, 2021

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, UIManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    PM_InstancedVisible, GetNamedView, AM_Smoothed, PM_Smoothed,
    ActorManager, RenderManager, PM_Visible, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, Triangles, CachedObject, q_multiply, q_normalize, q_identity, Sphere, v3_normalize, Cylinder, AM_Spatial, PM_Spatial,Widget, JoystickWidget, InputManager, VerticalWidget, ImageWidget,
    ToggleWidget, ToggleSet, AM_Avatar, PM_Avatar, AM_Behavioral, Behavior, BehaviorManager, SequenceBehavior, ParallelSequenceBehavior, ParallelSelectorBehavior, SelectorBehavior, ShowBehaviorRegistry, Shuffle, RandomSequenceBehavior, InvertBehavior, LoopBehavior, ParallelPrimaryBehavior, DelayBehavior, RandomSelectorBehavior, DestroyBehavior  } from "@croquet/worldcore";
import paper from "./assets/paper.jpg";
import llama from "./assets/llama.jpg";


//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Avatar) {

    get pawn() {return MovePawn}

    init() {
        super.init({translation: [0,0,-5]});
        this.child = ChildActor.create({parent: this, translation: [0,1.1,0]});
        this.subscribe("input", "qDown",  this.test);
        this.subscribe("input", "wDown",  this.test2);
    }

    test() {
        this.child.set({parent: null});
    }

    test2() {
        this.child.set({parent: this});
    }

}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_InstancedVisible) {
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

    joy(xy) {
        const spin = xy[0];
        const pitch = xy[1];
        let q = q_multiply(q_identity(), q_axisAngle([0,1,0], spin * 0.005));
        q = q_multiply(q, q_axisAngle([1,0,0], pitch * 0.005));
        q = q_normalize(q);
        this.setSpin(q);
    }


}
// MovePawn.register('MovePawn');


//------------------------------------------------------------------------------------------
// ChildActor
//------------------------------------------------------------------------------------------

class SpinBehavior extends Behavior {
    do(delta) {
        const axis = v3_normalize([2,1,3]);
        let q = this.actor.rotation;
        q = q_multiply(q, q_axisAngle(axis, 0.13 * delta / 50));
        q = q_normalize(q);
        this.actor.rotateTo(q);
    }
}
SpinBehavior.register("SpinBehavior");

class ChildActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {

    get pawn() {return ChildPawn}

    init(options) {
        super.init(options);

        this.startBehavior(SpinBehavior);

        this.subscribe("input", "1Down",  this.test1);
        this.subscribe("input", "2Down",  this.test2);
    }

    test1() {
        // console.log("1");
        // this.set({translation: [0,1.1,0]});
        // console.log(this.translation);
    }

    test2() {
        // this.set({translation: [0,1.5,0]});
        // console.log(this.translation);
    }



}
ChildActor.register('ChildActor');

// console.log(ChildActor.types());

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
// ChildPawn.register('ChildPawn');

//------------------------------------------------------------------------------------------
// FloorActor
//------------------------------------------------------------------------------------------

class FloorActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return FloorPawn}
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
// FloorPawn.register('FloorPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Start Model!!!");
        FloorActor.create();
        this.move = MoveActor.create({pitch: toRad(0), yaw: toRad(0)});
        this.subscribe("input", "tap", this.onTap);
    }

    onTap(event) {
        // console.log("tap!");
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.actorManager = this.addManager(ActorManager.create());
        // this.behaviorManager = this.addManager(BehaviorManager.create());
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

        const cameraMatrix = m4_scalingRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(0)), [0,0,5]);
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
        this.vertical.addSlot(this.button0);

        this.box = new Widget(this.HUD, {anchor: [0,1], pivot: [0,1], local: [20,-20], size: [400,150]})

        this.joy0 = new JoystickWidget(this.HUD, {anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [200, 200]});
        this.joy0.onChange = xy => {this.publish("hud", "joy", xy)};
    }

    createManagers() {
        this.input = this.addManager(new InputManager(this.model));
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
