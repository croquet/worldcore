import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_ThreeVisible, GetNamedView, v3_scale,
    ActorManager, RenderManager, UnitCube, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, RapierPhysicsManager, AM_RapierPhysics, LoadRapier, TAU, sphericalRandom, Triangles, CachedObject, AM_Spatial, m4_scaling, v3_transform, m4_rotationQ } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";
import * as THREE from 'three';

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

        const paperTexture = new THREE.TextureLoader().load( paper );

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
        this.setRenderObject(this.cube);
    }

    buildDraw() {
        const mesh = CachedObject("cubeMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const mesh = UnitCube();
        mesh.transform(m4_scaling(0.2));

        const modelRoot = GetNamedView('ViewRoot').model;
        const color = modelRoot.colors[this.actor.index];

        mesh.setColor(color);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

}
SprayPawn.register('SprayPawn');

//------------------------------------------------------------------------------------------
// FountainActor
//------------------------------------------------------------------------------------------

export class FountainActor extends mix(Actor).with(AM_Spatial) {
    init(options) {
        console.log("Creating fountain");
        super.init("Pawn", options);
        this.spray = [];
        this.spawnLimit = 50;
        this.future(0).tick();
    }

    tick() {
        if (this.spray.length >= this.spawnLimit) {
            const doomed = this.spray.shift();
            doomed.destroy();
        }
        const p = SprayActor.create({location: this.location});
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

