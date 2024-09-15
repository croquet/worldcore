// this is the code for the Physics Fountain example. It creates a fountain of rigid bodies that are affected by gravity and collide with the world.
// It uses the Croquet framework with the Worldcore and Worldcore-Rapier extensions. Worldcore is a simple 3D engine that provides a basic scene graph and input handling.
// Rapier is a physics engine that provides rigid body dynamics and collision detection.
import { StartWorldcore, App, UserManager, User, ModelRoot, Actor, mix, AM_Spatial, sphericalRandom,
    ViewRoot, Pawn, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, PM_Avatar, AM_Avatar,
    THREE, PM_Smoothed, ThreeInstanceManager, PM_ThreeInstanced,
    v3_scale, v3_add, v3_sub, v3_normalize, v3_magnitude, v3_transform,
    m4_getTranslation, m4_rotation, m4_multiply, m4_translation, TAU, toRad
} from "@croquet/worldcore";
import { RAPIER, RapierManager, AM_RapierWorld, AM_RapierRigidBody} from "@croquet/worldcore-rapier";

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
}

// AvatarActor represents the player's avatar. It is represented by a sphere that other users can see.
class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Avatar) {
    get pawn() { return "AvatarPawn" }
    // no need to override init, but we can if we need to
    init(options) {
        super.init(options);
        this.subscribe("input", "resetAll", this.reset);
    }

    reset() {
        this.say("reset");
    }
}
AvatarActor.register('AvatarActor');

// SprayActor generates dynamic rigid bodies that are affected by gravity and collide with the world
class SprayActor extends mix(Actor).with(AM_Spatial, AM_RapierRigidBody) {
    get pawn() {return "SprayPawn"}

    get shape() {return this._shape || "cube"}
    get index() { return this._index || 0 }

    init(options) {
        super.init(options);
        this.parent.live.push(this);
        if (this.parent.live.length > this.parent.max) this.parent.live.shift().destroy();

        this.buildCollider();
    }

    buildCollider() {
        let cd;
        switch (this.shape) {
            case "cone":
                cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
                cd.setDensity(4);
                break;
            case "ball":
                cd = RAPIER.ColliderDesc.ball(0.5);
                cd.setDensity(2);
                break;
            case "cylinder":
                cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
                cd.setDensity(1.5);
                break;
            case "cube":
            default:
                cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
                cd.setDensity(1);
            break;
        }
        this.createCollider(cd);
    }
}
SprayActor.register('SprayActor');

// FountainActor generates a new rigid body every 300ms and applies a random impulse to it.
class FountainActor extends mix(Actor).with(AM_Spatial, AM_RapierWorld, AM_RapierRigidBody) {
    get pawn() {return "FountainPawn"}

