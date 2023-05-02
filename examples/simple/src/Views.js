import { PM_ThreeCamera, ViewService, PM_Avatar, WidgetManager2,  v3_rotate, ThreeInstanceManager, ViewRoot, Pawn, mix,
    InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE, PM_ThreeInstanced,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, q_multiply, q_axisAngle, v3_scale, v3_add, PM_ThreeCollider, ThreeRaycast, viewRoot,
    PM_NavGridGizmo, Widget2, CanvasWidget2, ImageWidget2, TextWidget2, ControlWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2, ImageToggleWidget2,
     SliderWidget2, JoyStickWidget2, WindowWidget2, MenuWidget2, ListWidget2} from "@croquet/worldcore";

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

        // this.subscribe("input", 'wheel', this.onWheel);
        // this.subscribe("input", "pointerDown", this.doPointerDown);
        // this.subscribe("input", "pointerUp", this.doPointerUp);
        // this.subscribe("input", "pointerDelta", this.doPointerDelta);
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

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, GodView, ThreeRaycast];
    }

    onStart() {
        this.buildInstances();
        this.buildLights();
        this.subscribe("input", "xDown", this.test);
        this.subscribe("input", "cDown", this.test2);

        const [x,y,z] = [1,2,3];
        console.log(z);

    }

    test() {
        console.log("test");
        const hud = this.service("HUD");

        const www = new WindowWidget2({
            parent: hud.root,
            size:[200,200],
            translation: [100,100]
        });

        const sss = new SliderWidget2({
            parent:www.content,
            size: [20,20],
            autoSize: [0,1],
            anchor: [1,0],
            pivot: [1,0],
        });

        const mmm = new MenuWidget2({
            parent: www.content,
            size:[100,20],
            anchor: [0,0],
            pivot: [0,0],
            translation: [20,20],
            title: "Pick",
            popup: true,
            entries: ["Alpha", "Beta", "Gamma"]
        });


    }

    test2() {
        console.log("test2");
        const hud = this.service("HUD");

        // const mmm = new ListWidget2({
        //     parent: hud.root,
        //     size:[200,200],
        //     anchor: [1,0],
        //     pivot: [1,0],
        //     translation: [-20,20],
        //     list: ["Alpha", "Beta", "Gamma"]
        // });

        const mmm = new MenuWidget2({
            parent: hud.root,
            size:[100,20],
            anchor: [1,0],
            pivot: [1,0],
            translation: [-20,20],
            title: "Pick",
            popup: true,
            entries: ["Alpha", "Beta", "Gamma"]
        });

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

}
