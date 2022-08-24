// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, m4_identity, m4_rotationX, toRad, m4_scaleRotationTranslation, q_pitch, q_axisAngle } from "@croquet/worldcore";

import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import map from "./assets/silk.jpg";


//------------------------------------------------------------------------------------------
//-- TestActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return TestPawn}

}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- TestPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Widget3) {
    constructor(...args) {
        super(...args);
        // console.log("test pawn constructor");

        this.geometry = new THREE.BoxGeometry( 1, 2, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: 0x784212} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        const group = new THREE.Group();
        group.add(cube);
        cube.position.set(0, 1, 0);
        cube.castShadow = true;
        this.setRenderObject(group);

    }

}


//------------------------------------------------------------------------------------------
//-- LevelActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
}
LevelActor.register('LevelActor');

//------------------------------------------------------------------------------------------
//-- LevelPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        this.floorGeometry = new THREE.PlaneGeometry(200.0, 96.4);
        this.floorMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1) } );

        this.image = new Image();
        this.image.onload = () => {
            if (this.floorMaterial.map) this.floorMaterial.map.dispose();
            this.floorMaterial.map = new THREE.CanvasTexture(this.image);
            this.floorMaterial.needsUpdate = true;
        }
        this.image.src = map;

        const floor = new THREE.Mesh( this.floorGeometry, this.floorMaterial );
        floor.receiveShadow = true;
        floor.rotation.set(-Math.PI/2, 0, 0);
        group.add(floor);

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
        // this.myAvatar = FPSAvatar.create({name: "Avatar", driver: this, translation: [0,0,10]})
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



class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!!!");
        this.level = LevelActor.create();
        this.testActor = TestActor.create({name: "Yellow Box", translation: [0,0,0]});
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
        const render = this.service("ThreeRenderManager");
        render.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        render.renderer.shadowMap.enabled = true;

        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(-45)), [0,20,20]);
        const pitchMatrix = m4_rotationX(toRad(-20));
        render.camera.matrix.fromArray(cameraMatrix);
        render.camera.matrixAutoUpdate = false;
        render.camera.matrixWorldNeedsUpdate = true;

        const ambient = new THREE.AmbientLight( new THREE.Color(1,1,1), 0.5 );
        render.scene.add(ambient);

        const sun = new THREE.DirectionalLight(new THREE.Color(1,1,1), 0.8 );
        sun.position.set(50, 50, 50);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 20;
        sun.shadow.camera.far = 100;


        render.scene.add(sun);


    }


}

StartWorldcore({
    appId: 'io.croquet.cardtest',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'CardTest',
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    tps:60
});