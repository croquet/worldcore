// Simple Testbed

import { AM_Behavioral, App, Behavior, PM_ThreeCamera, UserManager, User, ViewService, AM_Avatar, PM_Avatar, AM_Smoothed, WidgetManager2, TextWidget2, toDeg, v3_rotate } from "@croquet/worldcore";

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

class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_Avatar, PM_ThreeVisible, PM_ThreeCamera) {

    constructor(actor) {
        super(actor);
        this.buildMesh();

        this.fore = this.back = this.left = this.right = 0;
        this.pitch = this.yaw = this.yawDelta = 0;
        this.speed = 5;
        this.turnSpeed = 0.002;

        this.cameraTranslation = [0,5,7];
        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,1,0], this.yawDelta);
        this.cameraRotation = q_multiply(pitchQ, yawQ);

        this.subscribe("input", "zDown", this.toggleDrive)

    }

    toggleDrive() {
        console.log(this.driving);
        if (this.isMyAvatarPawn) {
            if (this.driving) {
                this.park()
            } else {
                this.drive()
            }
        }
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    buildMesh() {  
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.geometry.translate(0,0.5,0);
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        const mesh = new THREE.Mesh( this.geometry, this.material );

        mesh.receiveShadow = true;
        mesh.castShadow = true;

        this.setRenderObject(mesh);
    }

    drive() {
        super.drive();
        this.service("GodView").paused = true;

        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);

        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
    }

    park() {
        super.park();
        this.service("GodView").paused = false;

        this.unsubscribe("input", "keyDown", this.keyDown);
        this.unsubscribe("input", "keyUp", this.keyUp);

        this.unsubscribe("input", "pointerDown", this.doPointerDown);
        this.unsubscribe("input", "pointerUp", this.doPointerUp);
        this.unsubscribe("input", "pointerDelta", this.doPointerDelta);
    }

    keyDown(e) {
        if (this.focused) return;
        switch(e.key) {
            case "ArrowUp":
            case "w":
            case "W":
                this.fore = -1; break;
            case "ArrowDown":
            case "s":
            case "S":
                this.back = 1; break;
            case "ArrowLeft":
            case "a":
            case "A":
                this.left = -1; break;
            case "ArrowRight":
            case "d":
            case "D" :
                this.right = 1; break;
            default:
        }
    }

    keyUp(e) {
        if (this.focused) return;
        switch(e.key) {
            case "ArrowUp":
            case "w":
                this.fore = 0; break;
            case "ArrowDown":
            case "s":
                this.back = 0; break;
            case "ArrowLeft":
            case "a":
                this.left = 0; break;
            case "ArrowRight":
            case "d":
                this.right = 0; break;
            default:
        }
    }

    doPointerDown(e) {
        if (e.button === 2) this.service("InputManager").enterPointerLock();;
    }

    doPointerUp(e) {
        if (e.button === 2) this.service("InputManager").exitPointerLock();
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yawDelta += (-this.turnSpeed * e.xy[0]);
            this.pitch += (-this.turnSpeed * e.xy[1]);
            this.pitch = Math.max(-Math.PI/2, this.pitch);
            this.pitch = Math.min(Math.PI/2, this.pitch);
            const pitchQ = q_axisAngle([1,0,0], this.pitch);
            const yawQ = q_axisAngle([0,1,0], this.yawDelta);
            this.cameraRotation = q_multiply(pitchQ, yawQ);
        };
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) {
            this.yaw += this.yawDelta;
            this.yawDelta = 0;
            const yawQ = q_axisAngle([0,1,0], this.yaw);
            const v = v3_scale([(this.left + this.right), 0, (this.fore + this.back)], this.speed * delta/1000)
            const vv = v3_rotate(v, yawQ);
            const t = v3_add(this.translation, vv);
            this.positionTo(t,yawQ);
        }
    }
}

//------------------------------------------------------------------------------------------
//-- MyUser --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    init(options) {
        super.init(options);
        this.avatar = AvatorActor.create({name: "Avatar", driver: this, translation: [0,0,20]});

        const halo = TestActor.create({parent: this.avatar, translation: [0,1.5,0]})
        halo.behavior.start({name: "SpinBehavior", axis:[1,0,0], speed:3});
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
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


        this.test00 = TestActor.create({translation:[-5,0,0]});
        this.test01 = TestActor.create({translation:[5,0,0]});
        this.test10 = TestActor.create({translation:[0,0,-5]});
        this.test11 = TestActor.create({translation:[0,0,5]});

        // this.subscribe("input", "xDown", this.ttt)
    }

    // ttt() {
    //     const um = this.service("UserManager");
    //     console.log(um.users);
    // }

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

    // togglePause() {
    //     console.log("ttt");
    //     this.paused = !this.paused
    // }

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
        return [InputManager, ThreeRenderManager, GodView, WidgetManager2];
    }

    constructor(model) {
        super(model);
        this.buildLights();
        // this.buildHUD();
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

}

// webpack will replace process.env.NODE_ENV with the actual value
const apiKey = process.env.NODE_ENV === 'production'
    ? '1rN7t58Mo1ani03Djcl4amvdEAnoitB6g3oNxEDrC'
    : '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9';


    App.makeWidgetDock({debug: true, stats: true});
StartWorldcore({
    appId: 'io.croquet.simple',
    // apiKey,
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    model: MyModelRoot,
    name: 'test',
    // name: App.autoSession(),
    // password: App.autoPassword(),
    password: "password",
    view: MyViewRoot,
    tps:60
});