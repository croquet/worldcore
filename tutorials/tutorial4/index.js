// World Core Tutorial 4
//
// Copyright Croquet Corporation, 2021
//
// This is the third in a series of tutorials illustrating how to build a Worldcore app. It
// assumes that you have familarity with the basics of the Croquet SDK, and understand the
// general concepts behind Worldcore. For more inforamation, see croquet.io/sdk.
//

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, q_axisAngle, InputManager, q_multiply,
    UIManager, Widget, JoystickWidget, AM_Avatar, PM_Avatar, q_identity, q_normalize, PlayerManager, AM_Player, PM_Player, PM_ThreeVisible,
    ThreeRenderManager, AM_Spatial, PM_Spatial } from "@croquet/worldcore";

import * as THREE from 'three';

//------------------------------------------------------------------------------------------
//-- MyAvatar ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAvatar extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() {return AvatarPawn}

}
MyAvatar.register('MyAvatar');

//------------------------------------------------------------------------------------------
//-- AvatarPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AvatarPawn extends mix(Pawn).with(PM_Avatar, PM_Player, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: 0x008800 } );
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);

        if (this.isMyPlayerPawn) {
            this.subscribe("hud", "joy", this.joy);
        }
    }

    destroy() {
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
// LevelActor
//------------------------------------------------------------------------------------------

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
}
LevelActor.register('LevelActor');

//------------------------------------------------------------------------------------------
// LevelPawn
//------------------------------------------------------------------------------------------

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.geometry = new THREE.PlaneGeometry(100, 100);
        this.material = new THREE.MeshStandardMaterial( {color: 0x002200 } );
        const floor = new THREE.Mesh( this.geometry, this.material );

        floor.castShadow = true;
        floor.receiveShadow = true;
        floor.rotation.set(-Math.PI/2, 0, 0);
        floor.position.set(0,-0.5, 0);

        const ambient = new THREE.AmbientLight( 0xffffff, 1 );

        const sun = new THREE.DirectionalLight( 0xffffff, 0.85 );
        sun.position.set(10, 10, 10);
        // sun.target.position.set(0, 0, 0);
        sun.castShadow = true;

        const group = new THREE.Group();
        group.add(floor);
        group.add(ambient);
        group.add(sun);

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();

    }
}

//------------------------------------------------------------------------------------------
//-- MyPlayerManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.translation = [0,0, -5];
        return MyAvatar.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static viewRoot() { return MyViewRoot };

    init(...args) {
        super.init(...args);
        console.log("new model!!!");
        this.level = LevelActor.create();
    }

    createServices() {
        this.addService(MyPlayerManager);
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    constructor(model) {
        super(model);

        const HUD = new Widget(this.service("UIManager").root, {autoSize: [1,1]});

        const joy = new JoystickWidget(HUD, {anchor: [1,1], pivot: [1,1], local: [-20,-20], size: [150, 150] });
        joy.onChange = xy => {this.publish("hud", "joy", xy)};

    }

    createServices() {
        this.addService(InputManager);
        this.render = this.addService(ThreeRenderManager);
        this.addService(UIManager);
    }

}

StartWorldcore({appId: 'io.croquet.appId', name: 'tutorial', password: 'password'});

