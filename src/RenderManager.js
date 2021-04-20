import { MainDisplay, Scene, Camera, Lights, GeometryBuffer, Framebuffer, SharedStencilFramebuffer, GetGLVersion, SetGLCamera, SetGLPipeline, StartStencilCapture, EndStencil, StartStencilApply } from "./Render";
import { BasicShader, DecalShader, TranslucentShader, InstancedShader, GeometryShader, InstancedGeometryShader, TranslucentGeometryShader, PassthruShader, BlendShader, AOShader, InstancedDecalShader } from "./Shaders";
import { NamedView, GetNamedView } from "./NamedView";
import {toRad, m4_identity, m4_multiply } from "./Vector";


//------------------------------------------------------------------------------------------
//-- Visible Mixin -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Visible pawns have a mesh and a material and they handle inserting and removing themselves
// from the scene. They should only be used with a companion mixin that has the method "global" that
// supplies them with a 4x4 transform. Make sure the companion mixim is added first so it will
// be updated first.
//
// Note that destroying a pawn will not clean up the mesh and the material because they may be
// used by multiple pawns.

export const PM_Visible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        if (this.draw) GetNamedView('RenderManager').scene.removeDrawCall(this.draw);
    }

    refresh() {
        super.refresh();

        if (this.draw) this.draw.transform.set(this.global);
    }

    setDrawCall(draw) {
        const scene = GetNamedView('RenderManager').scene;
        if (this.draw) scene.removeDrawCall(this.draw);
        this.draw = draw;
        if (this.draw) {
            this.draw.transform.set(this.global);
            scene.addDrawCall(this.draw);
        }

    }

};

//------------------------------------------------------------------------------------------
//-- InstancedVisible ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Special version of instanced that uses an instanced mesh. Note that destroy does not
// remove the draw call from the scene, it just removes the transform for this instance.


export const PM_InstancedVisible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        if (this.draw) this.draw.instances.delete(this.actor.id);
    }

    refresh() {
        super.refresh();
        // console.log('ddd');
        // console.log(this.draw);
        // console.log(this.global);
        if (this.draw) this.draw.instances.set(this.actor.id, this.global);
    }

    setDrawCall(draw) {
        const scene = GetNamedView('ViewRoot').render.scene;
        //if (this.draw) scene.removeDrawCall(this.draw);
        this.draw = draw;
        if (this.draw) {
            this.draw.instances.set(this.actor.id, this.global);
            scene.addDrawCall(this.draw);
        }

        // if (this.draw) scene.addDrawCall(this.draw);
    }

}

//------------------------------------------------------------------------------------------
//-- Camera Mixin --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Camera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        const render = GetNamedView("RenderManager");
        if (this.isMyPlayerPawn && render) {
            render.camera.setLocation(this.lookGlobal);
            render.camera.setProjection(toRad(60), 1.0, 10000.0);
        }
    }

    refresh() {
        super.refresh();
        const render = GetNamedView("RenderManager");
        if (!this.isMyPlayerPawn && render) return;

        render.camera.setLocation(this.lookGlobal);
    }

};

//------------------------------------------------------------------------------------------
//-- RenderManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

export class RenderManager extends NamedView {
    constructor(model) {
        super("RenderManager", model);
        SetGLPipeline(this);
        this.display = new MainDisplay();
        this.buildBuffers();
        this.buildShaders();
        this.setScene(new Scene());
        this.setCamera(new Camera());
        this.setLights(new Lights());
        this.setBackground([0,0.3,0.5,1]);
    }

    destroy() {
        this.display.destroy();
        if (this.geometryBuffer) this.geometryBuffer.destroy();
        if (this.aoBuffer) this.aoBuffer.destroy();
        if (this.composeBuffer) this.composeBuffer.destroy();
    }

    buildBuffers() {
        if (GetGLVersion()  === 0) return;
        this.geometryBuffer = new GeometryBuffer({autoResize: 1});
        this.aoBuffer = new Framebuffer({autoResize: 0.5});
        this.composeBuffer = new SharedStencilFramebuffer(this.geometryBuffer);
        this.composeBuffer.setBackground([1,1,1,1]);
    }

    buildShaders() {
        if (GetGLVersion()  === 0) {
            this.basicShader = new BasicShader();
            this.decalShader = new DecalShader();
            this.translucentShader = new TranslucentShader();
        } else {
            this.instancedShader = new InstancedShader();
            this.decalShader = new DecalShader();
            this.instancedDecalShader = new InstancedDecalShader();
            this.translucentShader = new TranslucentShader();

            this.geometryShader = new GeometryShader();
            this.instancedGeometryShader = new InstancedGeometryShader();
            this.translucentGeometryShader = new TranslucentGeometryShader();
            this.passthruShader = new PassthruShader();
            this.blendShader = new BlendShader();
            this.aoShader = new AOShader();
        }
    }

    setLights(lights) {
        this.lights = lights;
    }

    setCamera(camera) {
        SetGLCamera(camera);
        this.camera = camera;
        if (GetGLVersion() === 0) {
            this.display.setCamera(camera);
        } else {
            this.geometryBuffer.setCamera(camera);
        }
    }

    // Updates shaders that depend on the camera FOV.
    updateFOV() {
        if (this.aoShader) this.aoShader.setFOV(this.camera.fov);
    }

    setBackground(background) {
        this.background = background;
        this.display.setBackground(background);
        if (GetGLVersion()  > 0) this.geometryBuffer.setBackground(background);
    }

    setScene(scene) {
        this.scene = scene;
    }

    update() {
        this.draw();
    }

    draw() {
        if (!this.scene) return;
        if (GetGLVersion()  === 0) {
            this.drawForward();
        } else {
            this.drawDeferred();
        }
    }

    drawDeferred() {

        // Geometry Pass

        this.geometryBuffer.start();

        StartStencilCapture();

        this.geometryShader.apply();
        this.lights.apply();
        this.camera.apply();
        this.scene.drawPass('opaque');

        this.instancedGeometryShader.apply();
        this.lights.apply();
        this.camera.apply();
        this.scene.drawPass('instanced');

        EndStencil();

        this.translucentGeometryShader.apply();
        this.camera.apply();
        this.scene.drawPass('translucent');

        // Lighting Pass

        this.aoBuffer.start();
        this.aoShader.apply();
        this.geometryBuffer.normal.apply(0);
        this.geometryBuffer.position.apply(1);
        this.aoBuffer.draw();

        StartStencilApply();

        this.composeBuffer.start(); // The ao pass leaves the sky black. This uses the stencil to make the sky white.
        this.passthruShader.apply();
        this.aoBuffer.texture.apply(0);
        this.composeBuffer.draw();

        EndStencil();

        this.display.start();
        this.blendShader.apply();
        this.geometryBuffer.diffuse.apply(0);
        this.composeBuffer.texture.apply(1);
        this.display.draw();
    }

    drawForward() {
        this.display.start();

        this.decalShader.apply();
        this.lights.apply();
        this.camera.apply();
        this.scene.drawPass('opaque');

        this.lights.apply();
        this.camera.apply();
        this.scene.drawPass('instanced');

        this.translucentShader.apply();
        this.camera.apply();
        this.scene.drawPass('translucent');
    }
}
