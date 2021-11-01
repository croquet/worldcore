import {v3_add, viewRoot, ViewService } from "@croquet/worldcore-kernel";
import {DrawCall, Material, Lines} from "@croquet/worldcore-webgl"
import { Voxels } from "./Voxels";
import { RoadActor } from "./Props";

// Special renderers to help debug data sctructures.

//------------------------------------------------------------------------------------------
//-- PathRender ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to the root view to display the nav mesh.

export class PathRender extends ViewService {
    constructor() {
        super("PathRender");

        this.mesh = new Lines();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.drawCall = new DrawCall(this.mesh, this.material);

        const render = this.service("RenderManager");
        render.scene.addDrawCall(this.drawCall);

        this.buildMesh();

        this.subscribe("paths", "newLevel", this.buildMesh);
        this.subscribe("paths", "changed", this.buildMesh);
    }

    destroy() {
        super.destroy();
        const render = this.service("RenderManager");
        if (render) render.scene.removeDrawCall(this.drawCall);
        this.mesh.destroy();
        this.material.destroy();
    }

    buildMesh() {
        this.mesh.clear();
        const paths = this.modelService("Paths");
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

// Not updates to viewRoot

export class RouteRender extends ViewService {

    constructor(model) {
        super("RouteRender");

        this.mesh = new Lines();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.drawCall = new DrawCall(this.mesh, this.material);

        const render = viewRoot.render;
        render.scene.addDrawCall(this.drawCall);
    }

    destroy() {
        super.destroy();
        const render = this.service("RenderManager");
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

//------------------------------------------------------------------------------------------
//-- RoadDebugRender -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to the root view to display the road mesh.

export class RoadDebugRender extends ViewService {

    constructor() {
        super("RoadDebugRender");

        this.mesh = new Lines();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.drawCall = new DrawCall(this.mesh, this.material);

        const render = this.service("RenderManager");
        render.scene.addDrawCall(this.drawCall);

        this.buildMesh();
        this.subscribe("road", "add", this.buildMesh);
        this.subscribe("road", "delete", this.buildMesh);
    }

    destroy() {
        super.destroy();
        const render = this.service("RenderManager");
        if (render) render.scene.removeDrawCall(this.drawCall);
        this.mesh.destroy();
        this.material.destroy();
    }

    buildMesh() {
        this.mesh.clear();
        const props = this.modelService("Props");
        const color = [0,1,1,1];
        props.props.forEach( prop => {
            if (!(prop instanceof RoadActor)) return;
            const v0 = Voxels.toWorldXYZ(...v3_add(prop.xyz, [0.5, 0.5, 0]));
            const v1 = v3_add(v0, [0, 0, 5]);
            this.mesh.addDebugLine(v0, v1, color);

            prop.exits.forEach((exit,n) => {
                if (!exit ) return;
                let v2;
                switch(n) {
                    case 0:
                        v2 = v3_add(v1, [0,1,0]);
                        break;
                    case 1:
                        v2 = v3_add(v1, [1,0,0]);
                        break;
                    case 2:
                        v2 = v3_add(v1, [0,-1,0]);
                        break;
                    case 3:
                        v2 = v3_add(v1, [-1,0,0]);
                        break;
                    case 4:
                        v2 = v3_add(v1, [0,0,-1]);
                        break;
                    case 5:
                        v2 = v3_add(v1, [0,0,-1]);
                        break;
                    case 6:
                        v2 = v3_add(v1, [1,1,0]);
                        break;
                    case 7:
                        v2 = v3_add(v1, [1,-1,0]);
                        break;
                    case 8:
                        v2 = v3_add(v1, [-1,-1,0]);
                        break;
                    case 9:
                        v2 = v3_add(v1, [-1,1,0]);
                        break;
                    default:
                }
                this.mesh.addDebugLine(v1, v2, color);
            });
        });
        this.mesh.load();
        this.mesh.clear();
    }
}
