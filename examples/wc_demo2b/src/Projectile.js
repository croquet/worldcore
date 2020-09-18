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

const ASSETS = {
    "./lambert5_Base_Color.png": fireball_txt,
};

const assetManager = new THREE.LoadingManager();
assetManager.setURLModifier(url => {
    const asset = ASSETS[url] || url;
    //console.log(`FBX: mapping ${url} to ${asset}`)
    return asset;
});

//------------------------------------------------------------------------------------------
// ProjectileActor
//------------------------------------------------------------------------------------------

export class ProjectileActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {

        this.owner = options.owner;
        this.color = options.color;

        super.init("ProjectilePawn", options);

        // this.debugCollision = false;
        // this.collisionLocation = [0, 0, 0];
        this.collisionScale = [0.2, 0.2, 0.2];

        this.addRigidBody({type: 'dynamic'});
        this.addBoxCollider({
            //radius: 0.25,
            size: [this.collisionScale[0],
            this.collisionScale[1],
            this.collisionScale[2]],
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
        this.getFireball();
    }

    async getFireball() {
        // instead of using FBXLoader to create new object instance every time, instead copy static
        // fireball model/texture from viewroot.
        const view = GetNamedView('ViewRoot');
        const fireballObj = await view.fireballPromise;
        if (!fireballObj) return console.warn('wtf?')
        let obj = new THREE.Group().copy(fireballObj, true);
        const color = this.actor.color;
        obj.children[0].material = fireballObj.children[0].material.clone();
        obj.children[0].material.color = new THREE.Color(color[0], color[1], color[2]);
        this.setRenderObject(obj);
    }

}
ProjectilePawn.register('ProjectilePawn');
