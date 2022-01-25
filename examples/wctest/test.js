// World Core Test
//
// Croquet Studios, 2021

import { Session, ModelRoot, ViewRoot, q_axisAngle, toRad, m4_scaleRotationTranslation, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed,  CachedObject, q_multiply, q_normalize, q_identity,  AM_Spatial, PM_Spatial, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, v3_normalize, StartWorldcore, FocusManager, PM_Focusable, m4_scale, m4_translation, m4_rotationX, m4_rotationZ, CardActor, PM_Pointer } from "@croquet/worldcore-kernel";
import {RenderManager, PM_Visible, Material, DrawCall, Triangles, Sphere, Cylinder } from "@croquet/worldcore-webgl"
import { UIManager, Widget, JoystickWidget, ButtonWidget, ImageWidget, TextWidget, SliderWidget } from "@croquet/worldcore-widget";
import { Behavior, AM_Behavioral } from "@croquet/worldcore-behavior";
import { PM_ThreeVisible, ThreeRenderManager,  PM_ThreeCamera, PM_ThreePointerTarget, THREE } from "@croquet/worldcore-three";

import paper from "./assets/paper.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";

let mmm;
let ma;

class AvatarActor extends mix(Actor).with(AM_Avatar, AM_Player) {
    get pawn() {return AvatarPawn}
}
AvatarActor.register("AvatarActor");

class AvatarPawn extends mix(Pawn).with(PM_Avatar, PM_Player, PM_ThreeCamera, PM_Pointer) {

    constructor(...args) {
        super(...args);
        console.log("Avatar");
        this.subscribe("input", "xDown", this.test)
        // this.subscribe("ui", "pointerDown", this.down);
    }

    test() {
        console.log("test");

    }

    // down(e) {
    //     const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
    //     const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
    //     const rc = this.pointerRaycast([x,y]);
    //     console.log(rc.pawn);
    //     console.log(rc.xyz);
    //     console.log(rc.uv);
    // }
}

//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------



class MoveActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() {return MovePawn}

    init(options = {}) {
        super.init(options);
        this.child = ChildActor.create({zzz: 123, parent: this, translation: [0,1.5,0]});
        this.subscribe("input", "dDown", this.test0)
        this.subscribe("input", "sDown", this.test1)
    }

    test0() {
        console.log("test0");
        this.destroy();
        // this.moveTo([1,0,-5]);
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

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_ThreeVisible, PM_Player, PM_ThreePointerTarget) {
    constructor(...args) {
        super(...args);
        // this.setDrawCall(this.buildDraw());
        this.cube = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(1,0,0)});
        const mesh = new THREE.Mesh( this.cube,  this.material );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.setRenderObject(mesh);

        this.subscribe("hud", "joy", this.joy);
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

    // update(time, delta) {
    //     super.update(time,delta);
    //     if (this.isMyPlayerPawn) {
    //         this.pulseScale += this.pulseDelta;
    //         if (this.pulseScale > 2 ||  this.pulseScale < 0.5) this.pulseDelta *= -1;
    //         console.log(this.pulseScale);
    //         this.localOffset = m4_scale(this.pulseScale);
    //         this.localOffset = m4_translation([1,0,0])
    //     }
    // }

    // joy(xy) {
    //     const spin = xy[0];
    //     const pitch = xy[1];
    //     let q = q_multiply(q_identity(), q_axisAngle([0,1,0], spin * 0.5));
    //     q = q_multiply(q, q_axisAngle([1,0,0], pitch * 0.5));
    //     q = q_normalize(q);
    //     // console.log(q);
    //     this.rotateTo(q);
    // }

}


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

class ChildActor extends mix(Actor).with(AM_Avatar, AM_Behavioral) {

    get pawn() {return ChildPawn}

    init(options) {
        super.init(options);


        this.startBehavior(SpinBehavior);

        // this.subscribe("input", "dDown", this.test0)
        // this.subscribe("input", "sDown", this.test1)
    }

    // test0() {
    //     console.log("test0");
    //     this.color = 0
    // }

    // test1() {
    //     console.log("test1");
    //     this.color = 45
    // }

}
ChildActor.register('ChildActor');


//------------------------------------------------------------------------------------------
// ChildPawn
//------------------------------------------------------------------------------------------

class ChildPawn extends mix(Pawn).with(PM_Avatar, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.cube = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(0, 1,0)});
        const mesh = new THREE.Mesh( this.cube,  this.material );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.setRenderObject(mesh);


        // this.setDrawCall(this.buildDraw());

        // this.defineSmoothedProperty("color", () => { console.log("onSetColor"); } );
        // this.defineSmoothedProperty("xxx", () => { console.log("onSetXXX"); } );
        // console.log(this.color);
        // console.log(this.smoothed);
        // console.log(Object.entries(this.smoothed))
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

    // init(...args) {
    //     super.init(...args);
    // }

}
BackgroundActor.register('BackgroundActor');

//------------------------------------------------------------------------------------------
// BackgroundPawn
//------------------------------------------------------------------------------------------

class BackgroundPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);



        // const c =  [0.6,1,0.6,1];

        // this.mesh = new Triangles();
        // this.mesh.addFace([[-20, -20, -10], [20, -20, -10], [20, 20, -10], [-20, 20, -10]], [c,c,c,c], [[0,0], [25,0], [25,25], [0,25]]);
        // this.mesh.load();
        // this.mesh.clear();

        // this.material = new Material();
        // this.material.pass = 'opaque';
        // this.material.texture.loadFromURL(paper);

        // this.setDrawCall(new DrawCall(this.mesh, this.material));
    }
}

//------------------------------------------------------------------------------------------
// MyPlayerManager
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.translation = [0,0,5];
        return AvatarActor.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [ MyPlayerManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start Model!!!!");
        BackgroundActor.create();
        const card = CardActor.create();
        ma =MoveActor.create({translation: [0,0,-5]});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [ InputManager, UIManager, ThreeRenderManager];
    }

    constructor(model) {
        super(model);

        const render = this.service("ThreeRenderManager");

        render.renderer.setClearColor(0x80a0a0);
        // render.camera.position.set(0,0,0);

        const lighting = new THREE.Group();
        const ambient = new THREE.AmbientLight( 0xffffff, 0.40 );
        const sun = new THREE.SpotLight( 0xffffff, 0.60 );
        sun.position.set(50, 50, 25);
        sun.angle= toRad(30);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 20;
        sun.shadow.camera.far = 150;

        lighting.add(ambient);
        lighting.add(sun);
        render.scene.add(lighting);

        // render.setBackground([0.45, 0.8, 0.8, 1.0]);
        // render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        // render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        // render.lights.setDirectionalAim([0.2,-1,0.1]);

        // const cameraMatrix = m4_scaleRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(0)), [0,0,0]);
        // render.camera.setLocation(cameraMatrix);
        // render.camera.setProjection(toRad(60), 1.0, 10000.0);

        // const ao = render.aoShader;
        // if (ao) {
        //     ao.setRadius(0.1);
        //     ao.density = 0.5;
        //     ao.falloff = 1;
        // }

        const ui = this.service("UIManager");
        this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});
        this.joy = new JoystickWidget({parent: this.HUD, anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [200, 200], onChange: xy => {this.publish("hud", "joy", xy)}});

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

