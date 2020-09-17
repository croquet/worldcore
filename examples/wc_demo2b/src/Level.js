import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, PM_ThreeVisible, Triangles, Material, DrawCall, AM_RapierPhysics, q_axisAngle } from "@croquet/worldcore";
import { FountainActor } from "./Fountain";
import paper from "../assets/paper.jpg";
import * as THREE from 'three';

import { FBXLoader } from "../loaders/FBXLoader.js";

// asset imports //
// grass ground texture
import castlefloor_txt from "../assets/castle_floor_baseColor.png";
// castle wall segment
import castlewall_txt from "../assets/castle_wall_baseColor.png";
import castlewall_nrm from "../assets/castle_wall_normal.png";
import castlewall_fbx from "../assets/castle_wall.fbx";
// castle wall corner
import castlewallcorner_txt from "../assets/castle_tower_baseColor.png";
import castlewallcorner_nrm from "../assets/castle_tower_normal.png";
import castlewallcorner_fbx from "../assets/castle_tower.fbx";


const ASSETS = {
    "./lambert5_Base_Color.png": castlewall_txt,
    "./lambert1_Base_Color.png": castlewallcorner_txt,
};

const assetManager = new THREE.LoadingManager();
assetManager.setURLModifier(url => {
    const asset = ASSETS[url] || url;
    console.log(`FBX: mapping ${url} to ${asset}`)
    return asset;
});


export class LevelActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    init() {

        super.init("LevelPawn", {location: [0,0,0], scale: [1,1,1]});

        this.addRigidBody({type: 'static'});
        this.addBoxCollider({
            size: [20,1,20],
            friction: 1,
            density: 1,
            restitution: 1000
        });

        this.fountain0 = FountainActor.create({location: [-3,1,0]});
        this.fountain1 = FountainActor.create({location: [3,1,0], rotation: q_axisAngle([0,1,0], Math.PI)});
        this.buildCastleWalls();
    }

    buildCastleWalls()
    {
        this.globalOffset = [20, 0, -40];
        this.mySegments = [];
        let localOffset = 0;
        let wallSegment;

        // wall east
        localOffset = 0;
        for (let i = 0; i < 6; i++) {
            wallSegment = WallActor.create({
                location: [20 + this.globalOffset[0],
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] + localOffset],
                scale: [0.05, 0.05, 0.05]});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            location: [20 + this.globalOffset[0],
                1 + this.globalOffset[1],
                8 + this.globalOffset[2] + localOffset],
            scale: [0.05, 0.05, 0.05]});
        this.mySegments.push(wallSegment);

        // wall south
        localOffset = 7.5;
        for (let i = 0; i < 6; i++) {
            wallSegment = WallActor.create({
                location: [20 + this.globalOffset[0] - localOffset,
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] + 57.5],
                scale: [0.05, 0.05, 0.05],
                rotation: q_axisAngle([0,1,0], 3*Math.PI/2)});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            location: [20 + this.globalOffset[0] - localOffset,
                1 + this.globalOffset[1],
                8 + this.globalOffset[2] + 57.5],
            scale: [0.05, 0.05, 0.05],
            rotation: q_axisAngle([0,1,0], 3*Math.PI/2)});
        this.mySegments.push(wallSegment);

        // wall west
        localOffset = -50;
        for (let i = 0; i < 6; i++) {
            wallSegment = WallActor.create({
                location: [20 + this.globalOffset[0] - 65,
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] - localOffset],
                scale: [0.05, 0.05, 0.05],
                rotation: q_axisAngle([0,1,0], Math.PI)});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            location: [20 + this.globalOffset[0] - 65,
                1 + this.globalOffset[1],
                8 + this.globalOffset[2] - localOffset],
            scale: [0.05, 0.05, 0.05],
            rotation: q_axisAngle([0,1,0], Math.PI)});
        this.mySegments.push(wallSegment);

        // wall north
        localOffset = -57.5;
        for (let i = 0; i < 6; i++) {
            wallSegment = WallActor.create({
                location: [20 + this.globalOffset[0] + localOffset,
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] - 7.5],
                scale: [0.05, 0.05, 0.05],
                rotation: q_axisAngle([0,1,0], Math.PI/2)});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            location: [20 + this.globalOffset[0] + localOffset,
                1 + this.globalOffset[1],
                8 + this.globalOffset[2] - 7.5],
            scale: [0.05, 0.05, 0.05],
            rotation: q_axisAngle([0,1,0], Math.PI/2)});
        this.mySegments.push(wallSegment);
    }

    destroy() {
        super.destroy();
        this.fountain0.destroy();
        this.fountain1.destroy();
        for (let i = 0; i < this.mySegments.length; i++)
        {
            this.mySegments[i].destroy();
        }
    }
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        console.log("Building level pawn");

        let group = new THREE.Group();

        const paperTexture = new THREE.TextureLoader().load( castlefloor_txt );

        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(50,50);
        const floor = new THREE.Mesh(
           // width, height, widthSegments, heightSegments
           new THREE.PlaneGeometry(200, 200, 10, 10),
           new THREE.MeshStandardMaterial( { map: paperTexture} )
        );
        //floor.position.y = -1.5;
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.position.set(0, 1, 0);
        group.add(floor);

        group.add(new THREE.AmbientLight( 0x444444  ));

        var light = new THREE.DirectionalLight( 0x999999, 0.85 );
        light.position.set( 100, 100, 0 );
        //light.position.multiplyScalar( 1.3 );

        light.castShadow = true;

        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
 
        var d = 100;

        light.shadow.camera.left = - d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = - d;

        light.shadow.camera.far = 3000;

        this.setRenderObject(group);
        group.parent.add(light);
         

    }

    destroy() {
        super.destroy();
        //this.ground.destroy();
        //this.material.destroy();

    }

}
LevelPawn.register('LevelPawn');

