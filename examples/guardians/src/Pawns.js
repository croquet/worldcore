// Guardian Pawns
// Copyright (c) 2023 CROQUET CORPORATION
//
// Demonstrates terrain following, avatar/object and avatar/avatar collisions.
// Uses a 2D Perlin noise function to generate terrain and to dynamically compute
// the height of the terrain as the avatar moves.
//
// To do:
// - add sound
// - start game button also shoots
// - add demo mode, where game automatically restarts
// - muzzle flash
// - should tanks lay down track?
// - red missiles vs red eyed bots
// - add weenies
// - joystick is not very responsive
// - add compass to joystick
// - power up or roles - time gated, new one replaces old one
// -- force field - freeze bots
// -- triple shot
// -- armor piercing
// -- add power to tower
// -- mine layer
// -- Artillery cannon

import { ViewRoot, ViewService, HUD, Pawn, mix, InputManager, ThreeInstanceManager,
    PM_ThreeVisible, ThreeRenderManager, ThreeRaycast, PM_Smoothed, PM_Spatial, PM_ThreeInstanced,
    THREE, toRad, m4_translation, m4_getTranslation,
    PerlinNoise, GLTFLoader } from "@croquet/worldcore";
import { HUDWidget } from "./BotHUD";

import paper from "../assets/paper.jpg";
// Illustration 112505376 / 360 Sky © Planetfelicity | Dreamstime.com
import sky from "../assets/alienSky1.jpg";

import n_0 from "../assets/numbers/0.glb";
import n_1 from "../assets/numbers/1.glb";
import n_2 from "../assets/numbers/2.glb";
import n_3 from "../assets/numbers/3.glb";
import n_4 from "../assets/numbers/4.glb";
import n_5 from "../assets/numbers/5.glb";
import n_6 from "../assets/numbers/6.glb";
import n_7 from "../assets/numbers/7.glb";
import n_8 from "../assets/numbers/8.glb";
import n_9 from "../assets/numbers/9.glb";

import center_tower from "../assets/centertower.glb";
import skyscraper_1 from "../assets/Skyscraper1.glb";
import skyscraper_2 from "../assets/Skyscraper2.glb";
import skyscraper_3 from "../assets/Skyscraper3.glb";
import skyscraper_4 from "../assets/Skyscraper6.glb";
import power_tower from "../assets/tower.glb";

import bollard_ from "../assets/bollard.glb";

import tank_tracks from "../assets/tank_tracks.glb";
import tank_turret from "../assets/tank_turret.glb";
import tank_body from "../assets/tank_body.glb";

import fireballTexture from "../assets/explosion.png";
import * as fireballFragmentShader from "../assets/fireball.frag.js";
import * as fireballVertexShader from "../assets/fireball.vert.js";

const numbers = [];
const skyscrapers = [];

export const UserColors = [
    rgb(64, 206, 64),          // green
    rgb(255, 64, 64),        // Red
    rgb(64, 64, 255),         // Blue
    rgb(255, 178, 122),        // Orange
    rgb(255, 64, 255),        // Purple
    rgb(255, 240, 111),        // Yellow

    rgb(125, 206, 160),        // Green
    rgb(210, 57, 43),        // Red
    rgb(40, 116, 166),        // Blue
    rgb(175, 96, 26),        // Orange
    rgb(118, 68, 138),        // Purple
    rgb(183, 149, 11),        // Yellow

    rgb(39, 174, 96),        // Green
    rgb(217, 136, 128),        // Red
    rgb(52, 152, 219),        // Blue
    rgb(230, 126, 34),        // Orange
    rgb(155, 89, 182),         // Purple
    rgb(241, 196, 15),        // Yellow

    rgb(30, 132, 73),        // Green
    rgb(242, 215, 213),        // Red
    rgb(133, 193, 233),         // Blue
    rgb(240, 178, 122),        // Orange
    rgb(195, 155, 211),        // Purple
    rgb(247, 220, 111),        // Yellow
];

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
}

// construct a perlin object and return a function that uses it
export const perlin2D = function(perlinHeight = 27.5, perlinScale = 0.02) {
    // the PerlinNoise constructor can take a seed value as an argument
    // this must be the same for all participants so it generates the same terrain.
    const perlin = new PerlinNoise();

    return function(x,y) {
        //return 0; // used for testing
        return perlinHeight * perlin.signedNoise2D(perlinScale*(x-176+96), perlinScale*(y+176+68));
    };
}();