    init(options) {
        super.init(options);
        this.live = [];

        let cd = RAPIER.ColliderDesc.cuboid(15, 0.5, 15);
        this.createCollider(cd);
        cd = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(0.5, 2, 15);
        cd.translation = new RAPIER.Vector3(-14,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(0.5, 2, 15);
        cd.translation = new RAPIER.Vector3(14,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(15, 2, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,14);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(15, 2, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,-14);
        this.createCollider(cd);

        this.subscribe("ui", "shoot", this.doShoot);

        this.future(1000).spray();
    }

    get max() { return this._max || 50}

    spray() {
        this.spawn();
        if (!this.doomed) this.future(300).spray();
    }

    spawn() {
        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
        const force = [0, 17.5 + 5 * Math.random(), 0];
        const translation = [0, 3, 0];
        this.generate(translation, force, spin);
    }

    doShoot(gun) {
        // give a bit more upwards velocity as the gun gets further away
        const aim = v3_normalize(v3_sub([0,Math.abs(gun[2])/3,0], gun));
        const force = v3_scale(aim, 40);
        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
        const translation = v3_add(gun, [0,0,0]);
        this.generate(translation, force, spin);
    }

    generate(translation, force, spin) {
        const type = this.random();
        let shape = "cube";
        if (type > 0.4) shape = "cylinder";
        if (type > 0.7) shape = "ball";
        if (type > 0.9) shape = "cone";
        const index = Math.floor(this.random()*20);
        const bullet = SprayActor.create({parent: this, shape, index, translation, rigidBodyType: "dynamic"});

        bullet.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        bullet.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
    }

}
FountainActor.register('FountainActor');

// MyUserManager/MyUser Create a new avatar when a new user joins.
class MyUserManager extends UserManager {
    get defaultUser() {return MyUser}
}
MyUserManager.register('MyUserManager');

class MyUser extends User {
    init(options) {
        super.init(options);
        const fountain = this.wellKnownModel("ModelRoot").fountain;
        this.avatar = AvatarActor.create({
            parent: fountain,
            driver: this.userId
        });
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
    }
}
MyUser.register('MyUser');

// MyModelRoot the base model for the application. It creates the fountain and seeds the colors.
export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [RapierManager, MyUserManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
        this.fountain = FountainActor.create({gravity: [0,-9.8,0], timestep:50, translation: [0,0,0], max: 200, rigidBodyType: "static"});
    }
}
MyModelRoot.register("MyModelRoot");

// AvatarPawn provides both the visual representation of the avatar and the controls for the user.
export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar) {

    constructor(actor) {
        super(actor);
        const geometry = new THREE.SphereGeometry( 1, 10, 10 );
        const material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,0)} );
        material.side = THREE.FrontSide;
        material.shadowSide = THREE.FrontSide;
        material.castShadow = true;
        const mesh = new THREE.Mesh( geometry, material );
        this.setRenderObject(mesh);
        this.setPose();
        if (this.isMyAvatar) this.updatePose();
    }

    drive() { // if this is my avatar, then subscribe to user events
        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "rDown", this.resetPose);
        this.subscribe("input", "RDown", this.resetAll);
        this.subscribe("input", " Down", this.doShoot);
        this.subscribe("input", "tap", this.doShoot);
        this.listen("reset", this.resetPose);
    }

    park() { } // if this is not my avatar don't do anything

    resetAll() {
        this.publish("input", "resetAll");
        console.log("reset all");
    }

    setPose() { // initial and reset pose
        this.position = [0,0,40];
        this.pitch = toRad(-20);
        this.yaw = toRad(-30);
    }

    resetPose() {
        if (this.isMyAvatar) {
            this.setPose();
            this.updatePose();
        }
    }

    updatePose() {
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], this.pitch);
        const yawMatrix = m4_rotation([0,1,0], this.yaw);
        let cameraMatrix = m4_translation(this.position);
        cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);

        const avatarTranslation = m4_getTranslation(cameraMatrix);
        const length = v3_magnitude(avatarTranslation)+2;
        const norm = v3_normalize(avatarTranslation);
        avatarTranslation[1]-=1.5
        this.translateTo(v3_scale(norm, length));

        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = 60;
        rm.camera.updateProjectionMatrix();
    }

    onWheel(data) { // zoom in and out
        this.position[2] = Math.max(10, Math.min(100, this.position[2] - data.deltaY / 10));
        this.updatePose();
    }

    doPointerDown() {
        this.dragging = true;
    }

    doPointerUp() {
        this.dragging = false;
    }

    doPointerDelta(e) {
        if (!this.dragging) return;
        this.yaw += -0.01 * e.xy[0];
        this.yaw %= TAU;
        this.pitch += -0.01 * e.xy[1];
        this.pitch = Math.min(this.pitch, toRad(-15));
        this.pitch = Math.max(this.pitch, toRad(-90));
        this.updatePose();
    }

    doShoot() {
        const pitchMatrix = m4_rotation([1,0,0], this.pitch);
        const yawMatrix = m4_rotation([0,1,0], this.yaw);
        const both = m4_multiply(pitchMatrix, yawMatrix);
        let gun = [this.position[0], this.position[1]-1, this.position[2]];
        const shoot = v3_transform(gun, both);
        this.publish("ui", "shoot", shoot);
    }
}
AvatarPawn.register("AvatarPawn");

// SprayPawn the visual representation of the SprayActor rigid bodies
export class SprayPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance(this.actor.shape);
        this.setColor(new THREE.Color(...this.parent.colors[this.actor.index]));
    }
}
SprayPawn.register("SprayPawn");

