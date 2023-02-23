// Simple Testbed

import { AM_Behavioral, App, Behavior, PM_ThreeCamera, UserManager, User, ViewService, AM_Avatar, PM_Avatar, AM_Smoothed } from "@croquet/worldcore";

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, q_multiply, q_axisAngle, v3_scale, v3_add  } from "@croquet/worldcore";


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

class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
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
// AvatorActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatorActor extends mix(Actor).with(AM_Spatial, AM_Avatar) {

    get pawn() {return  AvatarPawn}

    init(options = {}) {
        super.init(options);
    }

}
AvatorActor.register('AvatorActor');

//------------------------------------------------------------------------------------------
// AvatarPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_Avatar, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.buildMesh();
        this.fore = 0;
        this.back = 0;
        this.left = 0;
        this.right = 0;
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    buildMesh() {  
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        const mesh = new THREE.Mesh( this.geometry, this.material );

        mesh.receiveShadow = true;
        mesh.castShadow = true;

        this.setRenderObject(mesh);
    }

    drive() {
        console.log("test drive");
        this.subscribe("input", "ArrowUpDown", this.foreDown);
        this.subscribe("input", "ArrowUpUp", this.foreUp);
        this.subscribe("input", "ArrowDownDown", this.backDown);
        this.subscribe("input", "ArrowDownUp", this.backUp)

        this.subscribe("input", "ArrowRightDown", this.rightDown);
        this.subscribe("input", "ArrowRightUp", this.rightUp);
        this.subscribe("input", "ArrowLeftDown", this.leftDown);
        this.subscribe("input", "ArrowLeftUp", this.leftUp)
    }

    park() {
        console.log("test park");
        this.unsubscribe("input", "ArrowUpDown", this.foreDown);
        this.unsubscribe("input", "ArrowUpUp", this.foreUp);
        this.unsubscribe("input", "ArrowDownDown", this.backDown);
        this.unsubscribe("input", "ArrowDownUp", this.backUp)

        this.unsubscribe("input", "ArrowRightDown", this.rightDown);
        this.unsubscribe("input", "ArrowRightUp", this.rightUp);
        this.unsubscribe("input", "ArrowLeftDown", this.leftDown);
        this.unsubscribe("input", "ArrowLeftUp", this.leftUp)
    }

    foreDown() { this.fore = -1 }
    foreUp() {  this.fore = 0  }
    backDown() {this.back = 1  }
    backUp() { this.back = 0  }

    rightDown() { this.right = 1 }
    rightUp() {  this.right = 0 }
    leftDown() {this.left = -1 }
    leftUp() { this.left = 0}

    update(time, delta) {
        super.update(time,delta);
        if (!this.driving) return;
        const v = v3_scale([(this.left + this.right), 0, (this.fore + this.back)], 5 * delta/1000)
        const t = v3_add(this.translation, v);
        this.translateTo(t);
    }

}

//------------------------------------------------------------------------------------------
//-- MyUser --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    init(options) {
        super.init(options);
        this.myAvatar = AvatorActor.create({name: "Avatar", driver: this, translation: [0,0,10]})
    }

    destroy() {
        super.destroy();
        if (this.myAvatar) this.myAvatar.destroy();
    }


}
MyUser.register("MyUser");

//------------------------------------------------------------------------------------------
//-- MyUserManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser;}

}
MyUserManager.register("MyUserManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");

        this.base = BaseActor.create({});

        this.test0 = TestActor.create({translation:[0,5,0]});
        this.test1 = TestActor.create({parent: this.test0, translation:[5,0,0]});

        this.test0.behavior.start({name: "SpinBehavior", axis:[0,1,0], speed: 2});
        this.test1.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

        this.subscribe("input", "xDown", this.ttt)
    }

    ttt() {
        const um = this.service("UserManager");
        console.log(um.users);
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
        // this.subscribe("input", "zDown", this.togglePause);
    }

    togglePause() {
        console.log("ttt");
        this.paused = !this.paused
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

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, GodView];
    }

    constructor(model) {
        super(model);
        this.buildLights();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

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

}

// webpack will replace process.env.NODE_ENV with the actual value
const apiKey = process.env.NODE_ENV === 'production'
    ? '1rN7t58Mo1ani03Djcl4amvdEAnoitB6g3oNxEDrC'
    : '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9';



StartWorldcore({
    appId: 'io.croquet.simple',
    apiKey,
    model: MyModelRoot,
    // name: 'test',
    name: App.autoSession(),
    password: App.autoPassword(),
    view: MyViewRoot,
    tps:60
});