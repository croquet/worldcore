// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    AM_Smoothed, PM_Smoothed, sphericalRandom, q_axisAngle, m4_scaleRotationTranslation, toRad, v3_scale } from "@croquet/worldcore";

import { InstanceManager, PM_ThreeVisibleInstanced } from "./src/Instances";

// import { FPSAvatar } from "./src/Avatar";
import { AM_RapierDynamicRigidBody, RapierManager, RAPIER, AM_RapierStaticRigidBody, AM_RapierWorld } from "./src/Rapier";


//------------------------------------------------------------------------------------------
//-- SprayActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierDynamicRigidBody) {
    get pawn() {return SprayPawn}

    get shape() {return this._shape || "cube"}
    get index() { return this._index || 0 }

    init(options) {
        super.init(options);
        this.parent.live.push(this);
        if (this.parent.live.length > 500) this.parent.live.shift().destroy();

        this.buildCollider();
    }

    buildCollider() {
        let cd;
        switch(this.shape) {
            case "cone":
                cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
                cd.setDensity(3)
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
        
        // cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
        this.createCollider(cd);
  
    }

}
SprayActor.register('SprayActor');

//------------------------------------------------------------------------------------------
//-- SprayPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleInstanced) {
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

        cd = RAPIER.ColliderDesc.cuboid(0.5, 5, 25);
        cd.translation = new RAPIER.Vector3(-20,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(0.5, 5, 25);
        cd.translation = new RAPIER.Vector3(20,0,0);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(25, 5, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,20);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(25, 5, 0.5);
        cd.translation = new RAPIER.Vector3(0,0,-20);
        this.createCollider(cd);


        this.future(1000).spray();
    }

    spray() {
        this.spawn();
        console.log(this.live.length);
        if (!this.doomed) this.future(500).spray();
    }

    spawn() {
        const type = this.random()
        let shape = "cube";

        if (type > 0.4) shape = "cylinder";
        if (type > 0.7) shape = "ball";
        if (type > 0.9) shape = "cone";

        const index = Math.floor(this.random()*10);
        const spray = SprayActor.create({parent: this, shape, index, translation: [0.5,3,0.6]});

        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
        const force = [0, 17.5 + 5 * Math.random(), 0];

        spray.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        spray.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
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
       
        this.nozzleGeometry = new THREE.BoxGeometry( 1, 2, 1 );
        this.nozzlematerial = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        this.nozzlematerial.side = THREE.DoubleSide;
        this.nozzlematerial.shadowSide = THREE.DoubleSide;

        const nozzle = new THREE.Mesh( this.nozzleGeometry, this.nozzlematerial );
        nozzle.castShadow = true;
        nozzle.receiveShadow = true;

        this.baseGeometry = new THREE.BoxGeometry( 50, 1, 50 );
        this.baseMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.5,0.5,0.5)} );
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

        this.fountain = FountainActor.create({gravity: [0,-9.8,0], translation: [0,0,0]});
    }

    seedColors() {
        this.colors = [];
        for (let i = 0; i < 50; i++ ) {
            const r = Math.random() * 0.9;
            const g = Math.random() * 0.9;
            const b = Math.random() * 0.9;
            this.colors.push([0.9-r, 0.9-g, 1-b]);
        }
    }




}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 40;

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, InstanceManager];
    }

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        this.startCamera();
    }

    startCamera() {
        const rm = this.service("ThreeRenderManager");

        const rotation = q_axisAngle([1,0,0], toRad(-45));
        const translation =[0,50,50];
        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], rotation, translation);
        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 0.5 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.5 );
        sun.position.set(100, 100, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 200;

        sun.shadow.camera.left = -50
        sun.shadow.camera.right = 50
        sun.shadow.camera.top = 50
        sun.shadow.camera.bottom = -50

        sun.shadow.bias = -0.0001;
        group.add(sun);

        rm.scene.add(group);
    }

}

StartWorldcore({
    appId: 'io.croquet.physics',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'Physics',
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    tps:60
});