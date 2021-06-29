import { DrawCall, Material, GetNamedView, Lines, GetNamedModel, v3_add, NamedView, GetViewRoot, viewRoot, ViewService } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- PathRender ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to the root view to display the nav mesh.

export class PathRender extends ViewService {
    constructor(model) {
        super("PathRender");

        this.mesh = new Lines();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.drawCall = new DrawCall(this.mesh, this.material);

        // const render = GetNamedView("ViewRoot").render;
        const render = this.viewRoot.render;
        render.scene.addDrawCall(this.drawCall);

        this.buildMesh();

        this.subscribe("paths", "newLevel", this.buildMesh);
        this.subscribe("paths", "changed", this.buildMesh);
    }

    destroy() {
        super.destroy();
        // const render = GetNamedView("ViewRoot").render;
        const render = this.viewRoot.render;
        if (render) render.scene.removeDrawCall(this.drawCall);
        this.mesh.destroy();
        this.material.destroy();
    }

    buildMesh() {
        this.mesh.clear();
        // const paths = GetNamedModel("Paths");
        const paths = this.viewRoot.model.paths;
        const color = [0,0,1,1];
        paths.waypoints.forEach( w => {
            const v0 = Voxels.toWorldXYZ(...v3_add(w.xyz, [0.5, 0.5, 1]));
            w.exits.forEach(key => {
                if (!key) return;
                const xyz = Voxels.unpackKey(key);
                const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [0.5, 0.5, 1]));
                this.mesh.addDebugLine(v0, v1, color);
            });
        });
        this.mesh.load();
        this.mesh.clear();
    }

}

//------------------------------------------------------------------------------------------
//-- RouteRender ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to the root view to display a path in the nav mesh.

export class RouteRender extends NamedView {

    constructor(model) {
        super("RouteRender", model);

        this.mesh = new Lines();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.drawCall = new DrawCall(this.mesh, this.material);

        // const render = GetNamedView("ViewRoot").render;
        const render = this.viewRoot.render;
        render.scene.addDrawCall(this.drawCall);

    }

    destroy() {
        super.destroy();
        // const render = GetNamedView("ViewRoot").render;
        const render = this.viewRoot.render;
        if (render) render.scene.removeDrawCall(this.drawCall);
        this.mesh.destroy();
        this.material.destroy();
    }

    setRoute(route) {
        this.mesh.clear();
        const color = [1,1,1,1];
        for (let i = 1; i < route.length; i++) {
            const key0 = route[i-1];
            const key1 = route[i];
            const xyz0 = Voxels.unpackKey(key0);
            const xyz1 = Voxels.unpackKey(key1);
            const v0 = Voxels.toWorldXYZ(...v3_add(xyz0, [0.5, 0.5, 1]));
            const v1 = Voxels.toWorldXYZ(...v3_add(xyz1, [0.5, 0.5, 1]));
            this.mesh.addDebugLine(v0, v1, color);
        }
        this.mesh.load();
        this.mesh.clear();
    }

}
