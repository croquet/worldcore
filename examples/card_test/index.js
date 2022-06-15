// Card Testbed

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    AM_Player, PM_Player, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, PM_ThreeCamera, toRad, THREE,
    AM_Predictive, PM_Predictive,
    AM_PointerTarget, PM_Pointer, PM_PointerTarget, CardActor, CardPawn,
    q_axisAngle, m4_rotationQ, m4_identity, GetPawn, WidgetActor, WidgetPawn, ImageWidgetPawn, CanvasWidgetPawn, ImageWidgetActor, CanvasWidgetActor,
    TextWidgetActor, ButtonWidgetActor, GetViewService, UIManager, ButtonWidget, TextWidget, Widget, AM_Smoothed, PM_Smoothed, PM_Driver, v3_scale, v3_add, TAU, v3_rotate, toDeg, q_multiply, m4_multiply, m4_scaleRotationTranslation } from "@croquet/worldcore";

import { Widget3, VisibleWidget3, ControlWidget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, TextWidget3, ButtonWidget3, ToggleWidget3, ToggleSet3, SliderWidget3, BoxWidget3, DragWidget3, EditorWidget3 } from "./ThreeWidget";

import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import kwark from "./assets/kwark.otf";


//------------------------------------------------------------------------------------------
//-- MyAvatar ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAvatar extends mix(Actor).with(AM_Smoothed, AM_Player) {

    get pawn() {return AvatarPawn}
    get color() {return this._color || [1,1,1,1]}

}
MyAvatar.register('MyAvatar');

//------------------------------------------------------------------------------------------
//-- AvatarPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_Driver, PM_Player, PM_ThreeVisible, PM_ThreeCamera, PM_WidgetPointer) {
    constructor(...args) {
        super(...args);

        this.fore = this.back = this.left = this.right = this.pitch = this.yaw = 0;
        this.speed = 5;
        this.turnSpeed = 0.002;

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);

        if (this.isMyPlayerPawn) {
            this.subscribe("input", "wDown", () => {this.fore = 1});
            this.subscribe("input", "wUp", () => {this.fore = 0});
            this.subscribe("input", "sDown", () => {this.back = 1});
            this.subscribe("input", "sUp", () => {this.back = 0});

            this.subscribe("input", "ArrowUpDown", () => {this.fore = 1});
            this.subscribe("input", "ArrowUpUp", () => {this.fore = 0});
            this.subscribe("input", "ArrowDownDown", () => {this.back = 1});
            this.subscribe("input", "ArrowDownUp", () => {this.back = 0});

            this.subscribe("input", "aDown", () => {this.left = 1});
            this.subscribe("input", "aUp", () => {this.left = 0});
            this.subscribe("input", "dDown", () => {this.right = 1});
            this.subscribe("input", "dUp", () => {this.right = 0});

            this.subscribe("input", "ArrowLeftDown", () => {this.left = 1});
            this.subscribe("input", "ArrowLeftUp", () => {this.left = 0});
            this.subscribe("input", "ArrowRightDown", () => {this.right = 1});
            this.subscribe("input", "ArrowRightUp", () => {this.right = 0});

            this.subscribe("input", "pointerDown", this.doPointerDown);
            this.subscribe("input", "pointerUp", this.doPointerUp);
            this.subscribe("input", "pointerDelta", this.doPointerDelta);

        }

    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    get velocity() {
        return [ (this.left - this.right), 0,  (this.fore - this.back)];
    }

    update(time, delta) {
        super.update(time,delta);
        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,1,0], this.yaw);
        // const lookQ = q_multiply(pitchQ, yawQ);
        const v = v3_scale(this.velocity, -this.speed * delta/1000)
        const v2 = v3_rotate(v, yawQ);
        const t = v3_add(this.translation, v2)
        this.positionTo(t, yawQ);
    }

    doPointerDown(e) {
        if (e.button === 2) this.service("InputManager").enterPointerLock();;
    }

    doPointerUp(e) {
        if (e.button === 2) this.service("InputManager").exitPointerLock();
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yaw += (-this.turnSpeed * e.xy[0]) % TAU;
            this.pitch += (-this.turnSpeed * e.xy[1]) % TAU;
            this.pitch = Math.max(-Math.PI/2, this.pitch);
            this.pitch = Math.min(Math.PI/2, this.pitch);
        };
    }

    get lookGlobal() {
        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,1,0], this.yaw);
        const lookQ = q_multiply(pitchQ, yawQ);

        const local =  m4_scaleRotationTranslation(this.scale, lookQ, this.translation)
        let global= local;
        if (this.parent && this.parent.global) global = m4_multiply(local, this.parent.global);

        return global;
    }

}




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

