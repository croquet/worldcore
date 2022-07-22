// Microverse Base

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3  } from "@croquet/worldcore";

import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";
import { Avatar } from "./src/Avatar";
import { User, UserManager } from "./src/User";


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

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);

        this.subscribe("input", "bDown", this.test);
        this.subscribe("input", "nDown", this.test2);
        // this.subscribe("input", "mDown", this.test3);
    }

    test() {
        console.log("bTest");
        if (this.ui) return;



        this.ui = new Widget3({parent: this.rootWidget})

        // this.editor = new EditorWidget3({name: "editor", pawn: this, billboard: false});

        this.panel = new ImageWidget3({name: "panel", parent: this.ui, color: [1,1,1], size: [6,4], translation: [5,1,0], url: llama, opacity: 1});

        const ts = new ToggleSet3();
        // this.toggle1 = new ToggleWidget3({name: "toggle1", parent: this.panel, toggleSet: ts, size: [1.5, 1], anchor: [0,1], pivot: [0,1], translation: [0.2,-0.2,0], opacity: 1});
        // this.toggle2 = new ToggleWidget3({name: "toggle2", parent: this.panel, toggleSet: ts, size: [1.5, 1], anchor: [0,1], pivot: [0,1], translation: [0.2,-1.7,0], opacity: 1});

        this.slider = new SliderWidget3({name: "slider", parent: this.panel, anchor: [1,1], pivot: [1,1], translation: [-0.1,-0.1,0], step: 0, size: [0.2, 3], percent: 1, opacity: 1});

        this.pt = new TextWidget3({
            parent: this.panel,
            translation: [-0.5, -0.1, 0],
            point: 96,
            text: "100%",
            font: "sans-serif",
            size: [1,1],
            anchor: [1,1],
            pivot: [1,1]
        });

        this.pt.subscribe(this.slider.id, "percent", p => {
            this.pt.text = (p*100).toFixed() + "%";
        });


        this.text = new TextWidget3({name: "canvas", parent: this.ui, translation: [-2,0.5,0], point: 48, font: "sans-serif", resolution: 300, size: [1,1.5], text: "Alpha\nBeta\nGamma", billboard: false, noWrap: true, fgColor: [0,0,0], bgColor: [1,1,1], alpha: false});

        // this.textField = new TextFieldWidget3({name: "textField", parent: this.panel, anchor: [0,0], pivot: [0,0],  translation: [0.1,0.1,0], point: 48, size: [3,1.5], text: "12345"});

        this.menu= new MenuWidget3({
            name: "menu",
            parent: this.panel,
            size: [2, 0.5],
            anchor: [0,0],
            pivot: [0,0],
            translation: [1,1,0],
            list: ["Alpha", "Beta", "Gamma", "Delta"]
            // list: ["Alpha"]
        });

        // this.menu2= new MenuWidget3({
        //     name: "menu2",
        //     parent: this.panel,
        //     size: [2, 0.5],
        //     anchor: [1,0],
        //     pivot: [1,0],
        //     translation: [-1,1,0],
        //     list: ["Alpha", "Beta", "Gamma", "Delta"]
        //     // list: ["Alpha"]
        // });

        // console.log(this.menu.list);


        this.billboard = new ImageWidget3({name: "billboard", parent: this.ui, color: [1,1,1], size: [1,1], translation: [-2, 0,-2], url: diana, billboard: true, opacity: 0.8});

        // this.drag = new DragWidget3({name: "drag", parent: this.editor, translation: [-3,2,0]});
        // this.spin = new SpinWidget3({name: "spin", parent: this.editor, translation: [-3,2,0]});
    }

    test2() {
        console.log("nTest");
        this.text.size = [1,4]; // Distorted text!
    }

    test3() {
        console.log("mTest");

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

        this.floorGeometry = new THREE.PlaneGeometry(60, 60);
        this.floorMaterial = new THREE.MeshStandardMaterial( {color: 0x145A32 } );
        const floor = new THREE.Mesh( this.floorGeometry, this.floorMaterial );
        floor.rotation.set(-Math.PI/2, 0, 0);
        floor.position.set(0,-0.5, 0);
        group.add(floor);

        this.pillarGeometry = new THREE.BoxGeometry( 1, 5, 1 );
        this.pillarMaterial = new THREE.MeshStandardMaterial( {color: 0x784212 } );
        const pillar0 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        group.add(pillar0);
        pillar0.position.set(29.5, 2, -29.5);
        const pillar1 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        pillar1.position.set(-29.5, 2, -29.5);
        group.add(pillar1);
        const pillar2 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        pillar2.position.set(29.5, 2, 29.5);
        group.add(pillar2);
        const pillar3 = new THREE.Mesh( this.pillarGeometry, this.pillarMaterial );
        pillar3.position.set(-29.5, 2, 29.5);
        group.add(pillar3);

        const ambient = new THREE.AmbientLight( 0xffffff, 0.5 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.5 );
        sun.position.set(1000, 1000, 1000);
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
        this.testAvatar = Avatar.create({name: "Avatar", driver: this, translation: [0,0,10]})
    }

    destroy() {
        super.destroy();
        if (this.testAvatar) this.testAvatar.destroy();
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
        console.log("Start root model!!!");
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
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));


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