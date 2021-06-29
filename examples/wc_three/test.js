// World Core Test
//
// Croquet Studios, 2021

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, InputManager, UIManager, Widget, JoystickWidget, ThreeRenderManager, Actor, Pawn, mix,
    PM_ThreeVisible, AM_Spatial, PM_Spatial, toRad, q_identity, q_multiply, q_axisAngle, q_normalize, v3_normalize,
    AM_Smoothed, PM_Smoothed, PM_ThreeCamera, PM_Player, AM_Player } from "@croquet/worldcore";
import slimeTexture from "./assets/slime_texture.png";
import slimeModel from "./assets/slime_mesh.fbx";
import * as THREE from 'three';


//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return MovePawn}
    init(options) {
        super.init(options);
        this.set({translation:[0,0,-5]});
        const child = ChildActor.create({parent: this, translation: [0,1.1,0]});
        this.q = q_identity();
        this.spin = 0;
        this.pitch = 0;
        this.future(50).tick();
        this.subscribe("hud", "joy", this.joy);
    }

    tick() {
        this.q = q_multiply(this.q, q_axisAngle([0,1,0], this.spin * 0.15));
        this.q = q_multiply(this.q, q_axisAngle([1,0,0], this.pitch * 0.15));
        this.q = q_normalize(this.q);
        this.rotateTo(this.q);
        this.future(50).tick();
    }

    joy(xy) {
        this.spin = xy[0];
        this.pitch = xy[1];
    }


}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

class MovePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(...args) {
        super(...args);

        let texture;
        let model;

        this.loadTexture(slimeTexture).then(t => {
            texture = t;
            return this.loadFBXModel(slimeModel);
        }).then(m => {
            model = m;

            model.children[0].material.map = texture;
            model.children[0].material.color = new THREE.Color(0.5, 0.1, 0.1);
            model.children[0].castShadow = true;
            model.children[0].receiveShadow = true;
            this.setRenderObject(model);
        }).catch( () => console.error("Slime not loaded!") );

    }

}


// ------------------------------------------------------------------------------------------
// ChildActor
// ------------------------------------------------------------------------------------------

class ChildActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return ChildPawn}
    init(options) {
        super.init(options);
        this.q = q_identity();
        this.future(50).tick();
        this.subscribe("input", "dDown", this.destroy);
    }

    tick() {
        const axis = v3_normalize([2,1,3]);
        this.q = q_multiply(this.q, q_axisAngle(axis, 0.13));
        this.q = q_normalize(this.q);
        this.rotateTo(this.q);
        this.future(50).tick();
    }

}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
// ChildPawn
//------------------------------------------------------------------------------------------

class ChildPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        let texture;
        let model;

        this.loadTexture(slimeTexture).then(t => {
            texture = t;
            return this.loadFBXModel(slimeModel);
        }).then(m => {
            model = m;
            model.children[0].scale.set( 0.5, 0.5, 0.5);
            model.children[0].material.map = texture;
            model.children[0].material.color = new THREE.Color(0.5, 0.5, 0.1);
            model.children[0].castShadow = true;
            model.children[0].receiveShadow = true;
            this.setRenderObject(model);
        }).catch( () => console.error("Slime not loaded!") );

    }

}

//------------------------------------------------------------------------------------------
// LevelActor
//------------------------------------------------------------------------------------------

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
    init(options) {
        super.init(options);
    }
}
LevelActor.register('LevelActor');

//------------------------------------------------------------------------------------------
// LevelPawn
//------------------------------------------------------------------------------------------

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 1 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.85 );
        sun.position.set(0, 10, 0);
        sun.target.position.set(0, 0, 0);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;

        group.add(sun);
        group.add(sun.target);

        this.setRenderObject(group);
    }
}

//------------------------------------------------------------------------------------------
// CameraActor
//------------------------------------------------------------------------------------------

class CameraActor extends mix(Actor).with(AM_Spatial, AM_Player) {
    get pawn() {return CameraPawn}
    init(options) {
        super.init(options);
    }
}
CameraActor.register('CameraActor');

//------------------------------------------------------------------------------------------
// CameraPawn
//------------------------------------------------------------------------------------------

class CameraPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeCamera, PM_Player) {
}

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting model ...");
        LevelActor.create();
        MoveActor.create({pitch: toRad(0), yaw: toRad(0)});
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.HUD = new Widget(this.ui.root, {autoSize: [1,1]});
        this.joy = new JoystickWidget(this.HUD, {anchor: [1,1], pivot: [1,1], local: [-20,-20], size:[200,200]});
        this.joy.onChange = xy => { this.publish("hud", "joy", xy); };
    }

    createServices() {
        this.webInput = this.addService(InputManager);
        this.render = this.addService(ThreeRenderManager);
        this.ui = this.addService(UIManager);
        super.createServices();
    }

}

async function go() {

    const session = await Session.join({
        appId: 'io.croquet.wctest',
        name: 'test',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 30,
    });
}

go();
