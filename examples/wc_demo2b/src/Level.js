import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, PM_ThreeVisible, Triangles, Material, DrawCall, AM_RapierPhysics, q_axisAngle, GetNamedView } from "@croquet/worldcore";
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
// skybox
import skybox_front_txt from "../assets/skybox_front.png";
import skybox_top_txt from "../assets/skybox_top.png";
import skybox_bottom_txt from "../assets/skybox_bottom.png";
import skybox_right_txt from "../assets/skybox_right.png";
import skybox_left_txt from "../assets/skybox_left.png";
import skybox_back_txt from "../assets/skybox_back.png";


const ASSETS = {
    "./lambert5_Base_Color.png": castlewall_txt,
    "./lambert1_Base_Color.png": castlewallcorner_txt,
    "./skybox_back.png": skybox_back_txt,
    "./skybox_front.png": skybox_front_txt,
    "./skybox_left.png": skybox_left_txt,
    "./skybox_top.png": skybox_top_txt,
    "./skybox_bottom.png": skybox_bottom_txt,
    "./skybox_right.png": skybox_right_txt,
};

const assetManager = new THREE.LoadingManager();
assetManager.setURLModifier(url => {
    const asset = ASSETS[url] || url;
    //console.log(`FBX: mapping ${url} to ${asset}`)
    return asset;
});


export class LevelActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    init() {

        super.init("LevelPawn", {translation: [0,0,0], scale: [1,1,1]});

        this.addRigidBody({type: 'static'});
        this.addBoxCollider({
            size: [40,1,40],
            friction: 1,
            density: 1,
            restitution: 1000
        });

        this.fountain0 = FountainActor.create({translation: [-3,1,0]});
        this.fountain1 = FountainActor.create({translation: [3,1,0], rotation: q_axisAngle([0,1,0], Math.PI)});
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
                translation: [20 + this.globalOffset[0],
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] + localOffset],
                scale: [0.05, 0.05, 0.05]});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            translation: [20 + this.globalOffset[0],
                1 + this.globalOffset[1],
                8 + this.globalOffset[2] + localOffset],
            scale: [0.05, 0.05, 0.05]});
        this.mySegments.push(wallSegment);

        // wall south
        localOffset = 7.5;
        for (let i = 0; i < 6; i++) {
            wallSegment = WallActor.create({
                translation: [20 + this.globalOffset[0] - localOffset,
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] + 57.5],
                scale: [0.05, 0.05, 0.05],
                rotation: q_axisAngle([0,1,0], 3*Math.PI/2)});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            translation: [20 + this.globalOffset[0] - localOffset,
                1 + this.globalOffset[1],
                8 + this.globalOffset[2] + 57.5],
            scale: [0.05, 0.05, 0.05],
            rotation: q_axisAngle([0,1,0], 3*Math.PI/2)});
        this.mySegments.push(wallSegment);

        // wall west
        localOffset = -50;
        for (let i = 0; i < 6; i++) {
            wallSegment = WallActor.create({
                translation: [20 + this.globalOffset[0] - 65,
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] - localOffset],
                scale: [0.05, 0.05, 0.05],
                rotation: q_axisAngle([0,1,0], Math.PI)});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            translation: [20 + this.globalOffset[0] - 65,
                1 + this.globalOffset[1],
                8 + this.globalOffset[2] - localOffset],
            scale: [0.05, 0.05, 0.05],
            rotation: q_axisAngle([0,1,0], Math.PI)});
        this.mySegments.push(wallSegment);

        // wall north
        localOffset = -57.5;
        for (let i = 0; i < 6; i++) {
            wallSegment = WallActor.create({
                translation: [20 + this.globalOffset[0] + localOffset,
                    1 + this.globalOffset[1],
                    8 + this.globalOffset[2] - 7.5],
                scale: [0.05, 0.05, 0.05],
                rotation: q_axisAngle([0,1,0], Math.PI/2)});
            this.mySegments.push(wallSegment);
            localOffset += 10;
        }
        localOffset -= 2.5;
        wallSegment = WallCornerActor.create({
            translation: [20 + this.globalOffset[0] + localOffset,
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
           new THREE.MeshStandardMaterial( { map: paperTexture, metalness: 0.1, roughness: 0.9} )
        );
        //floor.position.y = -1.5;
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.position.set(0, 1, 0);
        group.add(floor);
        this.myFloor = floor;

        group.add(new THREE.AmbientLight( 0xC9D3FF, 0.75 ));

        // warm light from sun
        var sunlight = new THREE.DirectionalLight( 0xFFF8D0, 0.85 );
        // cool light from sky
        //var skylight = new THREE.DirectionalLight( 0xC9D3FF, 0.1 );

        sunlight.position.set( 200, 100, 200 );
        //sunlight.rotation.set(Math.PI/2, Math.PI/2, 0);
        //light.position.multiplyScalar( 1.3 );

        sunlight.castShadow = true;

        sunlight.shadow.mapSize.width = 4096;
        sunlight.shadow.mapSize.height = 4096;

        var d = 100;

        sunlight.shadow.camera.left = - d;
        sunlight.shadow.camera.right = d;
        sunlight.shadow.camera.top = d;
        sunlight.shadow.camera.bottom = - d;

        sunlight.shadow.camera.far = 3000;

        this.setRenderObject(group);
        group.parent.add(sunlight);

        this.buildSkybox();
    }

    async buildSkybox()
    {
        const render = GetNamedView("ThreeRenderManager");

        const loader = new THREE.CubeTextureLoader();
        this.envTexture = loader.load([
            skybox_front_txt,
            skybox_back_txt,
            skybox_top_txt,
            skybox_bottom_txt,
            skybox_left_txt,
            skybox_right_txt,
        ]);
        render.scene.background = this.envTexture;
        console.log(this.myFloor);
        this.myFloor.material.envMap = this.envTexture;
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

        const render = GetNamedView("ThreeRenderManager");

        // create material with custom settings to apply to loaded model
        const material = new THREE.MeshStandardMaterial( {map: pawntxt,
            flatShading: false,
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 0.8,
            normalMap: pawnnrm,
            envMap: render.scene.background } );
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

        const render = GetNamedView("ThreeRenderManager");

        // create material with custom settings to apply to loaded model
        const material = new THREE.MeshStandardMaterial( {map: pawntxt,
            flatShading: false,
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 100,
            normalMap: pawnnrm,
            envMap: render.scene.background } );
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