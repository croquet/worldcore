// Microverse Base

import { App } from "@croquet/worldcore";
import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    AM_Smoothed, PM_Smoothed, sphericalRandom, q_axisAngle, m4_scaleRotationTranslation, toRad, v3_scale, m4_rotation, m4_multiply,
    WidgetManager2, Widget2, ButtonWidget2, q_dot, q_equals, TAU, m4_translation, v3_transform, v3_add, v3_sub, v3_normalize } from "@croquet/worldcore";

import { InstanceManager, PM_ThreeVisibleInstanced } from "./src/Instances";

import { AM_RapierDynamicRigidBody, RapierManager, RAPIER, AM_RapierStaticRigidBody, AM_RapierWorld } from "./src/Rapier";

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
}

//------------------------------------------------------------------------------------------
//-- BlockActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockActor extends mix(Actor).with(AM_Smoothed, AM_RapierDynamicRigidBody) {
    get pawn() {return BlockPawn}

    get shape() { return this._shape || "111" }

    init(options) {
        super.init(options);
        this.buildCollider();
    }

    buildCollider() {
        let d = [0.5,0.5,0.5]
        switch(this.shape) {
            case "121":
                d = [0.5,1,0.5];
                break;
            case "414":
                d = [2,0.5,2];
                break;
                
            case "111":
            default:  
        }
        const cd = RAPIER.ColliderDesc.cuboid(...d);
        cd.setDensity(1)
        cd.setRestitution(0.01);
        this.createCollider(cd);

    }

}
BlockActor.register('BlockActor');

//------------------------------------------------------------------------------------------
//-- BlockPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance(this.actor.shape);
    }
}

//------------------------------------------------------------------------------------------
//-- BulletActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BulletActor extends mix(Actor).with(AM_Smoothed, AM_RapierDynamicRigidBody) {
    get pawn() {return BulletPawn}

    init(options) {
        super.init(options);
        this.buildCollider();
        this.future(10000).destroy()
    }

    buildCollider() {
        const cd = RAPIER.ColliderDesc.ball(0.5);
        cd.setDensity(3)
        cd.setRestitution(0.95);
        this.createCollider(cd);

    }

}
BulletActor.register('BulletActor');

//------------------------------------------------------------------------------------------
//-- BulletPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BulletPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance("ball");
    }
}


//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_RapierWorld, AM_RapierStaticRigidBody) {
    get pawn() {return BasePawn}

    init(options) {
        super.init(options);
        this.active = [];
        let cd = RAPIER.ColliderDesc.cuboid(50, 5, 50);
        cd.translation = new RAPIER.Vector3(0,-5,0);
        this.createCollider(cd);

        this.subscribe("ui", "shoot", this.shoot)
        this.subscribe("ui", "reset", this.reset)

    }

    reset() {
        console.log("reset!")
        this.active.forEach (b => b.destroy());
        this.active = [];

        this.buildBuilding(-3,0,-3)
        this.buildBuilding(-3,0,3)
        this.buildBuilding(3,0,-3)
        this.buildBuilding(3,0,3)

        this.buildBuilding(-10,0,-3)
        this.buildBuilding(-10,0,3)
        this.buildBuilding(10,0,-3)
        this.buildBuilding(10,0,3)

        this.buildBuilding(-3,0,-10)
        this.buildBuilding(-3,0,10)
        this.buildBuilding(3,0,-10)
        this.buildBuilding(3,0,10)



    }

    build141(x,y,z) {
        this.active.push(BlockActor.create({parent: this, shape: "121", translation: [x,y+1,z]}));
        this.active.push(BlockActor.create({parent: this, shape: "121", translation: [x,y+3,z]}));
    }

    buildFloor(x,y,z) {
        this.build141(x,y,z);
        this.build141(x,y,z+3);
        this.build141(x+3,y,z+3);
        this.build141(x+3,y,z);

        this.active.push(BlockActor.create({parent: this, shape: "414", translation: [x+1.5, y+4.5, z+1.5]}));
    }

    buildBuilding(x,y,z) {
        this.buildFloor(x,y,z);
        this.buildFloor(x,y+5.5,z);
    }

    shoot3(gun) {
        this.shoot(gun);
        // this.future(150).shoot(gun);
        // this.future(300).shoot(gun);
    }

    shoot(gun) {
        const aim = v3_normalize(v3_sub([0,0,1], gun))
        const translation = v3_add(gun, [0,0,0]);
        const bullet = BulletActor.create({parent: this, translation});
        const force = v3_scale(aim, 50);
        bullet.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);

        // this.shots.push(bullet);
    }



}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.baseMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.7,0.7,0.7)} );
        this.baseMaterial.side = THREE.DoubleSide;
        this.baseMaterial.shadowSide = THREE.DoubleSide;

        const group = new THREE.Group();
       
        this.baseGeometry = new THREE.BoxGeometry( 100, 1, 100 );
        this.baseGeometry.translate(0,-0.5,0);

        const base = new THREE.Mesh( this.baseGeometry, this.baseMaterial );
        base.receiveShadow = true;
        group.add(base);


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
        // this.seedColors();

        this.base = BaseActor.create({gravity: [0,-9.8,0], timestep:10, translation: [0,0,0]});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-20);
let yaw = toRad(0);
let gun = [0,-1,50];


class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, InstanceManager, WidgetManager2];
    }

    constructor(model) {
        super(model);
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        this.startCamera();
        this.buildHUD();

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", " Down", this.doShoot);

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

    buildHUD() {
            const wm = this.service("WidgetManager2");
            const hud = new Widget2({parent: wm.root, autoSize: [1,1]});
            const recenter = new ButtonWidget2({parent: hud, translation: [20,20], size: [200,50]});
            recenter.label.set({text:"Recenter"});
            recenter.onClick = () => {
                fov = 60;
                pitch = toRad(-20);
                yaw = toRad(0);
                this.updateCamera();
            }

            const reset = new ButtonWidget2({parent: hud, anchor: [1,0], pivot:[1,0], translation: [-20,20], size: [200,50]});
            reset.label.set({text:"Reset"});
            reset.onClick = () => this.publish("ui", "reset");
    }

    doShoot() {
        const pitchMatrix = m4_rotation([1,0,0], pitch)
        const yawMatrix = m4_rotation([0,1,0], yaw)
        const both = m4_multiply(pitchMatrix, yawMatrix);
        const shoot = v3_transform(gun, both);
        this.publish("ui", "shoot", shoot);
    }

}

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.demolition',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'Physics',
    password: 'password',
    model: MyModelRoot,
    // name: App.autoSession(),
    view: MyViewRoot,
    tps:60
});