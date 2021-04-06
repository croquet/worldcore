// World Core Test
//
// Croquet Studios, 2021

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, InputManager, UIManager, ActorManager, PawnManager, PlayerManager, Widget, JoystickWidget, ThreeRenderManager, Actor, Pawn, mix,
    AM_Avatar, PM_Avatar, PM_ThreeVisible, AM_Spatial, PM_Spatial, toRad, q_identity, q_multiply, q_axisAngle, q_normalize, v3_normalize,
    AM_Smoothed, PM_Smoothed, GetNamedView, PM_ThreeCamera, PM_Player, AM_Player } from "@croquet/worldcore";
import paper from "./assets/paper.jpg";
import slimeTexture from "./assets/slime_texture.png";
import slimeModel from "./assets/slime_mesh.fbx";



import * as THREE from 'three';

// const assetManager = new THREE.LoadingManager();





//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Smoothed) {
    init(options) {
        super.init("MovePawn", options);
        this.setTranslation([0,0,-5]);
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
MovePawn.register('MovePawn');


// ------------------------------------------------------------------------------------------
// ChildActor
// ------------------------------------------------------------------------------------------

class ChildActor extends mix(Actor).with(AM_Smoothed) {
    init(options) {
        super.init("ChildPawn", options);
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
ChildPawn.register('ChildPawn');

//------------------------------------------------------------------------------------------
// LevelActor
//------------------------------------------------------------------------------------------

class LevelActor extends mix(Actor).with(AM_Spatial) {
    init(options) {
        super.init("LevelPawn", options);
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
LevelPawn.register('LevelPawn');

//------------------------------------------------------------------------------------------
// CameraActor
//------------------------------------------------------------------------------------------

class CameraActor extends mix(Actor).with(AM_Spatial, AM_Player) {
    init(options) {
        super.init("CameraPawn", options);
    }
}
CameraActor.register('CameraActor');

//------------------------------------------------------------------------------------------
// CameraPawn
//------------------------------------------------------------------------------------------

class CameraPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeCamera, PM_Player) {
}
CameraPawn.register('CameraPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting model ...");
        this.level = LevelActor.create();
        this.move = MoveActor.create({pitch: toRad(0), yaw: toRad(0)});
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.actorManager = this.addManager(ActorManager.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.ui.setScale(1);

        this.HUD = new Widget(this.ui.root, {autoSize: [1,1]});
        this.joy = new JoystickWidget(this.HUD, {local: [50,50], size:[300,300]});
        this.joy.onChange = xy => { this.publish("hud", "joy", xy); };

    }

    createManagers() {
        this.webInput = this.addManager(new InputManager());
        this.render = this.addManager(new ThreeRenderManager());
        this.ui = this.addManager(new UIManager());
        this.pawnManager = this.addManager(new PawnManager());

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
