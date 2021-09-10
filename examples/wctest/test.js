// World Core Test
//
// Croquet Studios, 2021

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, q_axisAngle, toRad, m4_scaleRotationTranslation, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed,  CachedObject, q_multiply, q_normalize, q_identity,  AM_Spatial, PM_Spatial, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager } from "@croquet/worldcore-kernel";
import {RenderManager, PM_Visible, Material, DrawCall, Triangles, Sphere, Cylinder } from "@croquet/worldcore-webgl"
import paper from "./assets/paper.jpg";
// import llama from "./assets/llama.jpg";
// import kwark from "./assets/kwark.otf";

//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() {return MovePawn}

    init(options = {}) {
        super.init(options);
        this.child = ChildActor.create({parent: this, translation: [0,1.5,0]});
    }

}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_Visible, PM_Player) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(this.buildDraw());
        if (this.isMyPlayerPawn) this.subscribe("hud", "joy", this.joy);
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
        this.setSpin(q);
    }
}


//------------------------------------------------------------------------------------------
// ChildActor
//------------------------------------------------------------------------------------------

// class SpinBehavior extends Behavior {
//     do(delta) {
//         const axis = v3_normalize([2,1,3]);
//         let q = this.actor.rotation;
//         q = q_multiply(q, q_axisAngle(axis, 0.13 * delta / 50));
//         q = q_normalize(q);
//         this.actor.rotateTo(q);
//     }
// }
// SpinBehavior.register("SpinBehavior");

class ChildActor extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return ChildPawn}

    // init(options) {
    //     super.init(options);
    //     // this.startBehavior(SpinBehavior);
    //     this.subscribe("input", "dDown", this.test);
    // }

    // test() {
    //     console.log("test!");
    // }

}
ChildActor.register('ChildActor');


//------------------------------------------------------------------------------------------
// ChildPawn
//------------------------------------------------------------------------------------------

class ChildPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(this.buildDraw());
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

}

//------------------------------------------------------------------------------------------
// BackgroundActor
//------------------------------------------------------------------------------------------

class BackgroundActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return BackgroundPawn}

    init(...args) {
        super.init(...args);
        // this.subscribe("input", "dDown", this.test);
    }

    test() {
        console.log("test!");
        this.playSound(photon);
    }
}
BackgroundActor.register('BackgroundActor');

//------------------------------------------------------------------------------------------
// BackgroundPawn
//------------------------------------------------------------------------------------------

class BackgroundPawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
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
// MyPlayerManager
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.translation = [0,0,-5];
        return MoveActor.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Start Model!!!");
        BackgroundActor.create();
    }

    createServices() {
        this.players = this.addService(MyPlayerManager);
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);
        this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalAim([0.2,-1,0.1]);

        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(0)), [0,0,0]);
        this.render.camera.setLocation(cameraMatrix);
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.1);
            ao.density = 0.5;
            ao.falloff = 1;
        }

        // this.HUD = new Widget({parent: this.ui.root, autoSize: [1,1]});
        // this.joy = new JoystickWidget({parent: this.HUD, anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [200, 200], onChange: xy => {this.publish("hud", "joy", xy)}});

        // this.button0 = new ButtonWidget({
        //     parent: this.HUD,
        //     local: [20,20],
        //     size: [200,80],
        //     label: new TextWidget({fontURL: kwark, text: "Test 0", style: "italic"}),
        //     onClick: () => { this.joy.set({scale: 2})}
        // });

        // this.button1 = new ButtonWidget({
        //     parent: this.HUD,
        //     local: [20,110],
        //     size: [200,80],
        //     label: new TextWidget({fontURL: kwark, text: "Test 1", style: "oblique"}),
        //     onClick: () => { this.joy.set({scale: 1})}
        // });

        // this.slider = new SliderWidget({
        //     parent: this.HUD,
        //     anchor: [1,0],
        //     pivot: [1,0],
        //     local: [-20,20],
        //     size: [20, 300],
        //     onChange: p => {console.log(p)}
        // })

        // this.image = new ImageWidget({parent: this.HUD, local: [20, 200], size: [200,80], url: llama});


    }

    createServices() {
        this.input = this.addService(InputManager);
        this.render = this.addService(RenderManager);
        // this.ui = this.addService(UIManager);
    }

}

async function go() {

    const session = await Session.join({
        appId: 'io.croquet.wctest',
        apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
        password: 'password',
        name: 'test',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 15,
    });
}

go();