export const sunBase = [50, 100, 10];
export const sunLight =  function() {
    const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
    sun.position.set(...sunBase);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far =400;
    sun.shadow.camera.left = -400;
    sun.shadow.camera.right = 400;
    sun.shadow.camera.top = 400;
    sun.shadow.camera.bottom = -200;
    sun.shadow.bias = -0.0002;
    sun.shadow.radius = 1.5;
    sun.shadow.blurSamples = 4;
    return sun;
}();

let fireCount = 0;
let lastFireTime = 0;
const fireMaterial =[];
for (let i=0; i<10; i++) fireMaterial[i] = function makeFireMaterial() {
    const texture = new THREE.TextureLoader().load(fireballTexture)
    return new THREE.ShaderMaterial( {
        uniforms: {
        tExplosion: {
            type: "t",
            value: texture
        },
        time: {
            type: "f",
            value: 0.0
        },
        tOpacity: {
            type: "f",
            value: 1.0
        }
        },
        vertexShader: fireballVertexShader.vertexShader(),
        fragmentShader: fireballFragmentShader.fragmentShader()
    } );
}();

//------------------------------------------------------------------------------------------
// BotPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class BotPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        const t = this.translation;
        t[1]=perlin2D(t[0], t[2])+2;
        this.set({translation:t});
        this.useInstance("botBody");
    }

    destroy() {
        this.releaseInstance();
        super.destroy();
    }

    update(time, delta) {
        super.update(time,delta);
        const p = perlin2D(this.translation[0], this.translation[2])+2;
        this._translation[1] = p;
        this.localChanged();
        this.refreshDrawTransform();
        this.refreshChildDrawTransform();
    }
}

BotPawn.register("BotPawn");

//------------------------------------------------------------------------------------------
// BotEyePawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class BotEyePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("botEye");
    }

    destroy() {
        this.releaseInstance();
        super.destroy();
    }
}

BotEyePawn.register("BotEyePawn");

//------------------------------------------------------------------------------------------
// FireballPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class FireballPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.startTime = this.now();
        if (actor._onTarget) {
            if (this.startTime - lastFireTime < 50) return;
            lastFireTime = this.startTime;
        }
        this.material = fireMaterial[fireCount];
        fireCount++;
        if ( fireCount>=10 ) fireCount = 0;
        this.geometry = new THREE.IcosahedronGeometry( 10, 20 );
        this.fireball = new THREE.Mesh(this.geometry, this.material);
        this.pointLight = new THREE.PointLight(0xff8844, 1, 4, 2);
        this.fireball.add(this.pointLight);
        this.setRenderObject(this.fireball);
    }

    update(time, delta) {
        super.update(time,delta);
        const p = perlin2D(this.translation[0], this.translation[2])+2;
        this._translation[1] = p;
        this.localChanged();
        this.refreshDrawTransform();
        if (this.fireball) {
            let t=time-this.startTime;
            this.fireball.material.uniforms[ 'time' ].value = time*this.actor.timeScale;
            this.fireball.material.uniforms[ 'tOpacity' ].value = 0.25;
            this.pointLight.intensity = 0.25+ 0.75* Math.sin(t*0.020)*Math.cos(t*0.007);
        }
    }

    destroy() {
        super.destroy();
        if (this.geometry) this.geometry.dispose();
        //this.material.dispose();
        if (this.pointLight) this.pointLight.dispose();
    }
}
FireballPawn.register("FireballPawn");

//------------------------------------------------------------------------------------------
// GeometryPawn
// 3D models are loaded async, so may not yet exist when your avatar is being constructed.
// We check to see if there is an instance for this yet, and try again later if not.
//------------------------------------------------------------------------------------------
export class GeometryPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.paperTexture = new THREE.TextureLoader().load( paper );
        this.paperTexture.wrapS = THREE.RepeatWrapping;
        this.paperTexture.wrapT = THREE.RepeatWrapping;
        this.paperTexture.repeat.set( 1, 1 );
        this.loadGeometry(actor._instanceName, UserColors[actor.userColor]);
    }

    loadGeometry(name, color) {
        const im = this.service("ThreeInstanceManager");
        const geometry = im.geometry(name);
        if (geometry) {
            this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...color), metalness:0.25, roughness:0.5, map:this.paperTexture} );
            this.mesh = new THREE.Mesh( geometry, this.material );
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            this.setRenderObject(this.mesh);
        } else this.future(100).loadGeometry(name, color);
    }
}

