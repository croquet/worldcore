// World Core Test
//
// Croquet Studios, 2021

import { Session, ModelRoot, ViewRoot, q_axisAngle, toRad, m4_scaleRotationTranslation, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed,  CachedObject, q_multiply, q_normalize, q_identity,  AM_Spatial, PM_Spatial, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, v3_normalize, StartWorldcore } from "@croquet/worldcore-kernel";
import { UIManager, Widget, JoystickWidget, ButtonWidget, ImageWidget, TextWidget, SliderWidget } from "@croquet/worldcore-widget";
import { ThreeRenderManager, PM_ThreeVisible, THREE } from "@croquet/worldcore-three";
import GLTFLoader from "three-gltf-loader";


//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() {return MovePawn}

    init(options = {}) {
        super.init(options);
    }

}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_ThreeVisible, PM_Player) {
    constructor(...args) {
        super(...args);
        if (this.isMyPlayerPawn) this.subscribe("hud", "joy", this.joy);

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.5, 0.5, 0.5)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);

    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }


    joy(xy) {
        const spin = xy[0];
        const pitch = xy[1];
        let q = q_multiply(q_identity(), q_axisAngle([0,1,0], spin * 0.005));
        q = q_multiply(q, q_axisAngle([1,0,0], pitch * 0.005));
        q = q_normalize(q);
        this.setSpin(q);
    }
}


//------------------------------------------------------------------------------------------
// ChildActor
//------------------------------------------------------------------------------------------

// class SpinBehavior extends Behavior {
//     do(delta) {
//         const axis = v3_normalize([2,1,3]);
//         let q = this.actor.rotation;
//         q = q_multiply(q, q_axisAngle(axis, 0.13 * delta / 50));
//         q = q_normalize(q);
//         this.actor.rotateTo(q);
//     }
// }
// SpinBehavior.register("SpinBehavior");

// class ChildActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral, AM_AudioSource ) {

//     get pawn() {return ChildPawn}

//     init(options) {
//         super.init(options);
//         this.startBehavior(SpinBehavior);
//         this.subscribe("input", "dDown", this.test);
//     }

//     test() {
//         console.log("test!");
//         this.playSound(photon);
//     }

// }
// ChildActor.register('ChildActor');


//------------------------------------------------------------------------------------------
// ChildPawn
//------------------------------------------------------------------------------------------

// class ChildPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible, PM_AudioSource) {
//     constructor(...args) {
//         super(...args);
//         this.setDrawCall(this.buildDraw());
//     }

//     buildDraw() {
//         const mesh = this.buildMesh();
//         const material = CachedObject("paperMaterial", this.buildMaterial);
//         const draw = new DrawCall(mesh, material);
//         return draw;
//     }

//     buildMesh() {
//         const mesh = Cylinder(0.4, 0.75, 16, [1,1,1,1]);
//         mesh.load();
//         mesh.clear();
//         return mesh;
//     }

//     buildMaterial() {
//         const material = new Material();
//         material.texture.loadFromURL(paper);
//         return material;
//     }

// }

//------------------------------------------------------------------------------------------
// BackgroundActor
//------------------------------------------------------------------------------------------

class BackgroundActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return BackgroundPawn}

    init(...args) {
        super.init(...args);
    }


}
BackgroundActor.register('BackgroundActor');

//------------------------------------------------------------------------------------------
// BackgroundPawn
//------------------------------------------------------------------------------------------

class BackgroundPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 0.85 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.85 );
        sun.position.set(1000, 1000, 1000);
        group.add(sun);

        this.setRenderObject(group);
    }
}

//------------------------------------------------------------------------------------------
// MyPlayerManager
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.translation = [0,0,-5];
        return MoveActor.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [ MyPlayerManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start Model!!!");
        BackgroundActor.create();
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [ InputManager, ThreeRenderManager, UIManager];
    }

    constructor(model) {
        super(model);

        console.log("before loader");

        console.log(GLTFLoader);
        // const loader = new GLTFLoader();

        console.log("after loader");


        const three = this.service("ThreeRenderManager");
        three.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const ui = this.service("UIManager");
        this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});
        this.joy = new JoystickWidget({parent: this.HUD, anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [200, 200], onChange: xy => {this.publish("hud", "joy", xy)}});

        this.button0 = new ButtonWidget({
            parent: this.HUD,
            local: [20,20],
            size: [200,80],
            label: new TextWidget({text: "Test 0", style: "italic"}),
            onClick: () => { this.joy.set({scale: 2})}
        });

        this.button1 = new ButtonWidget({
            parent: this.HUD,
            local: [20,110],
            size: [200,80],
            label: new TextWidget({text: "Test 1", style: "oblique"}),
            onClick: () => { this.joy.set({scale: 1})}
        });

        this.slider = new SliderWidget({
            parent: this.HUD,
            anchor: [1,0],
            pivot: [1,0],
            local: [-20,20],
            size: [20, 300],
            onChange: p => {console.log(p)}
        })

        // this.image = new ImageWidget({parent: this.HUD, local: [20, 200], size: [200,80], url: llama});

    }

}

StartWorldcore({
    appId: 'io.croquet.wctest',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: 'test',
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 15,
})





