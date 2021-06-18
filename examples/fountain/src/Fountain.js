import { Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, v3_scale, UnitCube, Material, InstancedDrawCall, AM_RapierPhysics,
    sphericalRandom, CachedObject, AM_Spatial, PM_Spatial, PM_Visible, DrawCall, v3_transform, v3_add, m4_rotationQ, m4_rotationY, m4_rotationX, m4_translation, Cylinder, Cone, Cube, Sphere, toRad } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
// CubeSprayActor
//------------------------------------------------------------------------------------------

export class CubeSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return CubeSprayPawn}
    init(options) {
        this.index = Math.floor(Math.random() * 10);

        super.init(options);

        this.addRigidBody({type: 'dynamic'});

        this.addBoxCollider({
            size: [0.5, 0.5, 0.5],
            density: 1,
            friction: 1,
            restitution: 0.5
        });

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

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const modelRoot = GetNamedView('ViewRoot').model;
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
// CubeSprayPawn.register('CubeSprayPawn');

//------------------------------------------------------------------------------------------
// CylinderSprayActor
//------------------------------------------------------------------------------------------

export class CylinderSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return CylinderSprayPawn}
    init(options) {
        this.index = Math.floor(10 + Math.random() * 10);

        super.init(options);

        this.addRigidBody({type: 'dynamic'});

        this.addCylinderCollider({
            radius: 0.5,
            halfHeight: 0.5,
            density: 1.5,
            friction: 1,
            restitution: 0.5
        });

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

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const modelRoot = GetNamedView('ViewRoot').model;
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
// CylinderSprayPawn.register('CylinderSprayPawn');

//------------------------------------------------------------------------------------------
// BallSprayActor
//------------------------------------------------------------------------------------------

export class BallSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return BallSprayPawn}
    init(options) {
        this.index = Math.floor(20 + Math.random() * 10);

        super.init(options);

        this.addRigidBody({type: 'dynamic'});

        this.addBallCollider({
            radius: 0.5,
            density: 2,
            friction: 1,
            restitution: 0.5
        });

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

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const modelRoot = GetNamedView('ViewRoot').model;
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
// BallSprayPawn.register('BallSprayPawn');

//------------------------------------------------------------------------------------------
// ConeSprayActor
//------------------------------------------------------------------------------------------

export class ConeSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    get pawn() {return ConeSprayPawn}
    init(options) {
        this.index = Math.floor(30 + Math.random() * 10);

        super.init(options);

        this.addRigidBody({type: 'dynamic'});

        this.addConeCollider({
            radius: 0.5,
            halfHeight: 0.5,
            density: 3,
            friction: 1,
            restitution: 0.5
        });


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

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {


        const modelRoot = GetNamedView('ViewRoot').model;
        const color = modelRoot.colors[this.actor.index];

        const mesh = Cone(0.5, 0.01, 1, 12, color);

        // mesh.setColor(color);
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
// ConeSprayPawn.register('ConeSprayPawn');

//------------------------------------------------------------------------------------------
// FountainActor
//------------------------------------------------------------------------------------------

export class FountainActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    get pawn() {return FountainPawn}
    init(options) {
        super.init(options);
        this.spray = [];
        this.spawnLimit = 100;
        this.future(0).tick();

        this.addRigidBody({type: 'static'});

        this.addCylinderCollider({
            radius: 1,
            halfHeight: 3,
            density: 1,
            friction: 1,
            restitution: 0.5
        });

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
            const rotationMatrix = m4_rotationQ(this.rotation);
            //const force = v3_transform([0, 18 + 5 * Math.random(), 0], rotationMatrix);
            const force = [0, 17.5 + 5 * Math.random(), 0];
            p.applyTorqueImpulse(spin);
            p.applyImpulse(force);
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
        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);
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
// FountainPawn.register('FountainPawn');

