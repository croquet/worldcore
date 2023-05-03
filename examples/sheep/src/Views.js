import { PM_ThreeCamera, ViewService, PM_Avatar, WidgetManager2,  v3_rotate, ThreeInstanceManager, ViewRoot, Pawn, mix,
    InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, q_multiply, q_axisAngle, v3_scale, v3_add, ThreeRaycast, PM_ThreeCollider,
    PM_ThreeInstanced, OutlinePass, viewRoot, Constants, PM_NavGridGizmo } from "@croquet/worldcore";
// import { PathDebug, packKey } from "./Paths";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("bot");
    }

    destroy() {
        super.destroy();
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeCollider, PM_NavGridGizmo ) {
    constructor(...args) {
        super(...args);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        this.geometry = new THREE.PlaneGeometry(500,500);
        this.geometry.rotateX(toRad(90));

        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;

        this.setRenderObject(base);
        this.addRenderObjectToRaycast("ground");

        this.gizmo.visible = true;

        this.subscribe("input", "pointerDown", this.doPointerDown);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    doPointerDown(e) {
        if (e.button === 2) return;
        this.point(e.xy);
    }

    point(xy) {
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(xy, "ground");
        if (hits.length<1) return;
        const hit = hits[0];
        const navX = Math.floor(hit.xyz[0]/this.actor.gridScale);
        const navZ = Math.floor(hit.xyz[2]/this.actor.gridScale);

        if (navX <0) return;
        if (navZ <0) return;

        const start = packKey(0,0);
        const end = packKey(navX,navZ);
        const path = this.actor.findPath(start, end);
        this.drawPathGizmo(path);
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
//-- GodView -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-60);
let yaw = toRad(0);
const cam = [0,20,10];

class GodView extends ViewService {

    constructor() {
        super("GodView");
        this.pathStart = packKey(0,1,0);

        this.updateCamera();

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.subscribe("input", "gDown", this.go);
    }

    doPointerMove(e) {
        this.xy = e.xy;
        // this.point();
    }

    go() {
        // console.log("go");
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(this.xy, "ground");
        if (hits.length<1) return;
        const hit = hits[0];
        const x = hit.xyz[0];
        const z = hit.xyz[2];
        this.publish("hud", "go", [x,0,z]);
    }

    updateCamera() {
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], pitch);
        const yawMatrix = m4_rotation([0,1,0], yaw);

        let cameraMatrix = m4_translation(cam);
        cameraMatrix = m4_multiply(pitchMatrix,cameraMatrix);
        //cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
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

    doPointerDown(e) {
        if (e.button !== 2) return;
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
        cam[0] += -0.1 * e.xy[0];
        cam[2] += -0.1 * e.xy[1];
        // yaw += -0.01 * e.xy[0];
        // yaw = yaw % TAU;
        // pitch += -0.01 * e.xy[1];
        // pitch = Math.min(pitch, toRad(-5));
        // pitch = Math.max(pitch, toRad(-90));
        this.updateCamera();
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, GodView, ThreeInstanceManager, ThreeRaycast];
    }

    onStart() {
        this.buildInstances();
        this.buildLights();
        this.buildHUD();
        // this.pathDebug = new PathDebug(this.model);

        // this.subscribe("paths", "new", this.onPathNew);

    }

    // onPathNew() {
    //     this.pathDebug.draw();
    // }

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

    buildHUD() {
        // const wm = this.service("WidgetManager2");
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,1)} );
        material.side = THREE.FrontSide;
        material.shadowSide = THREE.BackSide;
        im.addMaterial("cyan", material);

        const  material2 = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        material2.side = THREE.FrontSide;
        material2.shadowSide = THREE.BackSide;
        im.addMaterial("magenta", material2);

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        geometry.translate(0,0.5,0);
        im.addGeometry("cube", geometry);

        const mmm = im.addMesh("bot", "cube", "magenta", 2000);
        mmm.castShadow = true;
    }

}

function packKey(x,y) {
    if (x < 0 ) console.error("Negative AM_Grid x coordinate!");
    if (y < 0 ) console.error("Negative AM_Grid y coordinate!");
    return ((0x8000|x)<<16)|y;
}

function unpackKey(key) {
    return [(key>>>16) & 0x7FFF,key & 0x7FFF];
}
