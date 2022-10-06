// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, Constants } from "@croquet/worldcore";

import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";
import { Avatar, FPSAvatar } from "./src/Avatar";
import { Voxels } from "./src/Voxels";
import { Surfaces } from "./src/Surfaces";
import { WorldBuilder } from "./src/WorldBuilder";
import { GodView } from "./src/GodView";


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

class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        // console.log("test pawn constructor");

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.receiveShadow = true;
        cube.castShadow = true;
        this.setRenderObject(cube);

    }

}


//------------------------------------------------------------------------------------------
//-- MapActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
}
LevelActor.register('LevelActor');

//------------------------------------------------------------------------------------------
//-- mapPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        this.floorGeometry = new THREE.BoxGeometry(50, 50, 0.5);
        this.floorMaterial = new THREE.MeshStandardMaterial( {color: 0x145A32 } );
        const floor = new THREE.Mesh( this.floorGeometry, this.floorMaterial );
        floor.receiveShadow = true;
        floor.castShadow = true;
        floor.position.set(10,10,-2);
        group.add(floor);


        const ambient = new THREE.AmbientLight( 0xffffff, 0.5 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight(new THREE.Color(1,1,1), 1.2 );
        sun.position.set(20, 20, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 0;
        sun.shadow.camera.far = 100;

        sun.shadow.camera.top = 20;
        sun.shadow.camera.bottom = -20;
        sun.shadow.camera.left = -20;
        sun.shadow.camera.right = 20;
        group.add(sun);

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
        // this.floorGeometry.dispose();
        // this.floorMaterial.dispose();
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
        return [MyUserManager, Voxels, Surfaces, WorldBuilder];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!!!!");
        this.level = LevelActor.create();
        this.actor0 = TestActor.create({name: "Origin", translation: [0,0,0]});
        this.actor1 = TestActor.create({name: "X", translation: [Constants.sizeX * Constants.scaleX,0,0]});
        this.actor2 = TestActor.create({name: "Y", translation: [0,Constants.sizeY * Constants.scaleY,0]});
        this.actor3 = TestActor.create({name: "XY", translation: [Constants.sizeX * Constants.scaleX, Constants.sizeY * Constants.scaleY,0]});

        const wb = this.service("WorldBuilder");
        const voxels = this.service("Voxels");
        wb.build();
        const surfaces = this.service("Surfaces");
        surfaces.rebuildAll();



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

        this.godView = new GodView(this.model);
    }

    update(time) {
        super.update(time);
        if (this.godView) this.godView.update(time);
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