// FountainPawn the visual representation of the fountain nozzle and base/floor
export class FountainPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        this.nozzleGeometry = new THREE.CylinderGeometry( 1, 0.5, 5, 10 );
        this.nozzlematerial = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );

        const nozzle = new THREE.Mesh( this.nozzleGeometry, this.nozzlematerial );
        nozzle.castShadow = true;
        nozzle.receiveShadow = true;

        this.baseGeometry = new THREE.BoxGeometry( 30, 1, 30 );
        this.baseMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.5,1,0.4)} );

        const base = new THREE.Mesh( this.baseGeometry, this.baseMaterial );
        base.receiveShadow = true;

        group.add(base);
        group.add(nozzle);

        this.setRenderObject(group);

        this.seedColors();
    }

    seedColors() {
        this.colors = [
            rgb(242, 215, 213), rgb(217, 136, 128), rgb(192, 57, 43), // Red
            rgb(240, 178, 122), rgb(230, 126, 34),  rgb(175, 96, 26), // Orange
            rgb(247, 220, 111), rgb(241, 196, 15),  rgb(183, 149, 11), // Yellow
            rgb(125, 206, 160), rgb(39, 174, 96),   rgb(30, 132, 73),  // Green
            rgb(133, 193, 233), rgb(52, 152, 219),  rgb(40, 116, 166), // Blue
            rgb(195, 155, 211), rgb(155, 89, 182),  rgb(118, 68, 138), // Purple
            [0.9, 0.9, 0.9],        // White
            [0.5, 0.5, 0.5],        // Gray
            [0.2, 0.2, 0.2]        // Black
        ];
    }
}
FountainPawn.register("FountainPawn");

// MyViewRoot the initial view for the application. It creates the lights and instances for the scene.
export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [
            InputManager,
            {
                service: ThreeRenderManager,
                options: {
                    renderer: { antialias: true },
                    shadowMap: { enabled: true },
                    composer: { enabled: false },
                }
            },
            ThreeInstanceManager];
    }

    // no need for a constructor, use default... constructor(model) { super(model); }

    onStart() {
        this.buildInstances();
        this.buildLights();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.shadowMap.enabled = true;
        rm.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        rm.renderer.outputEncoding = THREE.sRGBEncoding;
        rm.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        rm.renderer.toneMappingExposure = 1.5; // Increase exposure
        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 0.5 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.7 );
        sun.position.set(100, 400, 200);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024; //4096;
        sun.shadow.mapSize.height = 1024; //4096;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 500;

        sun.shadow.camera.left = -80;
        sun.shadow.camera.right = 80;
        sun.shadow.camera.top = 80;
        sun.shadow.camera.bottom = -80;
        sun.shadow.bias = -0.001;

        group.add(sun);
        rm.scene.add(group);
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        material.side = THREE.FrontSide;
        material.shadowSide = THREE.FrontSide;
        material.castShadow = true;
        material.receiveShadow = true;

        im.addMaterial("default", material);

        this.buildCubes();
        this.buildCylinders();
        this.buildBalls();
        this.buildCones();
    }

    buildCubes() {
        const im = this.service("ThreeInstanceManager");
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("cube", geometry);
        const mesh = im.addMesh("cube", "cube", "default", 200);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    buildCylinders() {
        const im = this.service("ThreeInstanceManager");
        const geometry = new THREE.CylinderGeometry( 0.5, 0.5, 1, 10 );
        im.addGeometry("cylinder", geometry);
        const mesh = im.addMesh("cylinder", "cylinder", "default", 200);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    buildBalls() {
        const im = this.service("ThreeInstanceManager");
        const geometry = new THREE.SphereGeometry( 0.5, 10, 10);
        im.addGeometry("ball", geometry);
        const mesh = im.addMesh("ball", "ball", "default", 200);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    buildCones() {
        const im = this.service("ThreeInstanceManager");
        const geometry = new THREE.ConeGeometry( 0.5, 1, 10, 1);
        im.addGeometry("cone", geometry);
        const mesh = im.addMesh("cone", "cone", "default", 200);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }
}

// create the Multisynq widget at the bottom/left of the screen that includes a QR code and debug info
App.makeWidgetDock(); // shows QR code

// Start the application with the configuration options - appId, apiKey, password, model, view, tps/tick rate
StartWorldcore({
    appId: 'io.croquet.physics',
    apiKey: '2d0fPrsWoWQFrelRWB1TftMoNJLfOk4Ni6XkQvswX3', //'1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    //tps: 60,
});
