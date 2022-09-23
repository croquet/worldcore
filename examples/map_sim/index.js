// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, m4_identity, m4_rotationX, toRad, m4_scaleRotationTranslation, q_pitch, q_axisAngle, PlaneWidget3, viewRoot, Widget, BoxWidget } from "@croquet/worldcore";

    import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';


import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import silk from "./assets/silk.jpg";
import { Godview } from "./src/Godview";
import { MapActor} from "./src/Map";
import { BotActor} from "./src/Bot";
import { PathDebug, Paths } from "./src/Path";
import { CaravanManager } from "./src/Caravan";
import { HUD } from "./src/Hud";


//------------------------------------------------------------------------------------------
//-- MyUser --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUser extends User {

    // init(options) {
    //     super.init(options);
    // }

    // destroy() {
    //     super.destroy();
    //     if (this.myAvatar) this.myAvatar.destroy();
    // }

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
        return [MyUserManager, Paths, CaravanManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
        this.map = MapActor.create();


        this.paths = this.service("Paths")
        this.paths.addNode("istambul", [-11,-7]);
        this.paths.addNode("almaty", [-5,0]);
        this.paths.addNode("tashkent", [0,-3]);
        this.paths.addNode("samarkand", [3,1]);
        this.paths.addNode("delhi", [7,5]);
        this.paths.addNode("mongolia", [11,-8]);
        this.paths.addNode("peking", [25,0]);
        this.paths.addNode("shanghai", [20,5]);


        this.paths.addEdge("tashkent", "istambul", 12);
        this.paths.addEdge("tashkent", "mongolia", 20);
        this.paths.addEdge("almaty", "tashkent", 55);
        this.paths.addEdge("tashkent", "samarkand", 11);
        this.paths.addEdge("samarkand", "delhi", 44);
        this.paths.addEdge("mongolia", "samarkand", 30);
        this.paths.addEdge("mongolia", "peking", 70);
        this.paths.addEdge("shanghai", "peking", 30);
        this.paths.addEdge("shanghai", "delhi", 40);

        this.subscribe("hud", "newCaravan", this.test);



    }

    test() {
        console.log("test");


        const names = ["Akbar", "Battuta", "Marco", "Peng", "Jasmine", "Aladdin", "Sinbad"];
        const n = Math.floor(names.length * Math.random())
        const home = this.service("Paths").randomNode();

        const cm = this.service("CaravanManager");
        cm.createCaravan(names[n], home);
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

        const url = new URL(window.location.href);
        const urlParams = new URLSearchParams(url.searchParams);
        this.mode = urlParams.get('ui')

        const render = this.service("ThreeRenderManager");
        render.doRender = false;
        render.renderer.clear();

        if (this.mode === "teacher") {
            render.doRender = true;
            this.buildScene();
            this.buildHUD();
        }

        if (this.mode === "student") {
            this.buildHUD();
        }

        // this.subscribe("widgetPointer", "focusChanged", this.ttt);

    }

    // ttt(focus) {
    //     if (focus)
    //     console.log(focus.pawn);
    // }

    buildHUD() {
        const ui = this.service("UIManager");
        this.hud = new HUD({parent: ui.root, autoSize: [1,1]});
        // this.box = new BoxWidget({parent: this.hud, color: [1,0,0]})
    }

    buildScene() {
        const render = this.service("ThreeRenderManager");
        render.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        render.renderer.shadowMap.enabled = true;

        this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), render.scene, render.camera );
        this.outlinePass.edgeStrength = 3;
        this.outlinePass.edgeGlow = 1;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.visibleEdgeColor = new THREE.Color(0,1,0);
        render.composer.addPass( this.outlinePass );

        const ambient = new THREE.AmbientLight( new THREE.Color(1,1,1), 0.5 );
        render.scene.add(ambient);

        const sun = new THREE.DirectionalLight(new THREE.Color(1,1,1), 0.8 );
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

        render.scene.add(sun);

        this.pathDebug = new PathDebug();

        this.godView = new Godview(this.model);
    }

    update(time) {
        super.update(time);
        if (this.godView) this.godView.update(time);
    }

    hiliteMesh(mesh) {
        if (mesh) {
            this.outlinePass.selectedObjects = [mesh];
        } else {
            this.outlinePass.selectedObjects = [];
        }
    }

    toggleRender() {
        console.log("toggle");
        const render = this.service("ThreeRenderManager");
        render.doRender = !render.doRender;
        if(!render.doRender) render.renderer.clear();
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