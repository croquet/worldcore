// World Core Test
//
// Croquet Studios, 2021

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, ActorManager, PawnManager, PlayerManager, Widget, JoystickWidget, ThreeRenderManager, Actor, Pawn, mix,
    AM_Avatar, PM_Avatar, PM_ThreeVisible, AM_Spatial, PM_Spatial, toRad, q_identity, q_multiply, q_axisAngle, q_normalize, v3_normalize,
    AM_Smoothed, PM_Smoothed } from "@croquet/worldcore";
import paper from "./assets/paper.jpg";
import slime_txt from "./assets/slime_texture.png";
import slime_fbx from "./assets/slime_mesh.fbx";

import { FBXLoader } from "./loaders/FBXLoader.js";


import * as THREE from 'three';

const assetManager = new THREE.LoadingManager();

export let slimeTexture;
export let slimeObject;



//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Avatar) {
    init(options) {
        super.init("MovePawn", options);
        this.setTranslation([0,0,-5]);
        const child = ChildActor.create({translation: [0,1.1,0]});
        this.q = q_identity();
        this.spin = 0;
        this.pitch = 0;
        this.addChild(child);
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

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_ThreeVisible) {

    constructor(...args) {
        super(...args);

        console.log("Building move pawn!");

        // let slimeObj = slimeObject.clone(true);
        // slimeObj.castShadow = true;
        // slimeObj.receiveShadow = true;
        // console.log(slimeObj);
        // slimeObj.children[0].material = slimeObject.children[0].material.clone();
        // slimeObj.children[0].material.color = new THREE.Color(0.7,0.5,0.5);


        // const paperTexture = new THREE.TextureLoader().load( paper );

        // paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        // paperTexture.repeat.set(1,3);

        // const color = new THREE.Color(0xbbeecc);
        // const geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
        // const material = new THREE.MeshStandardMaterial( {map: paperTexture, color: color} );
        // this.cube = new THREE.Mesh( geometry, material );
        // this.cube.castShadow = true;
        // this.cube.receiveShadow = true;
        //this.setRenderObject(this.cube);
        this.setRenderObject(slimeObject);
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
        const paperTexture = new THREE.TextureLoader().load( paper );

        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(1,3);

        const color = new THREE.Color(0xbbeecc);
        const geometry = new THREE.BoxBufferGeometry( 0.5, 0.5, 0.5 );
        const material = new THREE.MeshStandardMaterial( {map: paperTexture, color: color} );
        this.cube = new THREE.Mesh( geometry, material );
        this.cube.castShadow = true;
        this.cube.receiveShadow = true;
        this.setRenderObject(this.cube);
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

// class CameraActor extends mix(Actor).with(AM_Spatial) {
//     init(options) {
//         super.init("CameraPawn", options);

//         this.subscribe("input", "dDown", this.test);
//     }

//     test() {
//         this.playSound(photon,0.05);
//     }
// }
// CameraActor.register('CameraActor');

//------------------------------------------------------------------------------------------
// CameraPawn
//------------------------------------------------------------------------------------------

// class CameraPawn extends mix(Pawn).with(PM_Spatial, PM_Camera, PM_Player, PM_AudioListener) {
//     constructor(...args) {
//         super(...args);

//     }


// }
// CameraPawn.register('CameraPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
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

        this.render.loadTextures([slime_txt, paper]).then(value => {
            console.log("success!");
        })

    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new ThreeRenderManager());
        this.ui = this.addManager(new UIManager());
        this.pawnManager = this.addManager(new PawnManager());

    }



}


async function loadSlime() {
    console.log("Start loading slime");
    slimeTexture = new THREE.TextureLoader().load( slime_txt );
    const fbxLoader = new FBXLoader(assetManager);
    const slimeGroup = await new Promise( (resolve, reject) => fbxLoader.load(slime_fbx, resolve, null, reject) );
    slimeObject = slimeGroup.children[0];
    slimeGroup.remove(slimeObject);
    slimeObject.material.map = slimeTexture;
    slimeObject.material.color = new THREE.Color(0.5, 0.1, 0.1);
    slimeObject.castShadow = true;
    slimeObject.receiveShadow = true;


    console.log(slimeTexture);
    console.log(slimeObject);

    console.log("finished loading slime object");

}


async function go() {

    await loadSlime();

    const session = await Session.join({
        appId: 'io.croquet.wctest',
        name: 'test',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 30,
    });
}

go();
