import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_ThreeVisible, GetNamedView, v3_scale,
    ActorManager, RenderManager, UnitCube, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, RapierPhysicsManager, AM_RapierPhysics, LoadRapier, TAU, sphericalRandom, Triangles, CachedObject, AM_Spatial, m4_scaling, v3_transform, m4_rotationQ } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";
import * as THREE from 'three';

import { FBXLoader } from "../loaders/FBXLoader.js";

import fountain_txt from "../assets/castle_fountain_baseColor.png";
import fountain_nrm from "../assets/castle_fountain_normal.png";
import fountain_fbx from "../assets/castle_fountain.fbx";

const ASSETS = {
    "./lambert5_Base_Color.png": fountain_txt,
};

const assetManager = new THREE.LoadingManager();
assetManager.setURLModifier(url => {
    const asset = ASSETS[url] || url;
    //console.log(`FBX: mapping ${url} to ${asset}`)
    return asset;
});

//------------------------------------------------------------------------------------------
// SprayActor
//------------------------------------------------------------------------------------------

export class SprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {
        this.index = Math.floor(Math.random() * 30);

        super.init("SprayPawn", options);

        this.addRigidBody({type: 'dynamic'});
        this.addBoxCollider({
            size: [0.1, 0.1, 0.1],
            density: 1,
            friction: 1,
            restitution: 50
        });
        let until = Math.random() * 0.5 + 0.5;
        until *= 2000;
        until += 2000;
        // this.future(until).jump();
    }

    jump()
        {
            let force = [0.01 * (Math.random() - 0.5), 0.03, 0.01 * (Math.random() - 0.5)];
            this.applyImpulse(force);

            let until = Math.random() * 0.5 + 0.5;
            until *= 2000;

            this.future(until).jump();
        }
}
SprayActor.register('SprayActor');

//------------------------------------------------------------------------------------------
// SprayPawn
//------------------------------------------------------------------------------------------

class SprayPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        //this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.index, () => this.buildDraw()));

        /*const paperTexture = new THREE.TextureLoader().load( paper );

        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(1,3);

        const modelRoot = GetNamedView('ViewRoot').model;
        const color = modelRoot.colors[this.actor.index];
        const threeColor = new THREE.Color(color[0], color[1], color[2]);
        const geometry = new THREE.BoxBufferGeometry( 0.2, 0.2, 0.2 );
        const material = new THREE.MeshStandardMaterial( {map: paperTexture, color: threeColor} );
        this.cube = new THREE.Mesh( geometry, material );
        this.cube.castShadow = true;
        this.cube.receiveShadow= true;
        this.setRenderObject(this.cube);*/
        this.getSlime();
    }

    async getSlime() {
        const view = GetNamedView('ViewRoot');
        const slimeObj = await view.slimePromise;
        if (!slimeObj) return console.warn('wtf?')
        let obj = slimeObj.clone(true);
        const color = view.model.colors[this.actor.index];
        // by default all objects end up sharing the same referenced material, so manually create
        // a new instance here to ensure they don't all have the same underlying texture
        obj.children[0].material = slimeObj.children[0].material.clone();
        obj.children[0].material.color = new THREE.Color(color[0], color[1], color[2]);

        this.setRenderObject(obj);
    }
}
SprayPawn.register('SprayPawn');

//------------------------------------------------------------------------------------------
// FountainActor
//------------------------------------------------------------------------------------------

export class FountainActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    init(options) {
        console.log("Creating fountain");
        super.init("FountainPawn", options);

        this.collisionScale = [1.3, 0.14, 1.3];
        this.collisionLocation = [0, 0, 0];

        this.addRigidBody({type: 'static'});
        this.addBoxCollider({
            size: this.collisionScale,
            density: 1,
            friction: 1,
            restitution: 50,
            translation: this.collisionLocation
        });

        this.debugCollision = false;

        this.spray = [];
        this.spawnLimit = 35;
        this.future(0).tick();
    }

    tick() {
        if (this.spray.length >= this.spawnLimit) {
            const doomed = this.spray.shift();
            doomed.destroy();
        }
        const p = SprayActor.create({translation: this.translation});
        const spin = v3_scale(sphericalRandom(),Math.random() * 0.002);
        const rotationMatrix = m4_rotationQ(this.rotation);
        const force = v3_transform([0.025 + 0.005 * Math.random(), 0.07 + 0.005 * Math.random(), 0], rotationMatrix);
        p.applyTorqueImpulse(spin);
        p.applyImpulse(force);
        this.spray.push(p);
        this.future(200).tick();
    }

}
FountainActor.register('FountainActor');

class FountainPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible)
{
    constructor(...args) {
        super(...args);

        this.buildFountainModel();
    }

    async buildFountainModel()
    {
        const fnttxt = new THREE.TextureLoader().load( fountain_txt );
        const fntnrm = new THREE.TextureLoader().load( fountain_nrm );
        const fbxLoader = new FBXLoader(assetManager);

        // load model from fbxloader
        const obj = await new Promise( (resolve, reject) => fbxLoader.load(fountain_fbx, resolve, null, reject) );

        const render = GetNamedView("ThreeRenderManager");

        // create material with custom settings to apply to loaded model
        const material = new THREE.MeshStandardMaterial( {map: fnttxt,
            flatShading: false,
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 0.7,
            normalMap: fntnrm,
            envMap: render.scene.background } );
        // overwrite material
        obj.children[0].material = material;
        obj.children[0].position.set(0,0,0);
        obj.children[0].scale.set( 0.015, 0.02, 0.015);
        obj.children[0].rotation.set(0,0,0);
        obj.children[0].castShadow = true;
        obj.children[0].receiveShadow = true;
        // save mesh for later use
        this.myMesh = obj.children[0];
        obj.castShadow = true;
        obj.receiveShadow = true;

        if (this.actor.debugCollision)
        {
            const threeColor = new THREE.Color(255, 255, 255);
            const geometry = new THREE.BoxBufferGeometry(
                this.actor.collisionScale[0] * 2,
                this.actor.collisionScale[1] * 2,
                this.actor.collisionScale[2] * 2 );
            const debugmaterial = new THREE.MeshStandardMaterial( {wireframe: true, color: threeColor} );
            let cube = new THREE.Mesh( geometry, debugmaterial );
            cube.position.set(this.actor.collisionLocation[0] * 20,
                this.actor.collisionLocation[1] * 20,
                this.actor.collisionLocation[2] * 20);
            obj.add(cube);
        }

        this.setRenderObject(obj);
    }
}
FountainPawn.register('FountainPawn');
