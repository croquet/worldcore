import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, PM_ThreeVisible, Triangles, Material, DrawCall, AM_RapierPhysics, q_axisAngle } from "@croquet/worldcore";
import { FountainActor } from "./Fountain";
import paper from "../assets/paper.jpg";
import * as THREE from 'three';

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

        this.fountain0 = FountainActor.create({location: [-3,1.5,0]});
        this.fountain1 = FountainActor.create({location: [3,1.5,0], rotation: q_axisAngle([0,1,0], Math.PI)});

    }

    destroy() {
        super.destroy();
        this.fountain0.destroy();
        this.fountain1.destroy();
    }
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        console.log("Building level pawn");

        /*
        const c = [0.5, 0.5, 0.5, 1];

        this.ground = new Triangles();
        this.ground.addFace([[-20,1,20], [20,1,20], [20,1,-20], [-20,1,-20]], [c,c,c,c], [[0,0], [20,0], [20,20], [0,20]]);

        this.ground.load();
        this.ground.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.draw = new DrawCall(this.ground, this.material);

        this.setDrawCall(this.draw);
        */

       let group = new THREE.Group();
       /*let cubeTexture = new THREE.TextureLoader().load( uv_grid );
       let floorTexture = new THREE.TextureLoader().load( grass );

       floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
       floorTexture.repeat.set(25,25);
       floorTexture.anisotropy = 16;
       floorTexture.encoding = THREE.sRGBEncoding;
*/
        const paperTexture = new THREE.TextureLoader().load( paper );

        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(1,3);
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
