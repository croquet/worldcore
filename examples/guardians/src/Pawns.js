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
// - joystick is not sufficiently responsive
// - add compass to joystick
// - power up or roles - time gated, new one replaces old one
// -- force field - freeze bots
// -- triple shot
// -- armor piercing
// -- add power to tower
// -- mine layer
// -- Artillery cannon

import { ViewRoot, ViewService, Pawn, mix, InputManager, PM_Smoothed, PM_Spatial,
    toRad, m4_translation, m4_getTranslation, PerlinNoise } from "@croquet/worldcore-kernel";
import { ThreeInstanceManager, PM_ThreeInstanced, PM_ThreeVisible, THREE, GLTFLoader, ThreeRenderManager, ThreeRaycast } from "@croquet/worldcore-three";
import { HUD } from "@croquet/worldcore-widget2";
import { HUDWidget } from "./BotHUD";

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

import tank_tracks from "../assets/newtank_treads.glb";
import tank_body from "../assets/newtank.glb";

import fireballTexture from "../assets/explosion.png";
import * as fireballFragmentShader from "../assets/fireball.frag.js";
import * as fireballVertexShader from "../assets/fireball.vert.js";

const numbers = [];
const skyscrapers = [];
export const tank = [];

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
export class BotPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        const t = this.translation;
        t[1]=perlin2D(t[0], t[2])+2;
        this.makeBot();
    }

    update(time, delta) {
        super.update(time,delta);
        const p = perlin2D(this.translation[0], this.translation[2])+2;
        this._translation[1] = p;
        this.localChanged();
        this.refreshDrawTransform();
        this.refreshChildDrawTransform();
    }

    makeBot() {
        const botBodyGeo = new THREE.SphereGeometry( 2, 32, 16, 0, Math.PI * 2, 0, 2.6);
        botBodyGeo.rotateX(-Math.PI/2);
        const botMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.5,0.5,0.5), metalness:1.0, roughness:0.3} );
        botMaterial.side = THREE.DoubleSide;
        this.botBody = new THREE.Mesh(botBodyGeo, botMaterial);
        this.botBody.castShadow = true;

        const botEyeGeo = new THREE.SphereGeometry( 1.50, 32, 16);
        const botEyeMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(1,0.15,0.15)} );
        botEyeMaterial.side = THREE.FrontSide;
        this.botEye = new THREE.Mesh( botEyeGeo, botEyeMaterial );
        this.botBody.add(this.botEye);
        this.setRenderObject(this.botBody);
    }

    destroy() {
        super.destroy();
        if (this.botBody) {
            this.botBody.geometry.dispose();
            this.botBody.material.dispose();
            this.botEye.geometry.dispose();
            this.botEye.material.dispose();
            this.botBody = null;
        }
    }
}

BotPawn.register("BotPawn");

//------------------------------------------------------------------------------------------
// FireballPawn ----------------------------------------------------------------------------
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
// TowerPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class TowerPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.radius = actor._radius;
        this.index = actor._index;
        this.height = actor.translation[1];
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

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.8, 0.5, 0.2)} );
        this.geometry = new THREE.PlaneGeometry(worldX*cellSize,worldZ*cellSize, worldX, worldZ);
        this.geometry.rotateX(toRad(-90));

        const vertices = this.geometry.attributes.position.array;

        for ( let index=0; index < vertices.length; index+=3) vertices[index+1] = perlin2D(vertices[index], vertices[index+2]);

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
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...UserColors[actor.colorIndex]), metalness:0.5, roughness:0.1 } );
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
//-- LobbyRelayPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LobbyRelayPawn extends Pawn {
    constructor(model) {
        super(model);
        this.model = model;
        this.listen("relay-changed", this.relayChanged);
        // this.listen("relay-views", this.reportToLobby); using interval instead
        console.log("relay", this.viewId, "created");
        this.relayChanged(this.model.electedViewId);
    }

    relayChanged(viewId) {
        console.log("relay", this.viewId, "relay changed to", viewId, this.viewId === viewId ? "(me)" : "(not me)");
        clearInterval(this.lobbyInterval);
        if (viewId === this.viewId) {
            this.reportToLobby();
            this.lobbyInterval = setInterval(() => this.reportToLobby(), 1000);
        }
    }

    destroy() {
        clearInterval(this.lobbyInterval);
        window.removeEventListener("message", this);
        super.destroy();
        console.log("relay", this.viewId, "destroyed");
    }

    reportToLobby() {
        let description = `${this.model.viewIds.size} player${this.model.viewIds.size === 1 ? "" : "s"}`;
        const locations = new Map();
        let unknown = false;
        for (const viewId of this.model.viewIds) {
            const loc = CROQUETVM.views[viewId]?.loc;  // FIXME: CROQUETVM is for debugging only
            if (loc?.country) {
                let location = loc.country;
                if (loc.region) location = loc.region + ", " + location;
                if (loc.city) location = loc.city.name + " (" + location + ")";
                locations.set(location, (locations.get(location) || 0) + 1);
            } else {
                unknown = true;
            }
        }
        if (locations.size > 0) {
            let sorted = [...locations].sort((a, b) => b[1] - a[1]);
            if (sorted.length > 3) {
                sorted = sorted.slice(0, 3);
                unknown = true;
            }
            description += ` from ${sorted.map(([location]) => location).join(", ")}`;
            if (unknown) description += " and elsewhere";
        }
        const { health, demoMode } = this.wellKnownModel("modelRoot").gameState;
        description += demoMode ? " [demo]" : health ? ` [health: ${health}]` : " [game over]";
        const users = {
            count: this.model.viewIds.size,
            description,
            color: demoMode ? `rgb(191,191,255)` : health>66 ? `rgb(64,255,64)` : health>33 ? `rgb(255,255,102)` : health>0 ? `rgb(255,38,38)` : "",
        };
        window.parent.postMessage({type: "croquet-lobby", name: this.session.name, users}, "*");
        // console.log("relay", this.viewId, "sending croquet-lobby", this.session.name, users);
    }

}
LobbyRelayPawn.register("LobbyRelayPawn");

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

        const gltfLoader = new GLTFLoader();

        let [bollard, powerTower, tankTracks, tankBody, n0, n1, n2, n3, n4, n5, n6, n7, n8, n9, centerTower, s1, s2, s3, s4] = await Promise.all( [
            gltfLoader.loadAsync( bollard_ ),
            gltfLoader.loadAsync( power_tower ),
            gltfLoader.loadAsync( tank_tracks ),
//            gltfLoader.loadAsync( tank_turret ),
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

        const  gray = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.75,0.75,0.75), metalness:1, roughness:0.1} );
        im.addMaterial("gray", gray);
        im.addGeometry("bollard", bollard.scene.children[0].geometry);
        const bollardim = im.addMesh("bollard", "bollard", "gray");
        bollardim.castShadow = true;
        bollardim.receiveShadow = true;

        tank[0] = tankTracks.scene;
        tank[1] = tankBody.scene;

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
    }

    setNumber(num, number3D, mat) {
        const num3D = number3D.scene.children[0];
        num3D.material = mat;
        numbers[num]=num3D;
    }
}
