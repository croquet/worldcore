import { Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, v3_scale, UnitCube, Material, InstancedDrawCall, AM_RapierPhysics,
    sphericalRandom, CachedObject, AM_Spatial, v3_transform, m4_rotationQ } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
// SprayActor
//------------------------------------------------------------------------------------------

export class SprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {
        this.index = Math.floor(Math.random() * 30);

        super.init("SprayPawn", options);

        this.addRigidBody({type: 'dynamic'});
        this.addBoxCollider({
            size: [0.5, 0.5, 0.5],
            density: 1,
            friction: 1,
            restitution: 0.1
        });
    }

}
SprayActor.register('SprayActor');

//------------------------------------------------------------------------------------------
// SprayPawn
//------------------------------------------------------------------------------------------

class SprayPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.index, () => this.buildDraw()));
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
        // mesh.transform(m4_scaling(0.2));

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
        this.spawnLimit = 100;
        this.future(0).tick();

        this.subscribe("input", "dDown", this.pause);
        this.subscribe("input", "fDown", this.resume);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    tick() {
        if (!this.isPaused) {
            if (this.spray.length >= this.spawnLimit) {
                const doomed = this.spray.shift();
                doomed.destroy();
            }
            const p = SprayActor.create({translation: this.translation});
            const spin = v3_scale(sphericalRandom(),Math.random() * 1.5);
            const rotationMatrix = m4_rotationQ(this.rotation);
            const force = v3_transform([0, 18 + 5 * Math.random(), 0], rotationMatrix);
            // const force = v3_transform([0, 18, 0], rotationMatrix);
            p.applyTorqueImpulse(spin);
            p.applyImpulse(force);
            this.spray.push(p);
        }
        this.future(250).tick();
    }

}
FountainActor.register('FountainActor');

