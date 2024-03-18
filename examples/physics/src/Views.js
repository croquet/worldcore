// Views

import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE, PM_Smoothed, toRad, m4_rotation, m4_multiply,
    Widget2, ButtonWidget2, TAU, m4_translation, v3_transform, ThreeInstanceManager,
    PM_ThreeInstanced, ViewService } from "@croquet/worldcore";


function setGeometryColor(geometry, color) {
    const count = geometry.getAttribute("position").count;
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(...color);
    }
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3) );
}

//------------------------------------------------------------------------------------------
//-- SprayPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SprayPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance(this.actor.shape + this.actor.index);
    }
}
SprayPawn.register("SprayPawn");

//------------------------------------------------------------------------------------------
//-- FountainPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FountainPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        this.nozzleGeometry = new THREE.CylinderGeometry( 1, 0.5, 5, 10 );
        this.nozzlematerial = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        this.nozzlematerial.side = THREE.DoubleSide;
        this.nozzlematerial.shadowSide = THREE.DoubleSide;

        const nozzle = new THREE.Mesh( this.nozzleGeometry, this.nozzlematerial );
        nozzle.castShadow = true;

        this.baseGeometry = new THREE.BoxGeometry( 50, 1, 50 );
        this.baseMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.7,0.7,0.7)} );
        this.baseMaterial.side = THREE.DoubleSide;
        this.baseMaterial.shadowSide = THREE.DoubleSide;

        const base = new THREE.Mesh( this.baseGeometry, this.baseMaterial );
        base.receiveShadow = true;

        group.add(base);
        group.add(nozzle);


        this.setRenderObject(group);
    }
}
FountainPawn.register("FountainPawn");

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
    }

    updateCamera() {
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], pitch);
        const yawMatrix = m4_rotation([0,1,0], yaw);

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
        yaw %= TAU;
        pitch += -0.01 * e.xy[1];
        pitch = Math.min(pitch, toRad(-15));
        pitch = Math.max(pitch, toRad(-90));
        this.updateCamera()
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let gun = [0,1,50];

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, GodView ];
        // return [InputManager, ThreeRenderManager, ThreeInstanceManager, WidgetManager2, GodView];
    }

    constructor(model) {
        super(model);
        this.subscribe("input", " Down", this.doShoot);
    }

    onStart() {
        // this.buildHUD();
        this.buildLights();
        this.buildInstances();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");

        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 0.5 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.7 );
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

        sun.shadow.bias = -0.001;
        group.add(sun);

        rm.scene.add(group);
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        material.side = THREE.DoubleSide;
        material.shadowSide = THREE.DoubleSide;
        material.castShadow = true;
        material.vertexColors = true;

        im.addMaterial("default", material);

        this.buildCubes();
        this.buildCylinders();
        this.buildBalls();
        this.buildCones();
    }

    buildCubes() {
        const im = this.service("ThreeInstanceManager");
        for( let n = 0; n < this.model.colors.length; n++) {
            const color = this.model.colors[n];
            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            setGeometryColor(geometry, color);
            im.addGeometry("box" + n, geometry);
            const mesh = im.addMesh("cube" + n, "box"+n, "default");
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildCylinders() {
        const im = this.service("ThreeInstanceManager");
        for( let n = 0; n < this.model.colors.length; n++) {
            const color = this.model.colors[n];
            const geometry = new THREE.CylinderGeometry( 0.5, 0.5, 1, 10 );
            setGeometryColor(geometry, color);
            im.addGeometry("cylinder" + n, geometry);
            const mesh = im.addMesh("cylinder" + n, "cylinder"+n, "default");
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildBalls() {
        const im = this.service("ThreeInstanceManager");
        for( let n = 0; n < this.model.colors.length; n++) {
            const color = this.model.colors[n];
            const geometry = new THREE.SphereGeometry( 0.5, 10, 10);
            setGeometryColor(geometry, color);
            im.addGeometry("ball" + n, geometry);
            const mesh = im.addMesh("ball" + n, "ball" + n, "default");
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildCones() {
        const im = this.service("ThreeInstanceManager");
        for( let n = 0; n < this.model.colors.length; n++) {
            const color = this.model.colors[n];
            const geometry = new THREE.ConeGeometry( 0.5, 1, 10, 1);
            setGeometryColor(geometry, color);
            im.addGeometry("cone" + n, geometry);
            const mesh = im.addMesh("cone" + n, "cone" + n, "default");
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildHUD() {
            const wm = this.service("WidgetManager2");
            const hud = new Widget2({parent: wm.root, autoSize: [1,1]});
            const recenter = new ButtonWidget2({parent: hud, translation: [-10,10], size: [100,30], anchor:[1,0], pivot: [1,0]});
            recenter.label.set({text:"Recenter", point:14, border: [4,4,4,4]});
            recenter.onClick = () => this.doRecenter();

            const shoot = new ButtonWidget2({parent: hud, translation: [-10,45], size: [100,30], anchor:[1,0], pivot: [1,0]});
            shoot.label.set({text:"Shoot", point:14, border: [4,4,4,4]});
            shoot.onClick = () => this.doShoot();
    }

    doRecenter() {
        fov = 60;
        pitch = toRad(-20);
        yaw = toRad(-30);
        this.service("GodView").updateCamera();
    }

    doShoot() {
        const pitchMatrix = m4_rotation([1,0,0], pitch)
        const yawMatrix = m4_rotation([0,1,0], yaw)
        const both = m4_multiply(pitchMatrix, yawMatrix);
        const shoot = v3_transform(gun, both);
        this.publish("ui", "shoot", shoot);
    }

}
