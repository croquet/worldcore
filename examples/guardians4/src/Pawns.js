// Guardian Pawns
// Copyright (c) 2023 CROQUET CORPORATION
//
// The majority of the code specific to this example is in Avatar.js.
// Demonstrates terrain following, avatar/object and avatar/avatar collisions.
// Uses a 2D Perlin noise function to generate terrain and to dynamically compute
// the height of the terrain as the avatar moves.

//
// To do:
// - track total number of bots - should not be more than 1000
// - bots attack tanks
// - attack in waves. Each wave has more bots and waves come closer together in time
// - random location of start - far away
// - create bots in valleys
// - tank damage and explosion (turret jumps up, tank fades out)
// - tank damage displayed with three lights on back of tank - green and red. Three red and you blow up.
// - tank respawns after some period of time (five seconds?
// - should tanks lay down track?


import { ViewRoot, ViewService,Pawn, mix, InputManager, ThreeInstanceManager,
    PM_ThreeVisible, ThreeRenderManager, ThreeRaycast, PM_Smoothed, PM_Spatial, PM_ThreeInstanced, PM_ThreeCollider,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation, m4_getTranslation,
    PerlinNoise, GLTFLoader } from "@croquet/worldcore";
import tank_tracks from "../assets/tank_tracks.glb";
import tank_turret from "../assets/tank_turret.glb";
import tank_body from "../assets/tank_body.glb";
import paper from "../assets/paper.jpg";
import sky from "../assets/quarry_03.png";

import fireballTexture from "../assets/explosion.png";
import smokeTexture from "../assets/Smoke-Element.png";
import * as fireballFragmentShader from "../assets/fireball.frag.js";
import * as fireballVertexShader from "../assets/fireball.vert.js";


export const UserColors = [
    rgb(255, 64, 64),        // Red
    rgb(64, 64, 255),         // Blue
    rgb(255, 178, 122),        // Orange
    rgb(255, 64, 255),        // Purple
    rgb(255, 240, 111),        // Yellow

    rgb(210, 57, 43),        // Red
    rgb(40, 116, 166),        // Blue
    rgb(175, 96, 26),        // Orange
    rgb(118, 68, 138),        // Purple
    rgb(183, 149, 11),        // Yellow

    rgb(217, 136, 128),        // Red
    rgb(52, 152, 219),        // Blue
    rgb(230, 126, 34),        // Orange
    rgb(155, 89, 182),         // Purple
    rgb(241, 196, 15),        // Yellow

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


export const sunBase = [50, 100, 50];
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

// 3D object that you can see through a wall
const constructShadowObject = function(object3d, renderOrder, c) {

    const shadowMat = new THREE.MeshStandardMaterial( {
        color: c,
        opacity: 0.25,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        // side: THREE.BackSide,
    });

    const outline3d = object3d.clone(true);
    outline3d.position.set(0,0,0);
    outline3d.rotation.set(0,0,0);
    outline3d.updateMatrix();
    outline3d.traverse( m => {
        if (m.material) {
            m.material = shadowMat;
            if (!Array.isArray(m.material)) {
                console.log("single material");
                m.material = shadowMat;
            } else {
                console.log("multiple material", m.material.length);
                const mArray = m.material.map( _m => shadowMat );
                m.material = mArray;
            }
        }
    });
    outline3d.renderOrder = renderOrder;
    return outline3d;
};

let fireMaterial = function makeFireMaterial() {
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

let smokeMaterial = function makeSmokeMaterial() {
    const texture = new THREE.TextureLoader().load(smokeTexture);
    const smoke = new THREE.MeshLambertMaterial({color: 0x00dddd, map: texture, transparent: true});
    return smoke;
}();

//------------------------------------------------------------------------------------------
// BotPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider, PM_ThreeInstanced) {

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

    killMe() {
        this.say("killMe");
    }
}

BotPawn.register("BotPawn");

//------------------------------------------------------------------------------------------
// BotEyePawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotEyePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("botEye");
    //    this.addRenderObjectToRaycast();
    }

    killMe() {
        this.say("killMe");
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

export class FireballPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        //this.listen("updateFire",this.fireUpdate);
        this.material = fireMaterial.clone();
        this.geometry = new THREE.IcosahedronGeometry( 10, 20 );
        this.fireball = new THREE.Mesh(this.geometry, this.material);
        this.pointLight = new THREE.PointLight(0xff8844, 1, 4, 2);
        this.fireball.add(this.pointLight);
        this.startTime = this.now();
/*
        this.smokeGeo = new THREE.PlaneGeometry(10,10);
        this.smokeParticles = [];
        this.smokeGroup = new THREE.Group();
        this.smokeGroup.position.y = 4;
        for (let p = 0; p < 5; p++) {
            var particle = new THREE.Mesh(this.smokeGeo, smokeMaterial);
            particle.position.set(Math.random()*5-2.5,Math.random()*5-2.5,Math.random()*5-2.5);
            particle.rotation.z = Math.random() * 360;
            this.smokeGroup.add(particle);
            this.smokeParticles.push(particle);
        }
        this.fireball.add(this.smokeGroup);
*/
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
        const rm = this.service("ThreeRenderManager");
        if (this.smokeParticles) {
            this.smokeParticles.forEach( particle => particle.quaternion.copy( rm.camera.quaternion ));
        }
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
        this.pointLight.dispose();
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
            //this.outline3d=constructShadow(this.mesh, 10002);
            //this.mesh.add(this.outline3d, color);
        } else this.future(100).loadGeometry(name, color);
    }
}

