import { Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, v3_scale, sphericalRandom, CachedObject, AM_Spatial, PM_Spatial, v3_add,
    m4_rotationQ, viewRoot } from "@croquet/worldcore-kernel";
import { PM_InstancedVisible, Material, InstancedDrawCall, PM_Visible, DrawCall, Cylinder, Cone, Cube, Sphere } from "@croquet/worldcore-webgl";
import { AM_RapierPhysics, RAPIER } from "@croquet/worldcore-rapier";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
// CubeSprayActor
//------------------------------------------------------------------------------------------

export class CubeSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return CubeSprayPawn}
    init(options) {
        this.index = Math.floor(Math.random() * 10);
        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());

        let cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);
    }

}
CubeSprayActor.register('CubeSprayActor');

//------------------------------------------------------------------------------------------
// CubeSprayPawn
//------------------------------------------------------------------------------------------

class CubeSprayPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.index, () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("cubeMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        const render = this.service("RenderManager");
        render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const modelRoot = viewRoot.model;
        const color = modelRoot.colors[this.actor.index];
        const mesh = Cube(1,1,1, color);

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

//------------------------------------------------------------------------------------------
// CylinderSprayActor
//------------------------------------------------------------------------------------------

export class CylinderSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return CylinderSprayPawn}
    init(options) {
        this.index = Math.floor(10 + Math.random() * 10);

        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());

        let cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(1.5);
        this.createCollider(cd);

    }

}
CylinderSprayActor.register('CylinderSprayActor');

//------------------------------------------------------------------------------------------
// CylinderSprayPawn
//------------------------------------------------------------------------------------------

class CylinderSprayPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("cylinderDrawCall" + this.actor.index, () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("cylinderMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        const render = this.service("RenderManager");
        render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const modelRoot = viewRoot.model;
        const color = modelRoot.colors[this.actor.index];
        const mesh = Cylinder(0.5, 1, 12, color);

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

//------------------------------------------------------------------------------------------
// BallSprayActor
//------------------------------------------------------------------------------------------

export class BallSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return BallSprayPawn}
    init(options) {
        this.index = Math.floor(20 + Math.random() * 10);

        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());

        let cd = RAPIER.ColliderDesc.ball(0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(2);
        this.createCollider(cd);

    }

}
BallSprayActor.register('BallSprayActor');

//------------------------------------------------------------------------------------------
// BallSprayPawn
//------------------------------------------------------------------------------------------

class BallSprayPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("ballDrawCall" + this.actor.index, () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("ballrMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        const render = this.service("RenderManager");
        render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const modelRoot = viewRoot.model;
        const color = modelRoot.colors[this.actor.index];
        const mesh = Sphere(0.5, 4, color);

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

//------------------------------------------------------------------------------------------
// ConeSprayActor
//------------------------------------------------------------------------------------------

export class ConeSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return ConeSprayPawn}
    init(options) {
        this.index = Math.floor(30 + Math.random() * 10);

        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());

        let cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(3);
        this.createCollider(cd);


    }

}
ConeSprayActor.register('ConeSprayActor');

//------------------------------------------------------------------------------------------
// ConeSprayPawn
//------------------------------------------------------------------------------------------

class ConeSprayPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("coneDrawCall" + this.actor.index, () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("coneMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        const render = this.service("RenderManager");
        render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {


        const modelRoot = viewRoot.model;
        const color = modelRoot.colors[this.actor.index];

        const mesh = Cone(0.5, 0.01, 1, 12, color);

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

//------------------------------------------------------------------------------------------
// FountainActor
//------------------------------------------------------------------------------------------

export class FountainActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    get pawn() {return FountainPawn}
    init(options) {
        super.init(options);
        this.spray = [];
        this.spawnLimit = 300;
        this.future(0).tick();

        this.createRigidBody(RAPIER.RigidBodyDesc.newStatic());

        let cd = RAPIER.ColliderDesc.cylinder(3, 1);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(1.5);
        this.createCollider(cd);

        this.subscribe("hud", "pause", this.pause);
    }

    pause(p) {
        this.isPaused = p;
    }

    tick() {
        if (!this.isPaused) {
            if (this.spray.length >= this.spawnLimit) {
                const doomed = this.spray.shift();
                doomed.destroy();
            }
            let p;
            const r = Math.random();
            const origin = v3_add(this.translation, [0,3,0]);
            if (r < 0.5) {
                p = CubeSprayActor.create({translation: origin});
            } else if (r < 0.7) {
                p = BallSprayActor.create({translation: origin});
            } else if (r < 0.9) {
                p = CylinderSprayActor.create({translation: origin});
            } else {
                p = ConeSprayActor.create({translation: origin});
            }
            const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
            const force = [0, 17.5 + 5 * Math.random(), 0];
            p.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
            p.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);

            this.spray.push(p);
        }
        this.future(250).tick();
    }

}
FountainActor.register('FountainActor');

export class FountainPawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);
        this.buildDraw();
    }

    buildDraw() {
        const mesh = this.buildMesh();
        const material = this.buildMaterial();
        const draw = new DrawCall(mesh, material);
        const render = this.service("RenderManager");
        render.scene.addDrawCall(draw);
        return draw;
    }

    buildMesh() {;
        const mesh = Cylinder(1, 6, 12, [0.3,0.3,0.3,1]);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'opaque';
        material.texture.loadFromURL(paper);
        return material;
    }
}