GeometryPawn.register("GeometryPawn");

//------------------------------------------------------------------------------------------
// TowerPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class TowerPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.radius = actor._radius;
        this.index = actor._index;
        this.height = actor.translation[1];
        console.log("XXXXX", this.height, actor.rotation, actor.translation)
        if (this.radius) this.service("CollisionManager").colliders.add(this);
        //if (this.index<0) this.index=6;
        if (this.index>=0) this.future(100).setup();
    }

    setup() {
        const tower = skyscrapers[this.index];
        if (tower) {
            const t = tower.clone(true);
            t.traverseVisible( m => { m.castShadow=true; m.receiveShadow=true; } );
            this.setRenderObject( t );
            const translation = this.translation;
            this.localTransform = m4_translation([0,this.height+perlin2D(translation[0], translation[2])-0.25,0]);
            this.refreshDrawTransform();
        } else this.future(100).setup();
    }

    destroy() {
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
    }

}
TowerPawn.register("TowerPawn");

//------------------------------------------------------------------------------------------
// InstancePawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class InstancePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        if (actor._viewObstacle) this.service("CollisionManager").colliders.add(this);
        this.future(100).setup();
    }

    setup() {
        this.instance = this.useInstance(this.actor._instanceName);
        if (this.instance) {
            if (this.actor._perlin) {
                const t = m4_getTranslation(this.global);
                this.localTransform = m4_translation([0,perlin2D(t[0], t[2])-0.25,0]);
                this.refreshDrawTransform();
            }
        } else this.future(100).setup();
    }

    destroy() {
        super.destroy();
        if (this.actor._viewObstacle) this.service("CollisionManager").colliders.delete(this);
    }
}
InstancePawn.register("InstancePawn");

//------------------------------------------------------------------------------------------
// HealthCoinPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class HealthCoinPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.group = new THREE.Group();
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.25,1,0.25), metalness:1.0, roughness:0.3} );
        this.geometry = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 32);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotateX(Math.PI/2);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.group.add(this.mesh);
        this.front = new THREE.Group();
        this.front.scale.set(3.2,3.2,3.2);
        this.front.position.y = 0.45;
        this.front.position.z = 0.7;
        this.back = new THREE.Group();
        this.back.scale.set(3.2,3.2,3.2);
        this.back.position.y = -0.45;
        this.back.position.z = 0.7;
        this.back.setRotationFromEuler( new THREE.Euler(0, 0, Math.PI) );
        this.mesh.add(this.front);
        this.mesh.add(this.back);
        this.setRenderObject(this.group);
        this.subscribe("stats", "health", this.setStat);
    }

    setStat( health ) {
        if (health>66) this.material.color = new THREE.Color(0.25,1,0.25);
        else if (health>33) this.material.color = new THREE.Color(1, 1, 0.4);
        else if (health > 0) this.material.color = new THREE.Color(1, 0.15, 0.15);
        else this.material.color = new THREE.Color(0.25, 0.25, 0.25);
        this.setNumbers(health.toString());
    }

    setNumbers(str) {
        if ( numbers[9] ) { // have we loaded it yet?
            this.front.clear();
            this.back.clear();
            const len = str.length;
            for (let i=0; i<len; i++) {
                const n = Number(str[i]);
                const numMesh = numbers[n];
                const f = new THREE.Mesh(numMesh.geometry, numMesh.material);
                const b = new THREE.Mesh(numMesh.geometry, numMesh.material);
                f.rotateX(-Math.PI/2);
                b.rotateX(-Math.PI/2);
                b.position.x = f.position.x = (0.5 + i - len/2)*0.4;// + (n===1?0.05:0);
                this.front.add( f );
                this.back.add( b );
            }
        } else this.future(100).setNumbers(str);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }
}
HealthCoinPawn.register("HealthCoinPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
// This is the ground of the world. We generate a simple plane of worldX by worldY in size
// and compute the Perlin noise value at each x/z position to determine the height.
// We then renormalize the mesh vectors.
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(actor) {
        super(actor);
        const worldX = 512, worldZ=512;
        const cellSize = 2.5;

        const paperTexture = new THREE.TextureLoader().load( paper );
        paperTexture.wrapS = THREE.RepeatWrapping;
        paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set( worldX/4, worldZ/4 );

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.8, 0.5, 0.2), map:paperTexture} );
        //this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2), map:paperTexture} );
        this.geometry = new THREE.PlaneGeometry(worldX*cellSize,worldZ*cellSize, worldX, worldZ);
        this.geometry.rotateX(toRad(-90));

        const vertices = this.geometry.attributes.position.array;

        for ( let index=0; index < vertices.length; index+=3)
            vertices[index+1] = perlin2D(vertices[index], vertices[index+2]);

        this.geometry.computeVertexNormals();
        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;
        base.castShadow = true;
        this.setRenderObject(base);
       // this.addRenderObjectToRaycast("ground");
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
// MissilePawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MissilePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...UserColors[actor.userColor]), metalness:0.5, roughness:0.1 } );
        this.geometry = new THREE.SphereGeometry( 0.75, 32, 16 );
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    update(time, delta) {
        super.update(time,delta);
        this._translation[1] = perlin2D(this.translation[0], this.translation[2])+2;
        this.localChanged();
        this.refreshDrawTransform();
    }
}
MissilePawn.register("MissilePawn");

