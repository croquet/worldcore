// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, Constants, WorldcoreView, viewRoot, WidgetManager2, v3_THREE, behaviorRegistry, m4_identity, m4_translation, m4_THREE, ThreeRenderManagerX, PM_ThreeVisibleX } from "@croquet/worldcore";



import paper from "./assets/paper.jpg";
import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";
import { packKey, Voxels } from "./src/Voxels";
import { PropManager, VoxelActor } from "./src/Props";
import { Surfaces } from "./src/Surfaces";
import { Stress } from "./src/Stress";
import { WorldBuilder } from "./src/WorldBuilder";
import { GodView } from "./src/GodView";
import { MapView, MapViewX } from "./src/MapView";
import { InstanceManager } from "./src/Instances";
import { BotManager } from "./src/Bots";
import { Paths} from "./src/Paths";

//------------------------------------------------------------------------------------------
//-- Helper Functions -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export function THREE_v3(x,y,z) { return new THREE.Vector3 (x,y,z) }
// export function THREE_v2(x,y) { return new THREE.Vector2 (x,y) }
// export function THREE_q(x,y,z,w) { return new THREE.Quaternion (x,y,z,w) }

// export function THREE_m4(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
//     const m = new THREE.Matrix4 ();
//     m.set( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 );
//     return m;
//  }

// export function v3(v) { return [v.x, v.y, v.z] }
// export function v2(v) { return [v.x, v.y]}
// export function q(q) { return [q.x, q.y, q.z, q.w ] }
// export function m4(m) {  return [...m.elements] }

// THREE.Vector3.prototype.elements = function() { return [this.x, this.y, this.z]};
// THREE.Quaternion.prototype.elements = function() { return [this.x, this.y, this.z, this.w ]};




// //------------------------------------------------------------------------------------------
// //-- WorldActor -----------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// class TestActor extends mix(Actor).with(AM_Smoothed) {
//     get pawn() {return TestPawn}

// }
// TestActor.register('TestActor');

// //------------------------------------------------------------------------------------------
// //-- TestPawn ------------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleX) {
//     constructor(...args) {
//         super(...args);

//         this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
//         this.material.shadowSide = THREE.FrontSide;
//         this.material.vertexColors = true;

//         this.image = new Image();
//         this.image.onload = () => {
//             if (this.material.map) this.material.map.dispose();
//             this.material.map = new THREE.CanvasTexture(this.image);
//             this.material.needsUpdate = true;
//         }

//         this.image.src = paper;

//         const mb  = new MeshBuilder();
//         mb.addFace(
//             [[0,0,0], [5,0,0], [5,5,0], [0,5,0]],
//             [[0,0], [1,0], [1,1], [0,1]],
//             [1,1,0]
//         )
//         const mesh =  mb.build(this.material);

//         mesh.castShadow = true;

//         this.setRenderObject(mesh);

//     }

// }


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

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisibleX) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group()


        const ambient = new THREE.AmbientLight( 0xffffff, 0.5);
        group.add(ambient);

        const sun = new THREE.DirectionalLight(new THREE.Color(1,1,1), 0.5 );
        sun.position.set(200, 100, 200);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 0;
        sun.shadow.camera.far = 500;

        sun.shadow.camera.top = 400;
        sun.shadow.camera.bottom = -400;
        sun.shadow.camera.left = -400;
        sun.shadow.camera.right = 400;
        sun.shadow.bias = -0.002;
        sun.shadow.radius = 4
        sun.shadow.blurSamples = 5
        group.add(sun);

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
    }
}

//------------------------------------------------------------------------------------------
//-- MyUserManager ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser;}
}
MyUserManager.register("MyUserManager");

//------------------------------------------------------------------------------------------
//-- MyUser ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    // get pawn() {return GodView;}

    init(options){
        super.init(options);
        // console.log("new user: " + this.userId)
    }
}
MyUser.register("MyUser");


//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager, Voxels, Stress, Surfaces, Paths, WorldBuilder, PropManager, BotManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!!!");
        this.level = LevelActor.create();


        const wb = this.service("WorldBuilder");
        // const voxels = this.service("Voxels");
        wb.build();

        this.subscribe("input", "nDown", this.test0)
        this.subscribe("input", "pDown", this.test1)
    }

    test0() {
        console.log("test0");
        const wb = this.service("WorldBuilder");
        wb.build();
    }

    test1() {
        console.log("test1");
        const paths = this.service("Paths");
        paths.rebuildAll();
        // console.log(paths);
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, {service:ThreeRenderManagerX, options: {antialias: true}}, InstanceManager, WidgetManager, WidgetManager2];
    }

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        this.godView = new GodView(this.model);
        this.mapView = new MapView(this.model);

        document.body.style.cursor = "crosshair";

        this.subscribe("input", "zDown", this.zTest);
        this.subscribe("input", "xDown", this.xTest);

    }

    detach() {
        super.detach();
        // if (this.godView) this.godView.destroy();
        if (this.mapView) this.mapView.destroy();
    }

    update(time) {
        super.update(time);
        if (this.godView) this.godView.update(time);
    }

    zTest() {
        console.log("zTest");
    }

    xTest() {
        console.log("xTest");
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