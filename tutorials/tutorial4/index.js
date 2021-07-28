// World Core Tutorial 4
//
// Copyright Croquet Corporation, 2021
//
// This is the third in a series of tutorials illustrating how to build a Worldcore app. It
// assumes that you have familarity with the basics of the Croquet SDK, and understand the
// general concepts behind Worldcore. For more inforamation, see croquet.io/sdk.
//

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, PM_Visible, RenderManager, DrawCall, Cube, q_axisAngle, InputManager, q_multiply,
    UIManager, Widget, JoystickWidget, AM_Avatar, PM_Avatar, q_identity, q_normalize, PlayerManager, AM_Player, PM_Player, PM_ThreeVisible,
    ThreeRenderManager } from "@croquet/worldcore";

import slimeTexture from "./assets/slime_texture.png";
import slimeModel from "./assets/slime_mesh.fbx";
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

        if (this.isMyPlayerPawn) {
            this.subscribe("hud", "joy", this.joy);
        }
    }

    destroy() {
        super.destroy();
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
//-- MyPlayerManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        options.translation = [0,0,-4];
        return MyAvatar.create(options);
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static viewRoot() { return MyViewRoot };

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
        this.addService(ThreeRenderManager);
        this.addService(UIManager);
    }

}

StartWorldcore({appId: 'io.croquet.appId', name: 'tutorial', password: 'password'});

