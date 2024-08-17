// Wide Wide World
//
// Croquet Studios, 2021

import { StartWorldcore, App, ModelRoot, ViewRoot, InputManager, v3_normalize } from "@croquet/worldcore-kernel";
import {  RenderManager } from "@croquet/worldcore-webgl";
import {  UIManager } from "@croquet/worldcore-widget";
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
import { WorldKeeper } from "./src/WorldKeeper";
import { RoadRender } from "./src/RoadRender";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [Voxels, Water, Surfaces, Stress, Paths, Props, Animals, RubbleMananger, WorldBuilder, WorldKeeper];
    }

    init(options, persisted) {
        super.init(options);
        if (!persisted) this.service("WorldBuilder").build();
        else this.service("WorldKeeper").restore(persisted);
    }

    // IGNORE THE BELOW, IT"S ONLY A HACK TO REVIVE WORLDS FROM AN OLD SNAPSHOT
    // BEFORE WE HAD THE WORLDKEEPER

    // Add "hashOverride=..." in the URL to resume an old snapshot.

    // old snapshots don't have the WorldKeeper, so we need to add it
    get keeper() {
        if (!this.service("WorldKeeper")) this.services.add(WorldKeeper.create());
        return this.service("WorldKeeper");
    }

    // to be called from a debugger
    // set a breakpoint in VM.executeOn's last call to get into the model context
    // type CROQUETVM.modelsByName.modelRoot.store()
    // the resulting JSON can be used later once we add file loading
    // to get worlds from Croquet to Multisynq (although, we would
    // implement saving too)
    store() {
        return this.keeper.store();
    }

    // The store() call above should create the keeper which will persist the world
    // after a minute. In case the fast-forward doesn't succeed, so the keeper's
    // future doesn't get called regularly, you can force the persistence
    // by calling this method.

    // Add ?forcePersist to the URL to force persistence without voting.
    // set a breakpoint in VM.executeOn's last call to get into the model context
    // then type CROQUETVM.modelsByName.modelRoot.forcePersist()
    // which will execute this method
    forcePersist() {
        // do the persist after proceeding in debugger
        this.keeper.future(0).persist();
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, RenderManager, UIManager, VoxelRender, GodView, Editor, VoxelCursor, RoadRender];
    }

    constructor(model) {
        super(model);

        const ui = this.service("UIManager");
        this.HUD = new HUD({parent:ui.root, autoSize: [1,1]});

        const render = this.service("RenderManager");
        render.setBackground([0.45, 0.8, 0.8, 1.0]);
        render.lights.setAmbientColor([0.6, 0.6, 0.6]);
        render.lights.setDirectionalColor([0.3, 0.3, 0.3]);
        render.lights.setDirectionalAim(v3_normalize([0.1,0.2,-1]));

        const ao = render.aoShader;
        if (ao) {
            ao.setRadius(0.1);
            ao.density = 0.5;
            ao.falloff = 1;
            ao.bias = 0.001;
        }

        this.subscribe("input", "qDown", () => {
            const isVisible = this.HUD.isVisible;
            this.HUD.set({visible: !isVisible});
        });

        this.subscribe("input", "fDown", () => {
            this.isFullScreen = !this.isFullScreen;
            const input = this.service("InputManager");
            if (this.isFullScreen) {
                input.enterFullscreen();
            } else {
                input.exitFullscreen();
            }
        });

    }

}

App.makeWidgetDock();
StartWorldcore({
    tps: 15,
    ...window.CROQUET_SESSION, // in index.html for easy editing
    model: MyModelRoot,
    view: MyViewRoot,
    // debug: "session"
})
