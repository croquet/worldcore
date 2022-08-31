// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, m4_identity, m4_rotationX, toRad, m4_scaleRotationTranslation, q_pitch, q_axisAngle, PlaneWidget3, viewRoot } from "@croquet/worldcore";

    import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';


import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import silk from "./assets/silk.jpg";
import { Godview } from "./src/Godview";
import { MapActor} from "./src/Map";
import { BotActor} from "./src/Bot";
import { PathDebug, Paths } from "./src/Path";


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
        return [MyUserManager, Paths];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!!!!");
        this.map = MapActor.create();


        this.paths = this.service("Paths")
        this.paths.addNode("istambul", [-11,-7]);
        this.paths.addNode("almaty", [-5,0]);
        this.paths.addNode("tashkent", [0,-3]);
        this.paths.addNode("samarkand", [3,1]);
        this.paths.addNode("delhi", [7,5]);
        this.paths.addNode("mongolia", [11,-8]);


        this.paths.addEdge("tashkent", "istambul", 12);
        this.paths.addEdge("tashkent", "mongolia", 5);
        this.paths.addEdge("almaty", "tashkent", 55);
        this.paths.addEdge("tashkent", "samarkand", 11);
        this.paths.addEdge("samarkand", "delhi", 44);
        this.paths.addEdge("mongolia", "samarkand", 30);


        // const path = this.paths.findPath("delhi", "delhi");
        // console.log(path);

        this.testActor = BotActor.create({parent: this.map, home: "tashkent" });



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

        this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), render.scene, render.camera );
        this.outlinePass.edgeStrength = 3;
        this.outlinePass.edgeGlow = 1;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.visibleEdgeColor = new THREE.Color(0,1,0);
        render.composer.addPass( this.outlinePass );

        this.godView = new Godview(this.model);

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

        this.pathDebug = new PathDebug();

    }

    update(time) {
        super.update(time);
        this.godView.update(time);

    }

    hiliteMesh(mesh) {
        if (mesh) {
            this.outlinePass.selectedObjects = [mesh];
        } else {
            this.outlinePass.selectedObjects = [];
        }
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