GeometryPawn.register("GeometryPawn");
//------------------------------------------------------------------------------------------
// BollardPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BollardPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        //this.useInstance("pole");
        this.useInstance(actor._instanceName);
        this.service("CollisionManager").colliders.add(this);
        const t = this.translation;
        this.localTransform = m4_translation([0,perlin2D(t[0], t[2])-0.25,0]);
        this.refreshDrawTransform();
    }

    destroy() {
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
    }

}
BollardPawn.register("BollardPawn");

//------------------------------------------------------------------------------------------
// BollardPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class InstancePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance(actor._instanceName);
       // if (actor._perlin) {
            const t = m4_getTranslation(this.global);
            this.localTransform = m4_translation([0,perlin2D(t[0], t[2])-0.25,0]);
            this.refreshDrawTransform();
        //}
    }
}
InstancePawn.register("InstancePawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
// This is the ground of the world. We generate a simple plane of worldX by worldY in size
// and compute the Perlin noise value at each x/z position to determine the height.
// We then renormalize the mesh vectors.
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeCollider) {
    constructor(actor) {
        super(actor);
        const worldX = 512, worldZ=512;
        const cellSize = 2.5;

        const paperTexture = new THREE.TextureLoader().load( paper );
        paperTexture.wrapS = THREE.RepeatWrapping;
        paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set( worldX/4, worldZ/4 );


        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2), map:paperTexture} );
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
        this.addRenderObjectToRaycast("ground");
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
    //    this.service("CollisionManager").colliders.add(this);
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...UserColors[actor.userColor]), metalness:0.5, roughness:0.1 } );
        this.geometry = new THREE.SphereGeometry( 0.75, 32, 16 );
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);
        this.listen("colorSet", this.onColorSet);
    }

    destroy() {
        super.destroy();
    //    this.service("CollisionManager").colliders.delete(this);
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
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
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, CollisionManager, ThreeRaycast];
    }

    onStart() {
        this.buildLights();
        this.buildInstances();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        const ambient = new THREE.AmbientLight( 0xffffff, 0.6 );
        rm.scene.add(ambient);
        rm.scene.add(sunLight); // this is a global object
        const loader = new THREE.TextureLoader();
        loader.load( sky, skyTexture => {
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
        const  magenta = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        const  cyan = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,1)} );
        const  gray = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.75,0.75,0.75), metalness:1, roughness:0.1} );
        const  fenceMat = new THREE.MeshStandardMaterial( { color: new THREE.Color(0.3,0.3,0.3), metalness:1, roughness:0.1, transparent:true, opacity:0.25, side:THREE.DoubleSide} );

        im.addMaterial("green", green);
        im.addMaterial("magenta", magenta);
        im.addMaterial("cyan", cyan);
        im.addMaterial("gray", gray);
        im.addMaterial("fenceMat", fenceMat);

        const box = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("box", box);

        const cylinder = new THREE.CylinderGeometry(1, 1.5, 4.25, 32);
        cylinder.translate(0,2,0);
        im.addGeometry("cylinder", cylinder);

        const cylinder2 = new THREE.CylinderGeometry(1, 1, 0.25, 32);
        cylinder2.translate(0,1.5,0);
        im.addGeometry("cylinder2", cylinder2);

        const cylinder3 = new THREE.CylinderGeometry(0.5, 1.5, 28.25, 32);
        cylinder3.translate(0,14,0);
        const shearMatrix = new THREE.Matrix4().makeShear(0, 0, 0.25, 0, 0, 0, 0);
        cylinder3.applyMatrix4(shearMatrix);
        cylinder3.computeVertexNormals();
        im.addGeometry("cylinder3", cylinder3);

        const cylinder4 = new THREE.CylinderGeometry(1.5, 1.5, 0.35, 32);
        cylinder4.translate(0,1.5,0);
        im.addGeometry("cylinder4", cylinder4);

        //const fenceGeo = createBoxWithRoundedEdges(3, 3, 0.25, .05, 3);
        const fenceGeo = new THREE.PlaneGeometry(2.75,8);
        fenceGeo.translate(0, 4, 0);
        fenceGeo.computeVertexNormals();
        im.addGeometry("fenceGeo", fenceGeo);

        //const mesh0 = im.addMesh("yellowBox", "box", "yellow");

        const mesh3 = im.addMesh("pole", "cylinder", "gray");
        const mesh4 = im.addMesh("pole2", "cylinder2", "gray",3000);
        const mesh5 = im.addMesh("pole3", "cylinder3", "gray");
        const mesh6 = im.addMesh("pole4", "cylinder4", "green");
        //const fence = im.addMesh("fence", "fenceGeo", "fenceMat");

        mesh3.castShadow = true;
        mesh4.castShadow = true;
        mesh5.castShadow = true;
        mesh6.castShadow = true;

        //
        const gltfLoader = new GLTFLoader();

        let [ tankTracks, tankTurret, tankBody ] = await Promise.all( [
            gltfLoader.loadAsync( tank_tracks ),
            gltfLoader.loadAsync( tank_turret),
            gltfLoader.loadAsync( tank_body)
        ] );

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
    }
}
