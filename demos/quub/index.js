// World Core Quub
//
// Croquet Studios, 2020

import { ModelRoot, ViewRoot, InputManager, StartWorldcore, v3_normalize, App} from "@croquet/worldcore-kernel";
import { RenderManager } from "@croquet/worldcore-webgl";
import { UIManager } from "@croquet/worldcore-widget";
import { Surfaces } from "./src/Surfaces";
import { TerrainRender } from "./src/TerrainRender";
import { Voxels } from "./src/Voxels";
import { VoxelCursor } from "./src/VoxelCursor";
import { HUD } from "./src/HUD";
import { GodView } from "./src/GodView";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    init(_options, persistedData) {
        super.init(_options);

        this.voxels = Voxels.create(persistedData);
        this.surfaces = Surfaces.create();

        this.autoSave();    // will init the hash, but won't be uploaded
    }

    autoSave() {
        this.persistSession(() => this.voxels.toPersistentVoxels());
        this.future(60000).autoSave();
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

let topLayer = Voxels.sizeZ;

export function SetTopLayer(n) { topLayer = n }
export function GetTopLayer(n) { return topLayer }

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, RenderManager, TerrainRender, VoxelCursor, UIManager, GodView];
    }

    constructor(model) {
        super(model);

        const ui = this.service("UIManager");

        this.hud = new HUD({parent: ui.root});

        const render = this.service("RenderManager");
        render.setBackground([0.45, 0.8, 0.8, 1.0]);
        render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        render.lights.setDirectionalColor([0.4, 0.4, 0.4]);
        render.lights.setDirectionalAim(v3_normalize([0.1,0.2,-1]));

        const ao = render.aoShader;
        if (ao) {
            ao.count = 16;
            ao.setRadius(0.4);
            ao.density = 1;
            ao.falloff = 0.7;
        }

    }

    setTopLayer(top) {
        topLayer = Math.max(1, Math.min(Voxels.sizeZ, top));
    }

    get topLayer() {
        return topLayer;
    }

}

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.quub',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: App.autoSession(),
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 0 // No heartbeat ticks
});
