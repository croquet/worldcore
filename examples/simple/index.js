// Simple Testbed

import { AM_Behavioral, App, Behavior, PM_ThreeCamera } from "@croquet/worldcore";

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, WidgetManager2, TAU, m4_translation, q_multiply, q_axisAngle  } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
// Behaviors -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SpinBehavior extends Behavior {

    get axis() {return this._axis || [0,1,0]}
    get speed() {return this._speed || 1}

    do(delta) {
        const q = q_axisAngle(this.axis, 0.13 * delta * this.speed / 50);
        const rotation = q_multiply(this.actor.rotation, q);
        this.actor.set({rotation});
    }

}
SpinBehavior.register("SpinBehavior");

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    get pawn() {return  TestPawn}

    // init(options = {}) {
    //     super.init(options);
    // }

}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// TestPawn
//------------------------------------------------------------------------------------------

class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.buildMesh();
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
    }

}

//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return BasePawn}

    init(options) {
        super.init(options);
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeCamera) {
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
}

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");

        this.base = BaseActor.create({});

        this.test0 = TestActor.create({translation:[0,5,0]});
        this.test1 = TestActor.create({parent: this.test0, translation:[5,0,0]});

        this.test0.behavior.start({name: "SpinBehavior", axis:[0,1,0], speed: 2});
        this.test1.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-20);
let yaw = toRad(-30);

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, WidgetManager2];
    }

    constructor(model) {
        super(model);
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        this.startCamera();

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
    }

    startCamera() {
        const rm = this.service("ThreeRenderManager");

        this.updateCamera();

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

        sun.shadow.bias = -0.0001;
        group.add(sun);

        rm.scene.add(group);
    }

    updateCamera() {
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
        const rm = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(120, fov + data.deltaY / 50));
        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    doPointerDown() {
        this.dragging = true;
    }

    doPointerUp() {
        this.dragging = false;
    }

    doPointerDelta(e) {
        if (!this.dragging) return;
        yaw += -0.01 * e.xy[0];
        yaw = yaw % TAU;
        pitch += -0.01 * e.xy[1];
        pitch = Math.min(pitch, toRad(-5));
        pitch = Math.max(pitch, toRad(-90));
        this.updateCamera()
    }

}

// webpack will replace process.env.NODE_ENV with the actual value
const apiKey = process.env.NODE_ENV === 'production'
    ? '1rN7t58Mo1ani03Djcl4amvdEAnoitB6g3oNxEDrC'
    : '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9';


// App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.simple',
    apiKey,
    model: MyModelRoot,
    name: 'test',
    // name: App.autoSession(),
    password: App.autoPassword(),
    view: MyViewRoot,
    tps:60
});