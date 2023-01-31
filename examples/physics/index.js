// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3,
     TextWidget3, SliderWidget3, User, UserManager} from "@croquet/worldcore";

import { Avatar, FPSAvatar } from "./src/Avatar";
import {AM_RapierDynamic, RapierManager, RAPIER, AM_RapierStatic} from "./src/Rapier";
// import { User, UserManager } from "./src/User";


//------------------------------------------------------------------------------------------
//-- TestActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Smoothed, AM_RapierDynamic) {
    get pawn() {return TestPawn}

    init(options) {
        super.init(options);
        console.log("TestActor");

        let cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        this.createCollider(cd);
        
    }

}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- TestPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);
    }

}

//------------------------------------------------------------------------------------------
//-- FixedActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FixedActor extends mix(Actor).with(AM_Smoothed, AM_RapierStatic) {
    get pawn() {return FixedPawn}

    init(options) {
        super.init(options);

        let cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        this.createCollider(cd);
        
    }
}
FixedActor.register('FixedActor');

//------------------------------------------------------------------------------------------
//-- FixedPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FixedPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        // console.log("test pawn constructor");

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,0)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);
    }

}


//------------------------------------------------------------------------------------------
//-- LevelActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LevelActor extends mix(Actor).with(AM_Spatial, AM_RapierStatic) {
    get pawn() {return LevelPawn}

    init(options) {
        super.init(options);
        const cd = RAPIER.ColliderDesc.cuboid(30, 0.5, 30);
        cd.translation = new RAPIER.Vector3(0,-1,0);
        const xxx = this.createCollider(cd);
        console.log(xxx);

    }
}
LevelActor.register('LevelActor');

//------------------------------------------------------------------------------------------
//-- LevelPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        this.floorGeometry = new THREE.PlaneGeometry(60, 60);
        this.floorMaterial = new THREE.MeshStandardMaterial( {color: 0x145A32 } );
        this.floorMaterial.side = THREE.DoubleSide;
        this.floorMaterial.shadowSide = THREE.DoubleSide;
        const floor = new THREE.Mesh( this.floorGeometry, this.floorMaterial );
        floor.receiveShadow = true;
        floor.rotation.set(-Math.PI/2, 0, 0);
        floor.position.set(0,-0.5, 0);
        group.add(floor);

        this.pillarGeometry = new THREE.BoxGeometry( 1, 5, 1 );
        this.pillarMaterial = new THREE.MeshStandardMaterial( {color: 0x784212 } );
        this.pillarMaterial.side = THREE.DoubleSide;
        this.pillarMaterial.shadowSide = THREE.DoubleSide;

        const pillar0 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        group.add(pillar0);
        pillar0.position.set(29.5, 2, -29.5);
        pillar0.castShadow = true;

        const pillar1 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        group.add(pillar1);
        pillar1.position.set(-29.5, 2, -29.5);
        pillar1.castShadow = true;
        

        const pillar2 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        group.add(pillar2);
        pillar2.position.set(29.5, 2, 29.5);
        pillar2.castShadow = true;
        

        const pillar3 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        group.add(pillar3);
        pillar3.position.set(-29.5, 2, 29.5);
        pillar3.castShadow = true;
        

        const ambient = new THREE.AmbientLight( 0xffffff, 0.5 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.5 );
        sun.position.set(1000, 1000, 1000);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 0;
        sun.shadow.camera.far = 5000;

        sun.shadow.bias = -0.0001;
        group.add(sun);

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
        this.floorGeometry.dispose();
        this.floorMaterial.dispose();
        this.pillarGeometry.dispose();
        this.pillarMaterial.dispose();
    }
}

//------------------------------------------------------------------------------------------
//-- MyUser --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    init(options) {
        super.init(options);
        this.myAvatar = FPSAvatar.create({name: "Avatar", driver: this, translation: [0,0,10]})
    }

    destroy() {
        super.destroy();
        if (this.myAvatar) this.myAvatar.destroy();
    }


}
MyUser.register("MyUser");

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser;}

}
MyUserManager.register("MyUserManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


// console.log(RapierPhysicsManager);

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager, RapierManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");
        this.level = LevelActor.create({world: "default"});
        this.fixed = FixedActor.create({world: "default", name: "Red Box", translation: [0,0,0]});

        this.subscribe("input","vDown", this.spawn);
        // this.subscribe("input","bDown", this.kill);
    }

    spawn() {
        const xxx = TestActor.create({world: "default", name: "Yellow Box", translation: [0.5,3,0.6]});
        xxx.rigidBody.applyImpulse(new RAPIER.Vector3(0,2,0), true);
        xxx.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(2,1,0), true);
    }

    kill() {
        if (this.testActor) this.testActor.destroy();
    }



}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, UIManager, ThreeRenderManager, WidgetManager];
    }

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
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