// class PercentTextWidget extends TextWidget3 {
//     constructor(options) {
//         super(options);
//         this.text = String(0);
//         // this.subscribe("test", "percent", this.onTest)

//     }

//     onTest(p) {
//         this.text = (p*100).toFixed() + "%";
//     }
// }

class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Widget3) {
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

        this.editor = new EditorWidget3({name: "editor", pawn: this});

        this.panel = new ImageWidget3({name: "panel",parent: this.rootWidget, color: [1,1,1], size: [6,4], translation: [5,2,0], url: llama});

        const ts = new ToggleSet3();
        this.toggle1 = new ToggleWidget3({name: "toggle1", parent: this.panel, toggleSet: ts, size: [1.5, 1], anchor: [0,1], pivot: [0,1], translation: [0.2,-0.2,0]});
        this.toggle2 = new ToggleWidget3({name: "toggle2", parent: this.panel, toggleSet: ts, size: [1.5, 1], anchor: [0,1], pivot: [0,1], translation: [0.2,-1.7,0]});

        this.slider = new SliderWidget3({name: "slider", parent: this.panel, anchor: [1,1], pivot: [1,1], translation: [-0.1,-0.1,0], step: 0, size: [0.2, 3], percent: 1});

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


        this.text = new TextWidget3({name: "canvas", parent: this.rootWidget, translation: [-2,0,0], point: 48, font: "serif", resolution: 300, fgColor: [0,0,1], size: [1,1], text: "Alternate Text String"});

        this.drag = new DragWidget3({name: "drag", parent: this.editor, translation: [-3,2,0]});
    }

    test2() {
        console.log("nTest");
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
//-- MyPlayerManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        options.translation = [0,0,10];
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
        console.log("Start root model!");
        this.level = LevelActor.create();
        this.testActor = TestActor.create({translation: [0,0,-3]});


        this.subscribe("input", "mDown", this.test0);
        // this.subscribe("input", "xDown", this.test1);
        // this.subscribe("input", "cDown", this.test2);
    }

    test0() {
        console.log("mTest");
        // this.testActor.destroy();
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
        return [InputManager, UIManager, ThreeRenderManager, WidgetManager];
    }

    constructor(model) {
        super(model);
        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));


        // const input = this.service("InputManager");
        // const ui = this.service("UIManager");
        // this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});
        // this.button0 = new ButtonWidget({
        //     parent: this.HUD,
        //     local: [20,20],
        //     size: [100,50],
        //     label: new TextWidget({point: 12, text: "MouseLook"}),
        //     onClick: this.onClick
        // });

        // this.subscribe("input", "pointerDelta", this.onPointerDelta);
        // this.subscribe("input", "zDown", this.startMouselook);
        // this.subscribe("input", "zUp", this.stopMouselook);

    }

    // onPointerDelta(e) {
    //     const input = this.service("InputManager");
    //     if (input.inPointerLock) {
    //         console.log(e.xy);
    //     };
    //     // console.log(e.xy);
    // }



    // onClick(e) {
    //     // console.log("click!");
    //     const input = this.service("InputManager");
    //     input.enterPointerLock();
    // }

    // startMouselook() {
    //     console.log("start!");
    //     const input = this.service("InputManager");
    //     input.enterPointerLock();

    // }

    // stopMouselook() {
    //     console.log("stop!");
    //     const input = this.service("InputManager");
    //     input.exitPointerLock();

    // }


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