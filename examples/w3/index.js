// Wide Wide World
//
// Croquet Studios, 2021

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, UIManager, RenderManager, InputManager, v3_normalize } from "@croquet/worldcore";
import { Voxels } from "./src/Voxels";
import { Surfaces } from "./src/Surfaces";
import { Paths } from "./src/Paths";
import { VoxelRender } from "./src/VoxelRender";
import { VoxelCursor } from "./src/VoxelCursor";
import { Editor } from "./src/Editor";
import { HUD } from "./src/HUD";
import { GodView } from "./src/GodView";
import { PathRender, RoadDebugRender, RouteRender } from "./src/Debug";
import { Props } from "./src/Props";
import { Animals } from "./src/Animals";
import { RubbleMananger } from "./src/Rubble";
import { Stress } from "./src/Stress";
import { Water } from "./src/Water";
import { WorldBuilder } from "./src/WorldBuilder";
import { RoadRender } from "./src/RoadRender";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Start Model!");

        this.worldBuilder.build();

    }

    createServices() {
        super.createServices();
        this.voxels = this.addService(Voxels);
        this.water = this.addService(Water);
        this.surfaces = this.addService(Surfaces);
        this.stress = this.addService(Stress);
        this.paths = this.addService(Paths);
        this.props = this.addService(Props);
        this.animals = this.addService(Animals);
        this.rubble = this.addService(RubbleMananger);
        this.worldBuilder = this.addService(WorldBuilder);
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
        });

        this.subscribe("input", "fDown", () => {
            this.isFullScreen = !this.isFullScreen;
            if (this.isFullScreen) {
                this.input.enterFullscreen();
            } else {
                this.input.exitFullscreen();
            }
        });

    }

    createServices() {
        this.input = this.addService(InputManager);
        this.render = this.addService(RenderManager);
        this.voxelRender = this.addService(VoxelRender);
        // this.roadRender = this.addService(RoadRender);
        this.ui = this.addService(UIManager);
        this.godView = this.addService(GodView);
        this.editor = this.addService(Editor);
        this.voxelCursor = this.addService(VoxelCursor);
        this.roadDebug = this.addService(RoadDebugRender);
        super.createServices();
    }

}

async function go() {
    App.makeWidgetDock();

    const session = await Session.join({
        appId: 'io.croquet.w3',
        // name: 'w3',
        name: App.autoSession(),
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 20,
    });
}

go();
