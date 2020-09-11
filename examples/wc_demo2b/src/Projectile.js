import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, v3_scale,
    ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, RapierPhysicsManager, AM_RapierPhysics, LoadRapier, TAU, sphericalRandom, Triangles, CachedObject, m4_scaling } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
// ProjectileActor
//------------------------------------------------------------------------------------------

export class ProjectileActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {

        this.owner = options.owner;
        this.color = options.color;

        super.init("ProjectilePawn", options);

        this.addRigidBody({type: 'dynamic'});
        this.addBoxCollider({
            size: [0.1, 0.1, 0.1],
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

class ProjectilePawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.owner, () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("cubeMesh" + this.actor.owner, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const mesh = UnitCube();
        mesh.transform(m4_scaling(0.2));

        const modelRoot = GetNamedView('ViewRoot').model;
        // console.log(this.actor.color);
        const color = this.actor.color;

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
ProjectilePawn.register('ProjectilePawn');
