import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, v3_scale,
    ActorManager, RenderManager, PM_ThreeVisible, UnitCube, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, RapierPhysicsManager, AM_RapierPhysics, LoadRapier, TAU, sphericalRandom, Triangles, CachedObject, m4_scaling } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";
import * as THREE from 'three';

import { FBXLoader } from "../loaders/FBXLoader.js";

import fireball_txt from "../assets/fireball_baseColor.png";
import fireball_emi from "../assets/fireball_emissive.png";
import fireball_fbx from "../assets/fireball_mesh.fbx";

//------------------------------------------------------------------------------------------
// ProjectileActor
//------------------------------------------------------------------------------------------

export class ProjectileActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {

        this.owner = options.owner;
        this.color = options.color;

        super.init("ProjectilePawn", options);

        this.debugCollision = false;
        this.collisionLocation = [0, 0, 0];
        this.collisionScale = 0.25;

        this.addRigidBody({type: 'dynamic'});
        this.addBallCollider({
            radius: this.collisionScale,
            /*size: [this.collisionScale[0],
            this.collisionScale[1],
            this.collisionScale[2]],*/
            density: 1,
            friction: 1,
            restitution: 50
        });

    }

}
ProjectileActor.register('ProjectileActor');

//------------------------------------------------------------------------------------------
// ProjectilePawn
//------------------------------------------------------------------------------------------

class ProjectilePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.loadFireball();
    }

    async loadFireball()
    {
        const firetxt = new THREE.TextureLoader().load( fireball_txt );
        const fireemi = new THREE.TextureLoader().load( fireball_emi );
        const fbxLoader = new FBXLoader();

        // load model from fbxloader
        const obj = await new Promise( (resolve, reject) => fbxLoader.load(fireball_fbx, resolve, null, reject) );

        // create material with custom settings to apply to loaded model
        const material = new THREE.MeshStandardMaterial( {map: firetxt, 
            flatShading: false, 
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 100,
            emissive: fireemi } );
        // overwrite material
        obj.children[0].material = material;
        obj.children[0].position.set(0,0,0);
        obj.children[0].scale.set( 0.2, 0.2, 0.2);
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
            const geometry = new THREE.SphereBufferGeometry( 
                this.actor.collisionScale, 12, 12 );
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
ProjectilePawn.register('ProjectilePawn');
