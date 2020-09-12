// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, Actor, Pawn, mix,
    PM_AudioSource, AM_AudioSource, AM_Avatar, PM_Avatar, ActorManager,
    ThreeRenderManager, PM_ThreeVisible, PawnManager, PlayerManager } from "@croquet/worldcore";
import * as THREE from "three"; // v108

import { OBJLoader } from "./three-108/OBJLoader.js";
import { MTLLoader } from "./three-108/MTLLoader.js";

import {JoinScreen, GameScreen } from  "./src/HUD";
import { WorldActor } from "./src/World";

import football_obj from "./assets/football.obj";
import football_mtl from "./assets/football.mtl";
import photon from "./assets/Photon.mp3";

//------------------------------------------------------------------------------------------
// SoundActor
//------------------------------------------------------------------------------------------

class SoundActor extends mix(Actor).with(AM_Avatar, AM_AudioSource) {
    init() {
        super.init("SoundPawn");
        this.subscribe("input", " Down", this.playPhoton);
        this.subscribe("hud", "sound", this.playPhoton);
        this.setLocation([0,5,0]);
        this.spinMe();
    }

    playPhoton() {
        this.playSound(photon);
        this.changeColor(0xff7777);
        this.future(2000).changeColor(0x7777ff);
    }

    changeColor(color) {
        this.say("change_color", color);
    }

    spinMe() {
        this.setRotation(q_axisAngle([0,1,0], toRad(this.now()/25)));
        this.setLocation([0,3.75,0]);

        this.future(50).spinMe();
    }

}
SoundActor.register('SoundActor');

//------------------------------------------------------------------------------------------
// SoundPawn
//------------------------------------------------------------------------------------------

class SoundPawn extends mix(Pawn).with(PM_Avatar, PM_ThreeVisible, PM_AudioSource) {
    constructor(...args) {
        super(...args);
        this.listen("change_color", this.changeColor);
        const geometry = new THREE.BoxBufferGeometry( 1, 7, 1 );
        const material = new THREE.MeshStandardMaterial( {color: 0x7777ff} );
        this.cube = new THREE.Mesh( geometry, material );
        this.cube.castShadow = true;
        this.cube.receiveShadow = true;
        //cube.position.z = -5;
        this.setRenderObject( this.cube );
    }

    changeColor(color) {
        this.cube.material.color = new THREE.Color( color );
    }

}
SoundPawn.register('SoundPawn');

//------------------------------------------------------------------------------------------
// BallActor
//------------------------------------------------------------------------------------------
class BallActor extends mix(Actor).with(AM_Avatar, AM_AudioSource) {
    init() {
        super.init("BallPawn");
        this.setLocation([0,10,0]);
        this.setScale([2,2,2]);
        this.rollBall();
    }

    rollBall() {
        const d = 2; // imported objects are always scaled to a height of 2
        const zRot = Math.PI * 3 * Math.sin(this.now() * Math.PI * 2 / 10000);
        const xPos = -zRot * d / 2;

        this.setRotation(q_axisAngle([0,0,1], zRot));
        this.setLocation([xPos, 0.65, 4]);
        //this.say("roll_ball");
        this.future(50).rollBall();
    }
}
BallActor.register('BallActor');

//------------------------------------------------------------------------------------------
// BallPawn
//------------------------------------------------------------------------------------------

class BallPawn extends mix(Pawn).with(PM_Avatar, PM_ThreeVisible, PM_AudioSource) {
    constructor(...args) {
        super(...args);

        this.loadFootball(football_obj, football_mtl);
    }

    async loadFootball() {
        const mtlLoader = new MTLLoader();
        const materials = await new Promise( (resolve, reject) => mtlLoader.load(football_mtl, resolve, null, reject) );
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        const obj = await new Promise( (resolve, reject) => objLoader.load(football_obj, resolve, null, reject) );
        obj.position.set(0, 1, 2);
        this.setRenderObject(obj);
    }
}
BallPawn.register('BallPawn');
//------------------------------------------------------------------------------------------
// FlockActor
//------------------------------------------------------------------------------------------
class FlockActor extends mix(Actor).with(AM_Avatar, AM_AudioSource) {
    init() {
        super.init("FlockPawn");
        //this.subscribe("input", " Down", this.startStop);
        //this.subscribe("hud", "sound", this.startStop);
        this.subscribe("input", "fDown", this.startStop);
        this.spinMe();
        this.setLocation([0,10,0]);
        this.setScale([10,10,10]);
        this.initFlock();
        this.isFlocking = true;
    }

    startStop() {
        this.isFlocking = !this.isFlocking;
    }

