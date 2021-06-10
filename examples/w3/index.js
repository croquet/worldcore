// Wide Wide World
//
// Croquet Studios, 2021

import { Session} from "@croquet/croquet";
import { ModelRoot, ViewRoot, UIManager, q_axisAngle, toRad, m4_scalingRotationTranslation,
    ActorManager, RenderManager, PawnManager, PlayerManager, InputManager, v3_normalize, Triangles, Material, DrawCall } from "@croquet/worldcore";
import { Voxels } from "./src/Voxels";
import { Surfaces } from "./src/Surfaces";
import { Paths } from "./src/Paths";
import { VoxelRender } from "./src/VoxelRender";
import { VoxelCursor } from "./src/VoxelCursor";
import { Editor } from "./src/Editor";
import { HUD } from "./src/HUD";
import { GodView } from "./src/GodView";
import { PathRender, RouteRender } from "./src/Debug";
import { Plants } from "./src/Plants";
import { Animals } from "./src/Animals";
import { RubbleManager } from "./src/Rubble";
import { Stress } from "./src/Stress";
import { Water } from "./src/Water";
import { WaterRender } from "./src/WaterRender";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Start Model!!");

        this.voxels.generate();

    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.actorManager = this.addManager(ActorManager.create());
        this.voxels = this.addManager(Voxels.create());
        this.water = this.addManager(Water.create());
        this.surfaces = this.addManager(Surfaces.create());
        this.stress = this.addManager(Stress.create());
        this.paths = this.addManager(Paths.create());
        this.plants = this.addManager(Plants.create());
        this.animals = this.addManager(Animals.create());
        this.rubbleManager = this.addManager(RubbleManager.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.HUD = new HUD(this.ui.root, {autoSize: [1,1], visible: true});

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);
        this.render.lights.setAmbientColor([0.6, 0.6, 0.6]);
        this.render.lights.setDirectionalColor([0.3, 0.3, 0.3]);
        this.render.lights.setDirectionalAim(v3_normalize([0.1,0.2,-1]));

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.1);
            ao.density = 0.5;
            ao.falloff = 1;
        }

        this.subscribe("input", "qDown", () => {
            const isVisible = this.HUD.isVisible;
            this.HUD.set({visible: !isVisible});
        })

    }

    createManagers() {
        this.input = this.addManager(new InputManager(this.model));
        this.render = this.addManager(new RenderManager(this.model));
        this.voxelRender = this.addManager(new VoxelRender(this.model));
        // this.waterRender = this.addManager(new WaterRender(this.model));
        this.ui = this.addManager(new UIManager(this.model));

        this.godView = this.addManager(new GodView(this.model));
        this.editor = this.addManager((new Editor(this.model)));
        // this.pathRender = this.addManager(new PathRender(this.model));
        // this.routeRender = this.addManager(new RouteRender(this.model));
        this.pawnManager = this.addManager(new PawnManager(this.model));
        this.voxelCursor = this.addManager(new VoxelCursor(this.model)); // Add this after the pawn manager to prevent GL error with water & cursor transparencies?
    }

}

async function go() {

    const session = await Session.join({
        appId: 'io.croquet.w3',
        name: 'w3',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 20,
    });
}

go();
