// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, Constants, WorldcoreView, viewRoot } from "@croquet/worldcore";

import paper from "./assets/paper.jpg";
import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";
import { Avatar, FPSAvatar } from "./src/Avatar";
import { Voxels } from "./src/Voxels";
import { Surfaces } from "./src/Surfaces";
import { WorldBuilder } from "./src/WorldBuilder";
import { GodView } from "./src/GodView";
import { MapView } from "./src/MapView";


//------------------------------------------------------------------------------------------
//-- WorldActor -----------------------------------------------------------------------------
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

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        this.material.shadowSide = THREE.FrontSide;
        this.material.vertexColors = true;

        this.image = new Image();
        this.image.onload = () => {
            if (this.material.map) this.material.map.dispose();
            this.material.map = new THREE.CanvasTexture(this.image);
            this.material.needsUpdate = true;
        }

        this.image.src = paper;

        const mb  = new MeshBuilder();
        mb.addFace(
            [[0,0,0], [5,0,0], [5,5,0], [0,5,0]],
            [[0,0], [1,0], [1,1], [0,1]],
            [1,1,0]
        )
        const mesh =  mb.build(this.material);

        mesh.castShadow = true;

        this.setRenderObject(mesh);

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

        this.floorGeometry = new THREE.BoxGeometry(50, 50, 0.1);
        this.floorMaterial = new THREE.MeshStandardMaterial( {color: 0x145A32 } );
        const floor = new THREE.Mesh( this.floorGeometry, this.floorMaterial );
        floor.receiveShadow = true;
        floor.castShadow = true;
        floor.position.set(10,10,-1);
        group.add(floor);


        const ambient = new THREE.AmbientLight( 0xffffff, 0.8 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight(new THREE.Color(1,1,1), 1 );
        sun.position.set(200, 100, 200);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0;
        sun.shadow.camera.far = 500;

        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.bias = -0.001;
        group.add(sun);

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
        this.floorGeometry.dispose();
        this.floorMaterial.dispose();
    }
}

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------



class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [Voxels, Surfaces, WorldBuilder];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");
        this.level = LevelActor.create();
        // this.actor0 = TestActor.create({name: "Origin", translation: [-1,0,1]});
        // this.actor1 = TestActor.create({name: "Origin", translation: [10,0,1]});
        // this.actor2 = TestActor.create({name: "Origin", translation: [0,10,1]});
        // this.actor3 = TestActor.create({name: "Origin", translation: [10,10,1]});


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
        this.mapView = new MapView(this.model);
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