    initFlock() {
        // these arrays are computed here to ensure they are replicated - same list of triangles.
        const vector = new THREE.Vector4();
        this.instances = 5000;
        this.positions = [];
        this.offsets = [];
        this.colors = [];
        this.orientationsStart = [];
        this.orientationsEnd = [];

        this.positions.push( 0.025, -0.025, 0 );
        this.positions.push( -0.025, 0.025, 0 );
        this.positions.push( 0, 0, 0.025 );

        // instanced attributes

        for ( let i = 0; i < this.instances; i++ ) {

            // offsets

            this.offsets.push( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 );

            // colors

            this.colors.push( Math.random(), Math.random(), Math.random(), Math.random() );

            // orientation start

            vector.set( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
            vector.normalize();

            this.orientationsStart.push( vector.x, vector.y, vector.z, vector.w );

            // orientation end

            vector.set( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
            vector.normalize();

            this.orientationsEnd.push( vector.x, vector.y, vector.z, vector.w );

        }
    }

    spinMe() {
        if (this.isFlocking) {
            this.setRotation(q_axisAngle([0,1,0], toRad(this.now()/100)));
            this.say("flock_time");
        }
        this.future(50).spinMe();
    }

}
FlockActor.register('FlockActor');
//------------------------------------------------------------------------------------------
// FlockPawn
//------------------------------------------------------------------------------------------
class FlockPawn extends mix(Pawn).with(PM_Avatar, PM_ThreeVisible, PM_AudioSource) {
    constructor(...args) {
        super(...args);
        this.listen("flock_time", this.flockMe);
        // geometry
        const actor = this.actor;
        const geometry = new THREE.InstancedBufferGeometry();
        geometry.instanceCount = actor.instances; // set so its initalized for dat.GUI, will be set in first draw otherwise

        // PATCH TO RUN IN THREE REVISION 108
        if (!geometry.setAttribute) geometry.setAttribute = function(name, att) { this.attributes[name] = att; };

        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( actor.positions, 3 ) );

        geometry.setAttribute( 'offset', new THREE.InstancedBufferAttribute( new Float32Array( actor.offsets ), 3 ) );
        geometry.setAttribute( 'color', new THREE.InstancedBufferAttribute( new Float32Array( actor.colors ), 4 ) );
        geometry.setAttribute( 'orientationStart', new THREE.InstancedBufferAttribute( new Float32Array( actor.orientationsStart ), 4 ) );
        geometry.setAttribute( 'orientationEnd', new THREE.InstancedBufferAttribute( new Float32Array( actor.orientationsEnd ), 4 ) );

        geometry.computeBoundingSphere();
        geometry.boundingSphere.radius = 10;
         // material

        const material = new THREE.RawShaderMaterial( {

            uniforms: {
                "time": { value: 1.0 },
                "sineTime": { value: 1.0 }
            },
            vertexShader: this.vertexShader(),
            fragmentShader: this.fragmentShader(),
            side: THREE.DoubleSide,
            transparent: true

        } );

        this.flock = new THREE.Mesh( geometry, material );
        this.flock.castShadow = true;

        this.setRenderObject( this.flock );
    }

    flockMe() {
        if (this.actor.isFlocking) {
            const time = this.now();
            this.flock.material.uniforms[ "time" ].value = time * 0.005;
            this.flock.material.uniforms[ "sineTime" ].value = Math.sin( this.flock.material.uniforms[ "time" ].value * 0.02 );
        }
    }

    vertexShader() {
        return `
        precision highp float;

        uniform float sineTime;

        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        attribute vec3 position;
        attribute vec3 offset;
        attribute vec4 color;
        attribute vec4 orientationStart;
        attribute vec4 orientationEnd;

        varying vec3 vPosition;
        varying vec4 vColor;

        void main() {

            vPosition = offset * max( abs( sineTime * 2.0 + 1.0 ), 0.5 ) + position;
            vec4 orientation = normalize( mix( orientationStart, orientationEnd, sineTime ) );
            vec3 vcV = cross( orientation.xyz, vPosition );
            vPosition = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + vPosition );

            vColor = color;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( vPosition, 1.0 );

        }`;
    }

    fragmentShader() {
        return `
        precision highp float;

        uniform float time;

        varying vec3 vPosition;
        varying vec4 vColor;

        void main() {

            vec4 color = vec4( vColor );
            color.r += sin( vPosition.x * 10.0 + time ) * 0.5;

            gl_FragColor = color;

        }
        `;
    }

}
FlockPawn.register('FlockPawn');
//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init() {
        super.init();

        this.actor = SoundActor.create();
        this.actor.setLocation([0,0,0]);
        this.actor.setRotation(q_axisAngle([1,1,0], toRad(20)));
        this.flock = FlockActor.create();
        this.ball = BallActor.create();
        this.world = WorldActor.create();
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
        // we can setup additional scene/render state here if we like
        this.setScale(this.ui.size);

        this.joinScreen = new JoinScreen(this.ui.root, {autoSize: [1,1]});
        this.gameScreen = new GameScreen(this.ui.root, {autoSize: [1,1], visible: false});

        this.subscribe("hud", "enterGame", this.enterGameScreen);
        this.subscribe("input", "resize", () => this.resizeToWindow());
        this.resizeToWindow();
    }

    resizeToWindow() {
        this.render.camera.aspect = window.innerWidth / window.innerHeight;
        this.render.camera.updateProjectionMatrix();
        this.render.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new ThreeRenderManager());
        this.ui = this.addManager(new UIManager());
        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());
    }

    enterGameScreen() {
        this.joinScreen.hide();
        this.gameScreen.show();
    }

    setScale(xy) {
        const narrow = Math.min(xy[0], xy[1]);
        this.ui.setScale(narrow/800);
    }

}


Session.join(`wc_three_${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: 20});
