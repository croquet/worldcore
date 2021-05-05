// Wide Wide World
//
// Croquet Studios, 2021

import { Session} from "@croquet/croquet";
import { ModelRoot, ViewRoot, UIManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    ActorManager, RenderManager, PM_Visible, Material, DrawCall, PawnManager, PlayerManager, Triangles, AM_Spatial, PM_Spatial,InputManager, Sphere, Cube, v3_normalize } from "@croquet/worldcore";
import { Voxels } from "./src/Voxels";
import paper from "./assets/paper.jpg";import { Surfaces } from "./src/Surfaces";
import { VoxelRender } from "./src/VoxelRender";
import { Cursor } from "./src/Cursor";
import { Editor } from "./src/Editor";


//------------------------------------------------------------------------------------------
// FloorActor
//------------------------------------------------------------------------------------------

class FloorActor extends mix(Actor).with(AM_Spatial) {
    init(options) {
        super.init("FloorPawn", options);
    }
}
FloorActor.register('FloorActor');

//------------------------------------------------------------------------------------------
// FloorPawn
//------------------------------------------------------------------------------------------

class FloorPawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);

        const c =  [0.6,1,0.6,1];

        // this.mesh = new Triangles();
        // this.mesh = Sphere(0.5, 8, [1, 1, 1, 1]);
        this.mesh = Cube(1,1,1,[1, 1, 1, 1]);
        // this.mesh.addFace([[-1, -1, -10], [1, -1, -10], [1, 1, -10], [-1, 1, -10]], [c,c,c,c], [[0,0], [1,0], [1,1], [0,1]]);
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
        console.log("Start Model!");
        // FloorActor.create();
        this.voxels = Voxels.create();
        this.voxels.generate();
        this.surfaces = Surfaces.create();
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.actorManager = this.addManager(ActorManager.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);
        // this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        // this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        // this.render.lights.setDirectionalAim([0.2,-1,0.1]);

        this.render.lights.setAmbientColor([0.6, 0.6, 0.6]);
        this.render.lights.setDirectionalColor([0.3, 0.3, 0.3]);
        this.render.lights.setDirectionalAim(v3_normalize([0.1,0.2,-1]));

        const cameraMatrix = m4_scalingRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(45)), [0,-50,50]);
        this.render.camera.setLocation(cameraMatrix);
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.1);
            ao.density = 0.5;
            ao.falloff = 1;
        }

    }

    createManagers() {
        this.input = this.addManager(new InputManager(this.model));
        this.render = this.addManager(new RenderManager(this.model));
        this.voxelRender = this.addManager(new VoxelRender(this.model));
        this.ui = this.addManager(new UIManager(this.model));
        this.cursor = this.addManager(new Cursor(this.model));
        this.editor = this.addManager((new Editor(this.model)));
        this.pawnManager = this.addManager(new PawnManager(this.model));
    }

}


async function go() {

    const session = await Session.join({
        appId: 'io.croquet.wctest',
        name: 'test',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 15,
    });
}

go();
