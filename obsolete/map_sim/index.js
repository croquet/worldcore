// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, m4_identity, m4_rotationX, toRad, m4_scaleRotationTranslation, q_pitch, q_axisAngle, PlaneWidget3, viewRoot, Widget, BoxWidget, WidgetManager2 } from "@croquet/worldcore";

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
import { CityActor, CityManager } from "./src/City";


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
        return [MyUserManager, Paths, CityManager, CaravanManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
        this.map = MapActor.create();
        this.venice = CityActor.create({name: "venice", title: "Venice", sells: "Sells:\nGlass Lenses", buys: "Buys: Silk, Spices", map: [-31.467,-12.153]});
        this.ayas = CityActor.create({name: "ayas", title: "Ayas", sells: "Sells: Fish", buys: "Buys: Salt", map: [-18.153,-7.153]});
        this.tabriz = CityActor.create({name: "tabriz", title: "Tabriz", sells: "Sells: Gems, Salt", buys: "Buys: Glass Lenses", map: [-11.53,-7.59]});
        this.samarkand = CityActor.create({name: "samarkand", title: "Samarkand", sells: "Sells: Wool, Carpets", buys: "Buys: Silver", map: [-1.03,-9.47]});
        this.kashgar = CityActor.create({name: "kashgar", title: "Kashgar", sells: "Sells: Jade", buys: "Buys: Wool", map: [5.73,-9.86]});
        this.dunhuang = CityActor.create({name: "dunhuang", title: "Dunhuang", sells: "Sells: Silk, Jade", buys: "Buys: Glass Lenses, Wool",map: [13.957,-9.4762]});
        this.lanzhou = CityActor.create({name: "lanzhou", title: "Lanzhou", sells: "Sells: Silk, Spices", buys: "Buys: Glass Lenses", map: [22.488,-7.887]});
        this.dadu = CityActor.create({name: "dadu", title: "Dadu", sells: "Sells: Silk", buys: "Buys: Wool", map: [29.575,-9.093]});


        this.paths = this.service("Paths")

        this.paths.addNode("venice", this.venice.node);
        this.paths.addNode("ayas", this.ayas.node);
        this.paths.addNode("tabriz", this.tabriz.node);
        this.paths.addNode("samarkand", this.samarkand.node);
        this.paths.addNode("kashgar", this.kashgar.node);
        this.paths.addNode("dunhuang", this.dunhuang.node);
        this.paths.addNode("lanzhou", this.lanzhou.node);
        this.paths.addNode("dadu", this.dadu.node);

        this.paths.addNode("sea", [ 510 * -25 /70.83, 315 * -6 /43.75 ]);
        this.paths.addNode("persia", [ 510 * -7.4 /70.83, 315 * -6.4 /43.75 ]);
        this.paths.addNode("desert", [ 510 * 10 /70.83, 315 * -8 /43.75 ]);

        // this.paths.addEdge("venice", "ayas", 1);
        this.paths.addEdge("ayas", "tabriz", 1);
        // this.paths.addEdge("tabriz", "samarkand", 1);
        this.paths.addEdge("samarkand", "samarkand", 1);
        this.paths.addEdge("samarkand", "kashgar", 1);
        // this.paths.addEdge("kashgar", "dunhuang", 1);
        this.paths.addEdge("dunhuang", "lanzhou", 1);
        this.paths.addEdge("lanzhou", "dadu", 1);

        this.paths.addEdge("venice", "sea", 1);
        this.paths.addEdge("sea", "ayas", 1);
        this.paths.addEdge("tabriz", "persia", 1);
        this.paths.addEdge("persia", "samarkand", 1);
        this.paths.addEdge("kashgar", "desert", 1);
        this.paths.addEdge("desert", "dunhuang", 1);


        this.subscribe("hud", "newCaravan", this.test);



    }

    test() {


        const names = ["Akbar", "Battuta", "Marco", "Peng", "Jasmine", "Aladdin", "Sinbad"];
        const n = Math.floor(names.length * Math.random())
        const homes = ["venice", "ayas", "tabriz", "samarkand", "dadu"]
        const home = homes[Math.floor(homes.length * Math.random())];

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
        this.mode = "teacher";

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

    }

    buildHUD() {
        const ui = this.service("UIManager");
        this.hud = new HUD({parent: ui.root, autoSize: [1,1]});
    }

    buildScene() {
        const render = this.service("ThreeRenderManager");
        render.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        render.renderer.shadowMap.enabled = true;

        this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), render.scene, render.camera );
        this.outlinePass.edgeStrength = 5;
        this.outlinePass.edgeGlow = 0;
        this.outlinePass.edgeThickness = 2;
        this.outlinePass.visibleEdgeColor = new THREE.Color(0.1,1,0.1);
        this.outlinePass.hiddenEdgeColor = new THREE.Color(0.1,1,0.1);
        render.composer.addPass( this.outlinePass );

        const ambient = new THREE.AmbientLight( new THREE.Color(1,1,1), 0.1 );
        render.scene.add(ambient);

        const sun = new THREE.DirectionalLight(new THREE.Color(1,1,1), 1.2 );
        sun.position.set(100, 100, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 5;
        sun.shadow.camera.far = 1000;

        sun.shadow.camera.top = 200;
        sun.shadow.camera.bottom = -200;
        sun.shadow.camera.left = -200;
        sun.shadow.camera.right = 200;

        render.scene.add(sun);

        // const helper = new THREE.DirectionalLightHelper( sun, 10 );
        // render.scene.add( helper );

        // this.pathDebug = new PathDebug();

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