// Microverse Base

import { App } from "@croquet/worldcore";
import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    AM_Smoothed, PM_Smoothed, sphericalRandom, q_axisAngle, m4_scaleRotationTranslation, toRad, v3_scale, m4_rotation, m4_multiply,
    WidgetManager2, Widget2, ButtonWidget2, q_dot, q_equals, TAU, m4_translation, v3_transform, v3_add, v3_sub, v3_normalize, ThreeInstanceManager,
    PM_ThreeInstanced, ViewService, AM_RapierDynamicRigidBody, RapierManager, RAPIER, AM_RapierStaticRigidBody, AM_RapierWorld } from "@croquet/worldcore";

// import { InstanceManager, PM_ThreeVisibleInstanced } from "./src/Instances";

// import { FPSAvatar } from "./src/Avatar";
// import { AM_RapierDynamicRigidBody, RapierManager, RAPIER, AM_RapierStaticRigidBody, AM_RapierWorld } from "./src/Rapier";
// import { AM_RapierDynamicRigidBody, RapierManager, RAPIER, AM_RapierStaticRigidBody, AM_RapierWorld } from "@croquet/worldcore";

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
}

function setGeometryColor(geometry, color) {
    const count = geometry.getAttribute("position").count;
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(...color);
    }
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3) );
}


//------------------------------------------------------------------------------------------
//-- SprayActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayActor extends mix(Actor).with(AM_Spatial, AM_RapierDynamicRigidBody) {
    get pawn() {return SprayPawn}

    get shape() {return this._shape || "cube"}
    get index() { return this._index || 0 }

    init(options) {
        super.init(options);
        this.parent.live.push(this);
        if (this.parent.live.length > 100) this.parent.live.shift().destroy();

        this.buildCollider();
    }

    buildCollider() {
        let cd;
        switch(this.shape) {
            case "cone":
                cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
                cd.setDensity(4)
                break;
            case "ball":
                cd = RAPIER.ColliderDesc.ball(0.5);
                cd.setDensity(2)
                break;
            case "cylinder":
                cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
                cd.setDensity(1.5)
                break;
            case"cube":
            default:
                cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
                cd.setDensity(1)
            break;
        }
        
        this.createCollider(cd);
  
    }

}
SprayActor.register('SprayActor');

//------------------------------------------------------------------------------------------
//-- SprayPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance(this.actor.shape + this.actor.index);
    }
}

//------------------------------------------------------------------------------------------
//-- FountainActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FountainActor extends mix(Actor).with(AM_Spatial, AM_RapierWorld, AM_RapierStaticRigidBody) {
    get pawn() {return FountainPawn}

    init(options) {
        super.init(options);
        this.live = [];

        let cd = RAPIER.ColliderDesc.cuboid(25, 0.5, 25);
        this.createCollider(cd);
        cd = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(0.5, 10, 25);
        cd.translation = new RAPIER.Vector3(-24,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(0.5, 10, 25);
        cd.translation = new RAPIER.Vector3(24,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(25, 10, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,24);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(25, 10, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,-24);
        this.createCollider(cd);

        this.subscribe("ui", "shoot", this.doShoot)

        this.future(1000).spray();
    }

    spray() {
        this.spawn();
        // console.log(this.live.length);
        if (!this.doomed) this.future(300).spray();
    }

    spawn() {
        const type = this.random()
        let shape = "cube";

        if (type > 0.4) shape = "cylinder";
        if (type > 0.7) shape = "ball";
        if (type > 0.9) shape = "cone";

        const index = Math.floor(this.random()*20);
        const spray = SprayActor.create({parent: this, shape, index, translation: [0,3,0]});

        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
        const force = [0, 17.5 + 5 * Math.random(), 0];

        spray.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        spray.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
    }

    doShoot(gun) {
        const aim = v3_normalize(v3_sub([0,15,0], gun))
        const shape = "cube";
        const index = Math.floor(this.random()*20);
        const translation = v3_add(gun, [0,0,0])
        const bullet = SprayActor.create({parent: this, shape, index, translation});
        const force = v3_scale(aim, 40);
        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);

        bullet.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        bullet.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
    }

}
FountainActor.register('FountainActor');

//------------------------------------------------------------------------------------------
//-- FountainPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FountainPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
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

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [RapierManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
        this.seedColors();

        this.fountain = FountainActor.create({gravity: [0,-9.8,0], timestep:15, translation: [0,0,0]});
    }

    seedColors() {

        this.colors = [
            rgb(242, 215, 213),        // Red
            rgb(217, 136, 128),        // Red
            rgb(192, 57, 43),        // Red
        
            rgb(240, 178, 122),        // Orange
            rgb(230, 126, 34),        // Orange
            rgb(175, 96, 26),        // Orange
        
            rgb(247, 220, 111),        // Yellow
            rgb(241, 196, 15),        // Yellow
            rgb(183, 149, 11),        // Yellow
        
            rgb(125, 206, 160),        // Green
            rgb(39, 174, 96),        // Green
            rgb(30, 132, 73),        // Green
        
            rgb(133, 193, 233),         // Blue
            rgb(52, 152, 219),        // Blue
            rgb(40, 116, 166),        // Blue
        
            rgb(195, 155, 211),        // Purple
            rgb(155, 89, 182),         // Purple
            rgb(118, 68, 138),        // Purple

            [0.9, 0.9, 0.9],        // White
            [0.5, 0.5, 0.5],        // Gray
            [0.2, 0.2, 0.2]        // Black
        ];

    }

}
MyModelRoot.register("MyModelRoot");

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


let gun = [0,1,50];


class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, WidgetManager2, GodView];
    }

    constructor(model) {
        super(model);
        this.subscribe("input", " Down", this.doShoot);
    }

    onStart() {
        this.buildHUD();
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
            const recenter = new ButtonWidget2({parent: hud, translation: [-20,20], size: [200,50], anchor:[1,0], pivot: [1,0]});
            recenter.label.set({text:"Recenter"});
            recenter.onClick = () => this.doRecenter();

            const shoot = new ButtonWidget2({parent: hud, translation: [-20,80], size: [200,50], anchor:[1,0], pivot: [1,0]});
            shoot.label.set({text:"Shoot"});
            shoot.onClick = () => this.doShoot();
    }

    doRecenter() {
        fov = 60;
        pitch = toRad(-20);
        yaw = toRad(-30);
        this.service("GodView").updateCamera();  
    }

    doShoot() {
        console.log("shoot");
        const pitchMatrix = m4_rotation([1,0,0], pitch)
        const yawMatrix = m4_rotation([0,1,0], yaw)
        const both = m4_multiply(pitchMatrix, yawMatrix);
        const shoot = v3_transform(gun, both);
        this.publish("ui", "shoot", shoot);

    }

}

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.physics',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'Physics',
    password: 'password',
    model: MyModelRoot,
    // name: App.autoSession(),
    view: MyViewRoot,
    tps:60
});