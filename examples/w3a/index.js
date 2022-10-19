// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, Constants, WorldcoreView, viewRoot, WidgetManager2 } from "@croquet/worldcore";

import paper from "./assets/paper.jpg";
import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";
import { Avatar, FPSAvatar } from "./src/Avatar";
import { Voxels } from "./src/Voxels";
import { Surfaces } from "./src/Surfaces";
import { Stress } from "./src/Stress";
import { WorldBuilder } from "./src/WorldBuilder";
import { GodView } from "./src/GodView";
import { MapView, MapViewX } from "./src/MapView";

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

        const group = new THREE.Group()


        const ambient = new THREE.AmbientLight( 0xffffff, 0.5 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight(new THREE.Color(1,1,1), 0.5 );
        sun.position.set(200, 100, 200);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0;
        sun.shadow.camera.far = 500;

        sun.shadow.camera.top = 200;
        sun.shadow.camera.bottom = -200;
        sun.shadow.camera.left = -200;
        sun.shadow.camera.right = 200;
        sun.shadow.bias = -0.002;
        sun.shadow.radius = 2
        sun.shadow.blurSamples = 3
        group.add(sun);

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
    }
}

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------



class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [Voxels, Stress, Surfaces, WorldBuilder];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model");
        this.level = LevelActor.create();


        const wb = this.service("WorldBuilder");
        const voxels = this.service("Voxels");
        wb.build();

        // const surfaces = this.service("Surfaces");
        // surfaces.rebuildAll();


        this.subscribe("input", "nDown", this.test)
    }

    test() {
        // console.log("test");
        const wb = this.service("WorldBuilder");
        wb.build();
        const voxels = this.service("Voxels");
        // voxels.set(3,2,1, 4);

    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, {service:ThreeRenderManager, options: {antialias: true}}, WidgetManager, WidgetManager2];
    }

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        this.godView = new GodView(this.model);
        // this.mapView = new MapView(this.model);

        this.mapView  = new MapViewX();

        document.body.style.cursor = "crosshair";
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