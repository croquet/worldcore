// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, v3_scale, AM_Avatar, PM_Avatar,
    ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, RapierPhysicsManager, AM_RapierPhysics, LoadRapier, TAU, sphericalRandom, Triangles, CachedObject, q_multiply, q_euler, m4_rotationQ, v3_transform, ToDeg, PM_Spatial, AM_Spatial, KeyDown, AM_MouselookAvatar, PM_MouselookAvatar, PM, q_lookAt, v3_rotate, v3_normalize } from "@croquet/worldcore";
import paper from "./assets/paper.jpg";
import { Surfaces } from "./src/Surfaces";
import { TerrainRender } from "./src/TerrainRender";
import { Voxels } from "./src/Voxels";
import { PickBase, PickEmptyVoxel, PickSolidVoxel } from "./src/VoxelRaycast";
import { VoxelCursor } from "./src/VoxelCursor";
import { HUD } from "./src/HUD";
import { GodView } from "./src/GodView";


//------------------------------------------------------------------------------------------
// FloorActor
//------------------------------------------------------------------------------------------

class FloorActor extends mix(Actor).with(AM_Spatial) {
    init() {
        super.init("FloorPawn");
    }
}
FloorActor.register('FloorActor');

//------------------------------------------------------------------------------------------
// FloorPawn
//------------------------------------------------------------------------------------------

class FloorPawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);

        const c =  [0.6,0.6,0.6,1];

        this.mesh = new Triangles();
        this.mesh.addFace([[-50, 0, -50], [-50, 0, 50], [50, 0, 50], [50, 0, -50]], [c,c,c,c], [[0,0], [25,0], [25,25], [0,25]]);
        this.mesh.load();
        this.mesh.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.setDrawCall(new DrawCall(this.mesh, this.material));
    }
}
FloorPawn.register('FloorPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting quub!!!");
        this.voxels = Voxels.create();
        this.voxels.set(4,4,1,5);
        this.voxels.set(5,4,1,5);
        this.voxels.set(6,4,1,6);
        this.voxels.set(8,4,1,5);
        this.voxels.set(9,4,1,7);
        this.surfaces = Surfaces.create();

        // console.log(this.surfaces);

        // FloorActor.create();
    }


    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        // this.phyicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 50}));
        this.actorManager = this.addManager(ActorManager.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

let topLayer = Voxels.sizeZ;

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);
        this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        this.render.lights.setDirectionalColor([0.4, 0.4, 0.4]);
        this.render.lights.setDirectionalAim(v3_normalize([0.1,0.2,-1]));

        const ao = this.render.aoShader;
        if (ao) {
            ao.count = 16;
            ao.setRadius(0.4);
            ao.density = 1;
            ao.falloff = 0.7;
        }

    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.terrainRender = this.addManager(new TerrainRender());
        this.voxelCursor = this.addManager(new VoxelCursor());
        this.ui = this.addManager(new UIManager());
        this.hud = this.addManager(new HUD(this.ui.root));
        this.godView = this.addManager(new GodView());
        this.pawnManager = this.addManager(new PawnManager());
    }

    setTopLayer(top) {
        topLayer = Math.max(1, Math.min(Voxels.sizeZ, top));
    }

    get topLayer() {
        return topLayer;
    }

}


async function go() {
    // await LoadRapier();
    App.makeWidgetDock();
    // const session = await Session.join(`wctest-${App.autoSession("q")}`, MyModelRoot, MyViewRoot, {tps: "60"});
    const session = await Session.join(`quub`, MyModelRoot, MyViewRoot, {tps: "60"});
}

go();