//------------------------------------------------------------------------------------------
//-- CollisionManager ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class CollisionManager extends ViewService {

    constructor() {
        super("CollisionManager");
        this.colliders = new Set();
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, CollisionManager, ThreeRaycast, HUD];
    }

    onStart() {
        this.buildLights();
        this.buildInstances();
        const hud = this.service("HUD");
        new HUDWidget({parent: hud.root, autoSize: [1,1]});
    }

    buildLights() {
        const loader = new THREE.TextureLoader();
        loader.load( sky, skyTexture => {
            const rm = this.service("ThreeRenderManager");
            rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
            const ambient = new THREE.AmbientLight( 0xffffff, 0.6 );
            rm.scene.add(ambient);
            rm.scene.add(sunLight); // this is a global object
            rm.scene.fog = new THREE.Fog( 0x9D5D4D, 200, 400 );
            const pmremGenerator = new THREE.PMREMGenerator(rm.renderer);
            pmremGenerator.compileEquirectangularShader();
            const skyEnvironment = pmremGenerator.fromEquirectangular(skyTexture);
            rm.scene.background = skyEnvironment.texture;
            rm.scene.environment = skyEnvironment.texture;
        } );
    }

    async buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const botBodyGeo = new THREE.SphereGeometry( 2, 32, 16, 0, Math.PI * 2, 0, 2.6); 
        botBodyGeo.rotateX(-Math.PI/2);
        im.addGeometry("botBody", botBodyGeo);
        const botMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.5,0.5,0.5), metalness:1.0, roughness:0.3} );
        botMaterial.side = THREE.DoubleSide;
        im.addMaterial("botBody", botMaterial);
        const botBody = im.addMesh("botBody", "botBody", "botBody");
        botBody.castShadow = true;

        const botEye = new THREE.SphereGeometry( 1.50, 32, 16); 
        im.addGeometry("botEye", botEye);
        const botEyeMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(1,0.15,0.15)} );
        botEyeMaterial.side = THREE.FrontSide;
        im.addMaterial("botEye", botEyeMaterial);
        im.addMesh("botEye", "botEye", "botEye");

        const  green = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.25,1,0.25), metalness:1, roughness:0.1} );
        const  gray = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.75,0.75,0.75), metalness:1, roughness:0.1} );

        im.addMaterial("green", green);
        im.addMaterial("gray", gray);

        const cylinder3 = new THREE.CylinderGeometry(0.5, 1.5, 28.25, 32);
        cylinder3.translate(0,14,0);
        const shearMatrix = new THREE.Matrix4().makeShear(0, 0, 0.25, 0, 0, 0, 0);
        cylinder3.applyMatrix4(shearMatrix);
        cylinder3.computeVertexNormals();
        im.addGeometry("cylinder3", cylinder3);

        const cylinder4 = new THREE.CylinderGeometry(1.5, 1.5, 0.35, 32);
        cylinder4.translate(0,1.5,0);
        im.addGeometry("cylinder4", cylinder4);

        const mesh5 = im.addMesh("pole3", "cylinder3", "gray");
        const mesh6 = im.addMesh("pole4", "cylinder4", "green");


        mesh5.castShadow = true;
        mesh6.castShadow = true;

        //
        const gltfLoader = new GLTFLoader();

        let [bollard, powerTower, tankTracks, tankTurret, tankBody, n0, n1, n2, n3, n4, n5, n6, n7, n8, n9, centerTower, s1, s2, s3, s4] = await Promise.all( [
            gltfLoader.loadAsync( bollard_ ),
            gltfLoader.loadAsync( power_tower ),
            gltfLoader.loadAsync( tank_tracks ),
            gltfLoader.loadAsync( tank_turret ),
            gltfLoader.loadAsync( tank_body ),
            gltfLoader.loadAsync( n_0 ),
            gltfLoader.loadAsync( n_1 ),
            gltfLoader.loadAsync( n_2 ),
            gltfLoader.loadAsync( n_3 ),
            gltfLoader.loadAsync( n_4 ),
            gltfLoader.loadAsync( n_5 ),
            gltfLoader.loadAsync( n_6 ),
            gltfLoader.loadAsync( n_7 ),
            gltfLoader.loadAsync( n_8 ),
            gltfLoader.loadAsync( n_9 ),
            gltfLoader.loadAsync( center_tower ),
            gltfLoader.loadAsync( skyscraper_1 ),
            gltfLoader.loadAsync( skyscraper_2 ),
            gltfLoader.loadAsync( skyscraper_3 ),
            gltfLoader.loadAsync( skyscraper_4 ),
        ] );

        im.addGeometry("bollard", bollard.scene.children[0].geometry);
        const bollardim = im.addMesh("bollard", "bollard", "gray");
        bollardim.castShadow = true;
        bollardim.receiveShadow = true;

        tankBody = tankBody.scene.children[0].geometry;
        tankTracks = tankTracks.scene.children[0].geometry;
        tankTurret = tankTurret.scene.children[0].geometry;
        tankBody.rotateY(toRad(-90));
        tankTracks.rotateY(toRad(-90));
        tankTurret.rotateY(toRad(-90));
        im.addGeometry("tankBody", tankBody);
        im.addGeometry("tankTurret", tankTurret);
        im.addGeometry("tankTracks", tankTracks);

        const tankBodyim = im.addMesh("tankBody","tankBody", "gray");
        const tankTurretim = im.addMesh("tankTurret", "tankTurret","gray");
        const tankTracksim = im.addMesh("tankTracks", "tankTracks", "gray");

        tankBodyim.castShadow = true;
        tankBodyim.receiveShadow = true;
        tankTurretim.castShadow = true;
        tankTurretim.receiveShadow = true;
        tankTracksim.castShadow = true;
        tankTracksim.receiveShadow = true;

        const numberMat = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1), metalness:0.5, roughness:0.5} );
        this.setNumber(0, n0, numberMat);
        this.setNumber(1, n1, numberMat);
        this.setNumber(2, n2, numberMat);
        this.setNumber(3, n3, numberMat);
        this.setNumber(4, n4, numberMat);
        this.setNumber(5, n5, numberMat);
        this.setNumber(6, n6, numberMat);
        this.setNumber(7, n7, numberMat);
        this.setNumber(8, n8, numberMat);
        this.setNumber(9, n9, numberMat);

        skyscrapers[0] = centerTower.scene;
        skyscrapers[1] = s1.scene; //.children[0];
        skyscrapers[2] = s2.scene; //.children[0];
        skyscrapers[3] = s3.scene; //.children[0];
        skyscrapers[4] = s4.scene; //.children[0];
        skyscrapers[5] = powerTower.scene.children[0];
        skyscrapers[6] = bollard.scene;
    }

    setNumber(num, number3D, mat) {
        const num3D = number3D.scene.children[0];
        num3D.material = mat;
        numbers[num]=num3D;
    }
}
