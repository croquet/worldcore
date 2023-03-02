// Demolition Demo

import { App, Model} from "@croquet/worldcore";

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    AM_Smoothed, PM_Smoothed, sphericalRandom, q_axisAngle, m4_scaleRotationTranslation, toRad, v3_scale, m4_rotation, m4_multiply,
    WidgetManager2, Widget2, ButtonWidget2, q_dot, q_equals, TAU, m4_translation, v3_transform, v3_add, v3_sub, v3_normalize, v3_magnitude, 
    RapierManager, RAPIER, AM_RapierRigidBody, AM_RapierWorld, ThreeInstanceManager, PM_ThreeInstanced, ViewService } from "@croquet/worldcore";

// import { InstanceManager, PM_ThreeVisibleInstanced } from "./src/Instances";

// import { AM_RapierDynamicRigidBody, RapierManager, RAPIER, AM_RapierStaticRigidBody, AM_RapierWorld } from "./src/Rapier";

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
//-- BlockActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
    get pawn() {return BlockPawn}

    get shape() { return this._shape || "111" }

    init(options) {
        super.init(options);
        this.buildCollider();
        this.worldActor.blocks.add(this);
    }

    destroy() {
        super.destroy();
        this.worldActor.blocks.delete(this);
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
        cd.setFriction(2)
        cd.setRestitution(0.1);
        this.createCollider(cd);

    }

    translationSet(t) {
        if (t[1] > -50) return;
        // console.log("kill plane");
        this.future(0).destroy();
    }

}
BlockActor.register('BlockActor');

//------------------------------------------------------------------------------------------
//-- BlockPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance(this.actor.shape);
    }
}

//------------------------------------------------------------------------------------------
//-- BulletActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BulletActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
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

class BulletPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance("ball3");
    }
}

//------------------------------------------------------------------------------------------
//-- BarrelActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BarrelActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
    get pawn() {return BarrelPawn}

    init(options) {
        super.init(options);
        this.buildCollider();

        this.worldActor.blocks.add(this);

        this.future(2000).arm();
    }

    arm() {
        // this.armed = true;
        this.set({hasAccelerometer: true});
    }

    destroy() {
        super.destroy();
        this.worldActor.blocks.delete(this);
    }

    translationSet(t) {
        if (t[1] > -20) return;
        console.log("kill plane");
        this.future(0).destroy();
    }

    buildCollider() {
        const cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
        cd.setDensity(1)
        cd.setRestitution(0.2);
        this.createCollider(cd);
    }

    accelerationSet(acceleration) {
        // if (!this.armed) return;
        const a = v3_magnitude(acceleration);
        if (a > 35) {
            this.explode();
        }
    }

    explode() {
        const radius = 10;
        const world = this.getWorldActor();
        world.blocks.forEach(block => {
            const to = v3_sub(block.translation, this.translation)
            const force = radius - v3_magnitude(to)
            if (force < 0) return;
            const aim = v3_normalize(to);
            const push = v3_scale(aim, force * 25);
            block.rigidBody.applyImpulse(new RAPIER.Vector3(...push), true);
        })

        this.future(10).destroy();
    }

}
BarrelActor.register('BarrelActor');

//------------------------------------------------------------------------------------------
//-- BarrelPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BarrelPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance("barrel");
    }
}

