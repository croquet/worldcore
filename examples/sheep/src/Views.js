import { PM_ThreeCamera, ViewService, PM_Avatar, WidgetManager2,  v3_rotate, ThreeInstanceManager, ViewRoot, Pawn, mix,
    InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, q_multiply, q_axisAngle, v3_scale, v3_add, ThreeRaycast, PM_ThreeCollider,
    PM_ThreeInstanced, OutlinePass } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.buildMesh();
        this.addRenderObjectToRaycast();
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    buildMesh() {
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        const mesh = new THREE.Mesh( this.geometry, this.material );

        mesh.receiveShadow = true;
        mesh.castShadow = true;

        this.setRenderObject(mesh);
        this.addRenderObjectToRaycast();
    }
}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeCollider) {
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
        this.addRenderObjectToRaycast("ground");
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }
}
BasePawn.register("BasePawn");

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

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.subscribe("input", "mDown", this.point);
    }

    doPointerMove(e) {
        this.xy = e.xy;
    }

    point() {
        console.log("point");
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(this.xy, "ground");
        if (hits.length<1) return;
        const hit = hits[0];
        const pawn = hit.pawn;
        console.log([hit.xyz[0], hit.xyz[2]]);
    }

    updateCamera() {
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], pitch)
        const yawMatrix = m4_rotation([0,1,0], yaw)

        let cameraMatrix = m4_translation([0,0,50]);
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
        yaw = yaw % TAU;
        pitch += -0.01 * e.xy[1];
        pitch = Math.min(pitch, toRad(-5));
        pitch = Math.max(pitch, toRad(-90));
        this.updateCamera()
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, GodView, WidgetManager2, ThreeInstanceManager, ThreeRaycast];
    }

    onStart() {
        this.buildInstances()
        this.buildLights();
        this.buildHUD();

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

        sun.shadow.camera.left = -80
        sun.shadow.camera.right = 80
        sun.shadow.camera.top = 80
        sun.shadow.camera.bottom = -80

        sun.shadow.bias = -0.0005;
        group.add(sun);

        rm.scene.add(group);
    }

    buildHUD() {
        const wm = this.service("WidgetManager2");
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,0)} );
        material.side = THREE.FrontSide;
        material.shadowSide = THREE.BackSide;
        im.addMaterial("default", material);

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("cube", geometry);

        const mmm = im.addMesh("cube", "cube", "default");
        mmm.castShadow = true;
    }


}