// represents a single wall segment
export class WallActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    init(options) {

        super.init("WallPawn", options);

        this.collisionScale = options.collisionSca || [50, 50, 100];
        this.collisionLocation = options.collisionLoc || [0, 2.5, 0];
        this.debugCollision = false;

        this.addRigidBody({type: 'static'});
        this.addBoxCollider({
            size: [this.collisionScale[0],this.collisionScale[1],this.collisionScale[2]],
            friction: 1,
            density: 1,
            restitution: 1000,
            translation: [this.collisionLocation[0],this.collisionLocation[1],this.collisionLocation[2]]
        });
    }

    destroy() {
        super.destroy();
    }
}
WallActor.register('WallActor');

class WallPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        console.log("Building wall pawn");

        this.loadPawnModel();
    }

    async loadPawnModel()
    {
        const pawntxt = new THREE.TextureLoader().load( castlewall_txt );
        const pawnnrm = new THREE.TextureLoader().load( castlewall_nrm );
        const fbxLoader = new FBXLoader(assetManager);

        // load model from fbxloader
        const obj = await new Promise( (resolve, reject) => fbxLoader.load(castlewall_fbx, resolve, null, reject) );

        // create material with custom settings to apply to loaded model
        const material = new THREE.MeshStandardMaterial( {map: pawntxt, 
            flatShading: false, 
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 100,
            normalMap: pawnnrm } );
        // overwrite material
        obj.children[0].material = material;
        obj.children[0].position.set(0,0,0);
        obj.children[0].scale.set(1,1,1);
        obj.children[0].rotation.set(0,0,0);
        obj.children[0].castShadow = true;
        obj.children[0].receiveShadow = true;
        // save mesh for later use
        this.myMesh = obj.children[0];
        obj.castShadow = true;
        obj.receiveShadow= true;
        obj.position.set(0, 0, 0);
        this.setRenderObject(obj);

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
    }

    destroy() {
        super.destroy();
    }

}
WallPawn.register('WallPawn');

export class WallCornerActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    init(options) {

        super.init("WallCornerPawn", options);

        this.collisionScale = options.collisionSca || [50, 90, 50];
        this.collisionLocation = options.collisionLoc || [0, 4.5, 0];

        this.addRigidBody({type: 'static'});
        this.addBoxCollider({
            size: [this.collisionScale[0],this.collisionScale[1],this.collisionScale[2]],
            friction: 1,
            density: 1,
            restitution: 1000,
            translation: [this.collisionLocation[0],this.collisionLocation[1],this.collisionLocation[2]]
        });
    }

    destroy() {
        super.destroy();
    }
}
WallCornerActor.register('WallCornerActor');

class WallCornerPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        console.log("Building wall corner pawn");

        this.loadPawnModel();
    }

    async loadPawnModel()
    {
        const pawntxt = new THREE.TextureLoader().load( castlewallcorner_txt );
        const pawnnrm = new THREE.TextureLoader().load( castlewallcorner_nrm );
        const fbxLoader = new FBXLoader(assetManager);

        // load model from fbxloader
        const obj = await new Promise( (resolve, reject) => fbxLoader.load(castlewallcorner_fbx, resolve, null, reject) );

        // create material with custom settings to apply to loaded model
        const material = new THREE.MeshStandardMaterial( {map: pawntxt, 
            flatShading: false, 
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 100,
            normalMap: pawnnrm } );
        // overwrite material
        obj.children[0].material = material;
        obj.children[0].position.set(0,0,0);
        obj.children[0].scale.set(1,1,1);
        obj.children[0].rotation.set(0,3*Math.PI/2,0);
        obj.children[0].castShadow = true;
        obj.children[0].receiveShadow = true;
        // save mesh for later use
        this.myMesh = obj.children[0];
        obj.castShadow = true;
        obj.receiveShadow= true;
        obj.position.set(0, 0, 0);
        this.setRenderObject(obj);

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
    }

    destroy() {
        super.destroy();
    }

}
WallCornerPawn.register('WallCornerPawn');