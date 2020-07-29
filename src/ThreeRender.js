import { NamedView, GetNamedView } from "./NamedView";


//------------------------------------------------------------------------------------------
//-- ThreeVisible Mixin -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// This is the interface for a pawn to manage its Three.js render model.

export const PM_ThreeVisible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        const render = GetNamedView("ThreeRenderManager");
        // Put code here to destroy the model in the render manager.
    }

    refresh() {
        super.refresh();
        const render = GetNamedView("ThreeRenderManager");
        // Put code here to update the 4x4 transform of the model in the render manager.
    }

    createRenderModel(model) {
        const render = GetNamedView("ThreeRenderManager");
        // Put code here to instantiate the model in the three render manager.
        // You probably also want to the set the transform to this.global
    }

};

export const PM_TheeeCamera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        if (this.isMine) {
            const render = GetNamedView("ThreeRenderManager");
            // Put code here to initialize the camera transform to this.global
        }
    }

    refresh() {
        super.refresh();
        if (!this.isMine) return;
        const render = GetNamedView("ThreeRenderManager");
        // Put code to to update the camera transform in the render manager when this.global changes.

    }


};

//------------------------------------------------------------------------------------------
//-- ThreeRenderManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

export class ThreeRenderManager extends NamedView {
    constructor() {
        super("ThreeRenderManager");
        // Put code here to initialize the three.js renderer.
    }

    destroy() {
        // Put code here to shut down the three.js renderer
    }

    update() {
        // This gets called every frame. This is where you draw the whole scene.
    }

}
