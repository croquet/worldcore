// Card Testbed

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    AM_Player, PM_Player, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, PM_ThreeCamera, toRad, THREE,
    AM_Predictive, PM_Predictive,
    AM_PointerTarget, PM_Pointer, PM_PointerTarget, CardActor, CardPawn,
    q_axisAngle, m4_rotationQ, m4_identity, GetPawn, WidgetActor, WidgetPawn, ImageWidgetPawn, CanvasWidgetPawn, ImageWidgetActor, CanvasWidgetActor,
    TextWidgetActor, ButtonWidgetActor, GetViewService } from "@croquet/worldcore";

import { Widget3, VisibleWidget3, ControlWidget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, TextWidget3 } from "./ThreeWidget";

import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";


//------------------------------------------------------------------------------------------
//-- MyAvatar ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAvatar extends mix(Actor).with(AM_Predictive, AM_Player) {

    get pawn() {return AvatarPawn}
    get color() {return this._color || [1,1,1,1]}

}
MyAvatar.register('MyAvatar');

//------------------------------------------------------------------------------------------
//-- AvatarPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatarPawn extends mix(Pawn).with(PM_Predictive, PM_Player, PM_ThreeVisible, PM_ThreeCamera, PM_WidgetPointer) {
    constructor(...args) {
        super(...args);

        this.fore = this.back = this.left = this.right = 0;
        this.ccw = this.cw = 0;

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);

        if (this.isMyPlayerPawn) {
            this.subscribe("input", "wDown", () => {this.fore = 1; this.changeVelocity()});
            this.subscribe("input", "wUp", () => {this.fore = 0; this.changeVelocity()});
            this.subscribe("input", "sDown", () => {this.back = 1; this.changeVelocity()});
            this.subscribe("input", "sUp", () => {this.back = 0; this.changeVelocity()});
            this.subscribe("input", "qDown", () => {this.left = 1; this.changeVelocity()});
            this.subscribe("input", "qUp", () => {this.left = 0; this.changeVelocity()});
            this.subscribe("input", "eDown", () => {this.right = 1; this.changeVelocity()});
            this.subscribe("input", "eUp", () => {this.right = 0; this.changeVelocity()});

            this.subscribe("input", "aDown", () => {this.ccw = 1; this.changeSpin()});
            this.subscribe("input", "aUp", () => {this.ccw = 0; this.changeSpin()});
            this.subscribe("input", "dDown", () => {this.cw = 1; this.changeSpin()});
            this.subscribe("input", "dUp", () => {this.cw = 0; this.changeSpin()});

            // this.subscribe("input", "pointerDown", this.doPointerDown);

        }

    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    changeVelocity() {
        const velocity = [ -0.01 * (this.left - this.right), 0,  -0.01 * (this.fore - this.back)]
        this.setVelocity(velocity);
    }

    changeSpin() {
        const spin = q_axisAngle([0,1,0], 0.001 * (this.ccw - this.cw) )
        this.setSpin(spin);
    }

}


//------------------------------------------------------------------------------------------
//-- TestActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Predictive) {
    get pawn() {return TestPawn}

}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- TestPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestPawn extends mix(Pawn).with(PM_Predictive, PM_ThreeVisible, PM_Widget3) {
    constructor(...args) {
        super(...args);
        console.log("test pawn constructor");

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);

        this.subscribe("input", "bDown", this.test);
        this.subscribe("input", "nDown", this.test2);
        this.subscribe("input", "mDown", this.test3);
    }

    test() {
        console.log("bTest");
        this.child0 = new ImageWidget3({name: "child0",parent: this.rootWidget, color: [1,1,1], size: [2,1], translation: [2,0,0], url: llama});
        this.child1 = new ControlWidget3({name: "child1",parent: this.child0, color: [1,0,0], size: [0.5, 0.5], anchor: [0,0], pivot: [0,0]});
        this.child2 = new ControlWidget3({name: "child2", parent: this.child1, color: [0,0,1], size: [0.2, 0.2], autoSize: [1,1], border: [0.1,0.1,0.1,0.1]});

        this.text = new TextWidget3({name: "canvas", parent: this.rootWidget, translation: [-2,0,0], point: 48, font: "serif", resolution: 300, fgColor: [0,0,1],
            text: "Alternate Text String"});

    }

    test2() {
        console.log("nTest");
        this.child2.visible = false;
    }

    test3() {
        console.log("mTest");
        this.child2.visible = true;
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
//-- MyPlayerManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        options.translation = [0,0,5];
        return MyAvatar.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyPlayerManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
        this.level = LevelActor.create();
        this.testActor = TestActor.create({translation: [0,0,-3]});
        // // this.widget = MyWidgetActor.create({translation: [0,0,-3]});
        // this.widget0 = ImageWidgetActor.create({translation: [0,0,-3], color: [1,1,1], size: [2,1], url: llama});
        // this.widget1 = ImageWidgetActor.create({parent: this.widget0, translation: [0.0,0.0,0], border: [0.1, 0.1, 0.1 ,0.1], color: [1,1,1], size: [0.5,0.5], url: diana , anchor: [-1,1], pivot: [-1,1], autoSize: [0,0]});
        // // this.widget2 = TextWidgetActor.create({parent: this.widget1, translation: [0,0,0], color: [1,1,1],autoSize:[1,1], size: [0.3,0.3], anchor: [0,0], pivot: [0,0],
        // //     text:"This is a test of word wrap. It has a lot of text. And it should run onto the next line. You can have as much text as you want and it automatically reformats itself if the widget parameters change!", alignX: "center", alignY: "middle", font: "Trebuchet MS"});

        // this.button = ButtonWidgetActor.create({parent: this.widget0, size: [0.5,0.5]})

        this.subscribe("input", "zDown", this.test0);
        this.subscribe("input", "xDown", this.test1);
        this.subscribe("input", "cDown", this.test2);
    }

    test0() {
        console.log("test0");
        this.testActor.set({translation: [-1,0,-3]});
    }

    test1() {
        console.log("test1");
        // this.testActor.set({translation: [0,0,-3]});
        this.testActor.translateTo([0,0,-3]);
    }

    test2() {
        console.log("test2");
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, WidgetManager];
    }

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));


        // const widget0 = new VisibleWidget3({color: [0,1,1]});
        // const widget1 = new Widget3({parent: widget0});
        // const widget2 = new Widget3({parent: widget0});

        // console.log(widget0.children);
        // console.log(widget1);
        // console.log(widget2);

        // this.subscribe("input", "bDown", this.test);

        const xxx = {visible: true};
        console.log(xxx.visible);
        console.log(xxx.visible === undefined || xxx.visible);
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