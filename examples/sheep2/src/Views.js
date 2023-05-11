import { PM_ThreeCamera, ViewService, PM_Avatar, WidgetManager2,  v3_rotate, ThreeInstanceManager, ViewRoot, Pawn, mix,
    InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, q_multiply, q_axisAngle, v3_scale, v3_add, ThreeRaycast, PM_ThreeCollider,
    PM_ThreeInstanced, OutlinePass, viewRoot, Constants, PM_NavGridGizmo, m4_identity } from "@croquet/worldcore";
// import { PathDebug, packKey } from "./Paths";

function setGeometryColor(geometry, color) {
    const count = geometry.getAttribute("position").count;
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(...color);
    }
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3) );
}

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("cube" + this.actor.index);
    }

}
AvatarPawn.register("AvatarPawn");

//------------------------------------------------------------------------------------------
// BlockPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BlockPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("block");
    }

}
BlockPawn.register("BlockPawn");

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

        this.gizmo.visible = false;
        this.localTransform = m4_translation([0,0,0]);
        this.refreshDrawTransform();

        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "qDown", this.toggleGizmo);
    }

    toggleGizmo() {
        this.gizmo.visible = !this.gizmo.visible;
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    doPointerDown(e) {
        if (e.button === 2) return;
        // console.log("base down");
        // console.log(this.viewId);
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(e.xy, "ground");
        if (hits.length<1) return;
        const hit = hits[0];
        const x = hit.xyz[0];
        const y = hit.xyz[2];
        const xy = [x/3,y/3];
        this.publish("hud", "go", xy);
    }

}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
//-- GodView -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-60);
let yaw = toRad(0);
const cam = [0,150,100];

class GodView extends ViewService {

    constructor() {
        super("GodView");
        // this.pathStart = packKey(0,1,0);

        this.updateCamera();

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        // this.subscribe("input", "gDown", this.go);
    }

    doPointerMove(e) {
        this.xy = e.xy;
        // this.point();
    }

    // go() {
    //     console.log("go");
    //     const rc = this.service("ThreeRaycast");
    //     const hits = rc.cameraRaycast(this.xy, "ground");
    //     if (hits.length<1) return;
    //     const hit = hits[0];
    //     const x = hit.xyz[0];
    //     const y = hit.xyz[2];
    //     const xy = [x/3,y/3];
    //     this.publish("hud", "go", xy);
    // }

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
        cam[0] += -0.5 * e.xy[0];
        cam[2] += -0.5 * e.xy[1];
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

        sun.shadow.camera.left = -200;
        sun.shadow.camera.right = 200;
        sun.shadow.camera.top = 200;
        sun.shadow.camera.bottom = -200;

        sun.shadow.bias = -0.0005;
        group.add(sun);

        rm.scene.add(group);
    }

    buildHUD() {
        // const wm = this.service("WidgetManager2");
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  vcmaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        vcmaterial.side = THREE.FrontSide;
        vcmaterial.shadowSide = THREE.BackSide;
        vcmaterial.castShadow = true;
        vcmaterial.vertexColors = true;

        im.addMaterial("vc", vcmaterial);
        this.buildCubes();

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,1)} );
        material.side = THREE.FrontSide;
        material.shadowSide = THREE.BackSide;
        im.addMaterial("cyan", material);

        const  material2 = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        material2.side = THREE.FrontSide;
        material2.shadowSide = THREE.BackSide;
        im.addMaterial("magenta", material2);

        const  material3 = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.3,0.3,0.3)} );
        material3.side = THREE.FrontSide;
        material3.shadowSide = THREE.BackSide;
        im.addMaterial("dark", material3);

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        geometry.translate(0,0.5,0);
        im.addGeometry("cube", geometry);

        const bbb = im.addMesh("block", "cube", "dark", 2000);
        bbb.castShadow = true;

        const mmm = im.addMesh("bot", "cube", "magenta", 2000);
        mmm.castShadow = true;
    }

    buildCubes() {
        const im = this.service("ThreeInstanceManager");
        for ( let n = 0; n < this.model.colors.length; n++) {
            const color = this.model.colors[n];
            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            setGeometryColor(geometry, color);
            im.addGeometry("box" + n, geometry);
            const mesh = im.addMesh("cube" + n, "box"+n, "vc");
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

}

