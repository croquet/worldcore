import { ViewService, ThreeInstanceManager, ViewRoot, Pawn, mix,
    InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE, PM_ThreeInstanced,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, ThreeRaycast, viewRoot,
    PM_NavGridGizmo, Widget2, CanvasWidget2, ImageWidget2, TextWidget2, ControlWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2, ImageToggleWidget2,
     SliderWidget2, JoyStickWidget2, WindowWidget2, MenuWidget2, ListWidget2, HorizontalWidget2} from "@croquet/worldcore";

import llama from "../assets/llama.jpg";
import diana from "../assets/diana.jpg";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("sun");
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// PlanetPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PlanetPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("planet");
    }

}
PlanetPawn.register("PlanetPawn");

//------------------------------------------------------------------------------------------
// BallPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BallPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("ball");
    }

}
BallPawn.register("BallPawn");

//------------------------------------------------------------------------------------------
//-- GroundPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GroundPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        this.geometry = new THREE.PlaneGeometry(100,100);
        this.geometry.rotateX(toRad(90));

        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;

        this.setRenderObject(base);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }
}
GroundPawn.register("GroundPawn");

//------------------------------------------------------------------------------------------
//-- GodView -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-20);
let yaw = toRad(-30);

class GodView extends ViewService {

    constructor() {
        super("GodView");

        this.updateCamera();
    }


    updateCamera() {
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], pitch);
        const yawMatrix = m4_rotation([0,1,0], yaw);

        let cameraMatrix = m4_translation([0,0,20]);
        cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);

        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    onWheel(data) {
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(120, fov + data.deltaY / 50));
        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    doPointerDown() {
        if (this.paused) return;
        this.dragging = true;
    }

    doPointerUp() {
        if (this.paused) return;
        this.dragging = false;
    }

    doPointerDelta(e) {
        if (this.paused) return;
        if (!this.dragging) return;
        yaw += -0.01 * e.xy[0];
        yaw %=  TAU;
        pitch += -0.01 * e.xy[1];
        pitch = Math.min(pitch, toRad(-5));
        pitch = Math.max(pitch, toRad(-90));
        this.updateCamera();
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PickWidget extends ToggleWidget2 {

    get text() { return this._text || ""}

    build() {
        super.build();
        // this.frame = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.5,0.7,0.83]});
        this.label.set({text:this.text});
    }

    onToggle() {
        this.label.set({
            color: this.isOn ? [1,1,1] : [0.5,0.5,0.5]
        });
    }

}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, GodView, HUD];
    }

    onStart() {
        this.buildInstances();
        this.buildLights();
        this.subscribe("input", "xDown", this.test);
        this.subscribe("input", "zDown", this.test2);
    }

    test() {
        console.log("test");
        this.buildUI();
    }

    test2() {
        console.log("test2");

    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 0.8 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
        sun.position.set(100, 100, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 300;

        sun.shadow.camera.left = -80;
        sun.shadow.camera.right = 80;
        sun.shadow.camera.top = 80;
        sun.shadow.camera.bottom = -80;

        sun.shadow.bias = -0.0005;
        group.add(sun);

        rm.scene.add(group);
    }


    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  yellow = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        yellow.side = THREE.FrontSide;
        yellow.shadowSide = THREE.BackSide;
        im.addMaterial("yellow", yellow);

        const  magenta = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        magenta.side = THREE.FrontSide;
        magenta.shadowSide = THREE.BackSide;
        im.addMaterial("magenta", magenta);

        const  red = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,0)} );
        red.side = THREE.FrontSide;
        red.shadowSide = THREE.BackSide;
        im.addMaterial("red", red);

        const box = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("cube", box);

        const ball = new THREE.SphereGeometry( 0.5 );
        im.addGeometry("ball", ball);

        const mmm0 = im.addMesh("sun", "cube", "yellow");
        mmm0.castShadow = true;

        const mmm1 = im.addMesh("planet", "cube", "magenta");
        mmm1.castShadow = true;

        const mmm2 = im.addMesh("ball", "ball", "red");
        mmm2.castShadow = true;
    }

    buildUI() {
        if (this.bg) this.bg.destroy();

        const hud = this.service("HUD");
        this.bg = new VerticalWidget2({parent: hud.root, autoSize: [1,1]});
        this.top = new HorizontalWidget2({parent: this.bg, height: 50});
        this.timer = new CanvasWidget2({parent: this.top, width:50, color: [1,0,0]});
        this.question = new TextWidget2({parent: this.top, color: [1,1,1], style: "italic", text: "Who would win in a fair fight?"});
        this.players = new CanvasWidget2({parent: this.top, width:50, color: [0,0,1]});
        this.top.resize();

        this.round = new TextWidget2({parent: this.bg, height: 50, color: [1,1,1], style: "bold", text: "Preliminaries"});


        this.answers = new CanvasWidget2({parent: this.bg, color: [0,0.5,0]});
        const toggleSet = new ToggleSet2();
        this.pickA = new PickWidget({toggleSet, parent: this.answers, text: "A", size: [200,50], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [0,-5]});
        this.pickB = new PickWidget({toggleSet, parent: this.answers, text: "B", size: [200,50], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [0,5]});

        this.tallyA = new TextWidget2({parent: this.answers, text: "10%", color: [1,1,1], size: [50,50], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [150,-5]});
        this.tallyB = new TextWidget2({parent: this.answers, text: "20%", color: [1,1,1], size: [50,50], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [150,5]});

        this.bg.resize();
    }

}