//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_RapierWorld, AM_RapierRigidBody) {
    get pawn() {return BasePawn}

    init(options) {
        super.init(options);
        this.active = [];
        this.blocks = new Set();
        let cd = RAPIER.ColliderDesc.cuboid(50, 5, 50);
        cd.translation = new RAPIER.Vector3(0,0,0);
        this.createCollider(cd);

        this.subscribe("ui", "shoot", this.shoot);
        this.subscribe("ui", "new", this.reset);
        // this.subscribe("input", "nDown", this.reset);
        // this.subscribe("ui", "syncPose", this.sync);
        this.holdYourFire = false;
        // this.syncPose = false;
        // this.reset();
    }

    shoot(gun) {
        const aim = v3_normalize(v3_sub([0,0,1], gun))
        const translation = v3_add(gun, [0,0,0]);
        const bullet = BulletActor.create({parent: this, translation, hasAccelerometer: true});
        const force = v3_scale(aim, 50);
        bullet.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        // this.lastBullet = bullet;
        // this.holdYourFire = true; // don't shoot!
        // this.future(200).fireAway();
    }

    reset() {
        this.blocks.forEach (b => b.destroy());
        this.buildAll();
        // if(this.lastBullet)this.lastBullet.future(0).destroy();
        // delete this.lastBullet;
        // this.holdYourFire = true; // don't shoot!
        // this.future(200).fireAway();
    }

    // fireAway(){
    //     this.holdYourFire = false;
    // }

    // sync(pose){
    //     // sync/desync positions for all users
    //     this.publish("sync", "syncPose", pose);
    //     if(this.lastBullet)this.lastBullet.future(0).destroy();
    //     delete this.lastBullet;
    //     this.holdYourFire = true; // don't shoot!
    //     this.future(200).fireAway();
    // }

    buildAll() {
        this.buildBuilding(2,5,2);
        this.buildBuilding(-2,5,2);
        this.buildBuilding(2,5,-2);
        this.buildBuilding(-2,5,-2);

        this.buildBuilding(10,5,2);
        this.buildBuilding(10,5,-2);
        this.buildBuilding(10,5,6);
        this.buildBuilding(10,5,-6);

        this.buildBuilding(-10,5,2);
        this.buildBuilding(-10,5,-2);
        this.buildBuilding(-10,5,6);
        this.buildBuilding(-10,5,-6);

        this.buildBuilding(2,5,10);
        this.buildBuilding(-2,5,10);
        this.buildBuilding(6,5,10);
        this.buildBuilding(-6,5,10);
        this.buildBuilding(2,5,-10);
        this.buildBuilding(-2,5,-10);
        this.buildBuilding(6,5,-10);
        this.buildBuilding(-6,5,-10);

    }

    build121(x,y,z) {
        BlockActor.create({parent: this, shape: "121", translation: [x,y+1,z]});
        BlockActor.create({parent: this, shape: "121", translation: [x,y+3,z]});
    }

    buildFloor(x,y,z) {
        this.build121(x-1.5,y,z-1.5);
        this.build121(x-1.5,y,z+1.5);
        this.build121(x+1.5,y,z-1.5);
        this.build121(x+1.5,y,z+ 1.5);
        BlockActor.create({parent: this, shape: "414", translation: [x+0, y+4.5, z+0]});
    }

    buildBuilding(x,y,z) {
        this.buildFloor(x,y,z);
        this.buildFloor(x,y+5.6,z);

        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-1.5, y+11, z-1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-1.5, y+11, z+1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+1.5, y+11, z-1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+1.5, y+11, z+1.5]});

        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+0, y+11, z-1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-0, y+11, z+1.5]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x+1.5, y+11, z-0]});
        BlockActor.create({parent: this, rigidBodyType: "dynamic", shape: "111", translation: [x-1.5, y+11, z+0]});

        if (Math.abs(x)<4 && Math.abs(z)<4) BarrelActor.create({parent: this, rigidBodyType: "dynamic", translation: [x, y+5.5, z]});

    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.baseMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.baseMaterial.side = THREE.DoubleSide;
        this.baseMaterial.shadowSide = THREE.DoubleSide;

        this.originMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.5,0.5,0.5)} );
        this.originMaterial.side = THREE.DoubleSide;
        this.originMaterial.shadowSide = THREE.DoubleSide;

        const group = new THREE.Group();

        this.baseGeometry = new THREE.BoxGeometry( 100, 1, 100 );
        this.baseGeometry.translate(0,4.5,0);

        const base = new THREE.Mesh( this.baseGeometry, this.baseMaterial );
        base.receiveShadow = true;
        group.add(base);

        this.originGeometry = new THREE.BoxGeometry( 1, 1, 1 );

        const origin = new THREE.Mesh( this.originGeometry, this.originMaterial );
        origin.receiveShadow = true;
        origin.castShadow = true;
        group.add(origin);

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

        this.base = BaseActor.create({rigidBodyType: "static", gravity: [0,-9.8,0], timestep:15, translation: [0,0,0]});
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
        pitch = Math.min(pitch, toRad(-10));
        pitch = Math.max(pitch, toRad(-80));
        this.updateCamera()
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// let fov = 60;
// let pitch = toRad(-20);
// let yaw = toRad(-30);
let gun = [0,-1,50];

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, WidgetManager2, GodView];
    }

    constructor(model) {
        super(model);
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        this.startCamera();
        this.buildHUD();


        // this.subscribe("input", 'wheel', this.onWheel);
        // this.subscribe("input", "pointerDown", this.doPointerDown);
        // this.subscribe("input", "pointerUp", this.doPointerUp);
        // this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", " Down", this.doShoot);
        // this.subscribe("input", "tap", this.doShoot);
        // this.subscribe("sync", "syncPose", this.syncPose);
    }

    onStart() {
        this.buildInstances();
    }

    // doSync(){
    //     this.publish("ui", "syncPose", [fov, yaw, pitch])
    // }

    // syncPose(pose){
    //     console.log("syncPose", pose);
    //     fov = pose[0];
    //     yaw = pose[1];
    //     pitch = pose[2];
    //     this.updateCamera();
    // }

    startCamera() {
        const rm = this.service("ThreeRenderManager");

        // this.updateCamera();

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

    // updateCamera() {
    //     const rm = this.service("ThreeRenderManager");

    //     const pitchMatrix = m4_rotation([1,0,0], pitch)
    //     const yawMatrix = m4_rotation([0,1,0], yaw)

    //     let cameraMatrix = m4_translation([0,0,50]);
    //     cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
    //     cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);

    //     rm.camera.matrix.fromArray(cameraMatrix);
    //     rm.camera.matrixAutoUpdate = false;
    //     rm.camera.matrixWorldNeedsUpdate = true;

    //     rm.camera.fov = fov;
    //     rm.camera.updateProjectionMatrix();
    // }

    // onWheel(data) {
    //     const rm = this.service("ThreeRenderManager");
    //     fov = Math.max(10, Math.min(120, fov + data.deltaY / 50));
    //     rm.camera.fov = fov;
    //     rm.camera.updateProjectionMatrix();
    // }

    // doPointerDown() {
    //     this.dragging = true;
    // }

    // doPointerUp() {
    //     this.dragging = false;
    // }

    // doPointerDelta(e) {
    //     if (!this.dragging) return;
    //     yaw += -0.01 * e.xy[0];
    //     yaw = yaw % TAU;
    //     pitch += -0.01 * e.xy[1];
    //     pitch = Math.min(pitch, toRad(-10));
    //     pitch = Math.max(pitch, toRad(-60));
    //     this.updateCamera()
    // }

    buildHUD() {
        const wm = this.service("WidgetManager2");
        const hud = new Widget2({parent: wm.root, autoSize: [1,1]});

        const recenter = new ButtonWidget2({parent: hud, translation: [-10,10], size: [100,30], anchor:[1,0], pivot: [1,0]});
        recenter.label.set({text:"Recenter", point:14, border: [4,4,4,4]});
        recenter.onClick = () => this.doRecenter();

        const reset = new ButtonWidget2({parent: hud, translation: [-10,45], anchor: [1,0], pivot:[1,0], size: [100,30]});
        reset.label.set({text:"New", point:14, border: [4,4,4,4]});
        reset.onClick = () => this.publish("ui", "new");

        const shoot = new ButtonWidget2({parent: hud, translation: [-10,80], size: [100,30], anchor:[1,0], pivot: [1,0]});
        shoot.label.set({text:"Shoot", point:14, border: [4,4,4,4]});
        shoot.onClick = () => this.doShoot();
    }


    // buildHUD() {
    //         const wm = this.service("WidgetManager2");
    //         const hud = new Widget2({parent: wm.root, autoSize: [1,1]});

    //         // const recenter = new ButtonWidget2({parent: hud, translation: [20,20], size: [200,50]});
    //         // recenter.label.set({text:"Recenter"});
    //         // recenter.onClick = () => {
    //         //     console.log("click!");
    //         //     fov = 60;
    //         //     pitch = toRad(-45);
    //         //     yaw = toRad(30);
    //         //     this.updateCamera();
    //         // }

    //         const reset = new ButtonWidget2({parent: hud, anchor: [1,0], pivot:[1,0], translation: [-20,20], size: [200,50]});
    //         reset.label.set({text:"Reset"});
    //         reset.onClick = () => this.publish("ui", "reset");

    //         // const syncPose = new ButtonWidget2({parent: hud, anchor: [0,0], pivot:[0,0], translation: [20,20], size: [200,50]});
    //         // syncPose.label.set({text:"Sync Pose"});
    //         // syncPose.onClick = () => this.doSync();
    // }

    doRecenter() {
        console.log("recenter")
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

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        material.side = THREE.DoubleSide;
        material.shadowSide = THREE.DoubleSide;
        material.castShadow = true;
        material.vertexColors = true;
        im.addMaterial("default", material);

        for( let n = 0; n < this.model.colors.length; n++) {
            const color = this.model.colors[n];
            const geometry = new THREE.SphereGeometry(0.5, 10, 10);
            setGeometryColor(geometry, color);
            im.addGeometry("ball" + n, geometry);
            const mesh = im.addMesh("ball" + n, "ball" + n, "default");
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }

        const geo111 = new THREE.BoxGeometry( 1, 1, 1 );
        setGeometryColor(geo111, [0.5,0.5,0.5]);
        im.addGeometry("block111", geo111);

        const mesh111 = im.addMesh("111", "block111", "default");
        mesh111.receiveShadow = true;
        mesh111.castShadow = true;
        mesh111.receiveShadow = true;

        const geo121 = new THREE.BoxGeometry( 1, 2, 1 );
        setGeometryColor(geo121, this.model.colors[6]);
        im.addGeometry("block121", geo121);

        const mesh121 = im.addMesh("121", "block121", "default");
        mesh121.receiveShadow = true;
        mesh121.castShadow = true;
        mesh121.receiveShadow = true;

        const geo414 = new THREE.BoxGeometry( 4, 1, 4 );
        setGeometryColor(geo414, this.model.colors[5]);
        im.addGeometry("block414", geo414);

        const mesh414 = im.addMesh("414", "block414", "default");
        mesh414.receiveShadow = true;
        mesh414.castShadow = true;
        mesh414.receiveShadow = true;

        const barrel = new THREE.CylinderGeometry( 0.5, 0.5, 1, 10);
        setGeometryColor(barrel, [0.9,0,0]);
        im.addGeometry("barrel", barrel);

        const bbb = im.addMesh("barrel", "barrel", "default");
        bbb.receiveShadow = true;
        bbb.castShadow = true;
        bbb.receiveShadow = true;
    }


}

// webpack will replace process.env.NODE_ENV with the actual value
const apiKey = process.env.NODE_ENV === 'production'
    ? '1rN7t58Mo1ani03Djcl4amvdEAnoitB6g3oNxEDrC'
    : '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9';

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.demolition',
    apiKey,
    model: MyModelRoot,
    name: App.autoSession(),
    password: App.autoPassword(),
    view: MyViewRoot,
    tps:60
});