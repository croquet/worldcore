import { Triangles, Lines, v3_add, v3_multiply, Material, DrawCall, ViewService, GetModelService } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { GetTopLayer } from "../index";
import paper from "../assets/paper.jpg";
import stripe from "../assets/stripe50.png";
import { Colors } from "./Colors";

// There are four categories of terrain geometry:
//
//  * Top -- The ceiling of an air voxel (if there's a solid voxel above)
//  * Middle -- The walls of an air voxel (if there are adjacent solid voxels) + those parts of the floor that aren't at z = 0
//  * Bottom -- The floor of an air voxel at z = 0 (if there's a solid voxel below)
//  * Interior -- The flat plane between two solid voxels
//
// The terrain is broken out like this so that we can easily render different slices through the terrain. The rules for when
// to draw each category are contained in ExteriorMesh and InteriorMesh.

//--------------------------------------------------------------------------------
//-- TerrainRender ---------------------------------------------------------------
//--------------------------------------------------------------------------------

// Top level class that manages the exterior and interior terrain meshes and their
// corresponding draw calls.

export class TerrainRender extends ViewService {
    constructor() {
        super("TerrainRender");
        const render = this.service("WebGLRenderManager");
        // const render = GetNamedView("ViewRoot").render;

        this.exteriorMaterial = new Material();
        this.exteriorMaterial.texture.loadFromURL(paper);
        this.exteriorMesh = new ExteriorMesh();
        this.exteriorDrawCall = new DrawCall(this.exteriorMesh, this.exteriorMaterial);
        render.scene.addDrawCall(this.exteriorDrawCall);

        this.interiorMaterial = new Material();
        this.interiorMaterial.texture.loadFromURL(paper);
        this.interiorMaterial.decal.loadFromURL(stripe);
        this.interiorMesh = new InteriorMesh();
        this.interiorDrawCall = new DrawCall(this.interiorMesh, this.interiorMaterial);
        render.scene.addDrawCall(this.interiorDrawCall);

        this.baseMaterial = new Material();
        this.baseMaterial.texture.loadFromURL(paper);
        this.baseMesh = new BasePlate();
        this.baseDrawCall = new DrawCall(this.baseMesh, this.baseMaterial);
        render.scene.addDrawCall(this.baseDrawCall);

        this.rebuildAll();

        this.subscribe("surfaces", "newLevel", () => this.rebuildAll());
        this.subscribe("surfaces", "changed", data => this.rebuildLocal(data.add, data.remove));
    }

    destroy() {
        super.destroy();
        const render = this.service("WebGLRenderManager");
        // const render = GetNamedView("ViewRoot").render;

        this.exteriorMaterial.destroy();
        this.exteriorMesh.destroy();
        if (render) render.scene.removeDrawCall(this.exteriorDrawCall);

        this.interiorMaterial.destroy();
        this.interiorMesh.destroy();
        if (render) render.scene.removeDrawCall(this.interiorDrawCall);
    }

    rebuildAll() {
        this.exteriorMesh.rebuild();
        this.interiorMesh.rebuild();
    }

    rebuildLocal(add, remove) {
        this.exteriorMesh.rebuildLocal(add, remove);
        this.interiorMesh.rebuildLocal(add, remove);
    }

}

//--------------------------------------------------------------------------------
//-- ExteriorMesh ----------------------------------------------------------------
//--------------------------------------------------------------------------------

// Holds the geometry for all the externally visible surfaces of the terrain.

class ExteriorMesh {
    constructor() {
        this.topLayers = [Voxels.sizeZ];
        this.middleLayers = [Voxels.sizeZ];
        this.bottomLayers = [Voxels.sizeZ];
        for (let z = 0; z < Voxels.sizeZ; z++) {
            this.topLayers[z] = new TopLayer(z);
            this.middleLayers[z] = new MiddleLayer(z);
            this.bottomLayers[z] = new BottomLayer(z);
        }
    }

    destroy() {
        this.topLayers.forEach(layer=>layer.destroy());
        this.middleLayers.forEach(layer=>layer.destroy());
        this.bottomLayers.forEach(layer=>layer.destroy());
    }

    clear() {
        this.topLayers.forEach(layer=>layer.clear());
        this.middleLayers.forEach(layer=>layer.clear());
        this.bottomLayers.forEach(layer=>layer.clear());
    }

    layerZ(id) {
        return id & 0x3FF;
    }

    addID(id) {
        const z = this.layerZ(id);
        this.topLayers[z].addID(id);
        this.middleLayers[z].addID(id);
        this.bottomLayers[z].addID(id);
    }

    removeID(id) {
        const z = this.layerZ(id);
        this.topLayers[z].removeID(id);
        this.middleLayers[z].removeID(id);
        this.bottomLayers[z].removeID(id);
    }

    rebuild() {
        this.clear();
        const surfaces = GetModelService("Surfaces");
        surfaces.surfaces.forEach((surface,id) => this.addID(id));
    }

    rebuildLocal(add, remove) {
        remove.forEach(id => this.removeID(id));
        add.forEach(id => this.addID(id));
    }

    draw() {
        // const top = GetNamedView("ViewRoot").topLayer;
        const top = GetTopLayer();
        if (top < Voxels.sizeZ) this.bottomLayers[top].draw();
        for (let i = top-1; i >= 0; i--) {
            this.middleLayers[i].draw();
            this.bottomLayers[i].draw();
        }
        for (let i = top-2; i >=0; i--) {
            this.topLayers[i].draw();
        }

    }
}

//--------------------------------------------------------------------------------
//-- InteriorMesh ----------------------------------------------------------------
//--------------------------------------------------------------------------------

// Holds the geometry for the hidden surfaces of the terrain that are only
// visible when the players is looking at a horizonatal slice.

class InteriorMesh {
    constructor() {
        this.interiorLayers = [Voxels.sizeZ];
        for (let z = 0; z < Voxels.sizeZ; z++) {
            this.interiorLayers[z] = new InteriorLayer(z);
        }
    }

    destroy() {
        this.interiorLayers.forEach(layer=>layer.destroy());
    }

    clear() {
        this.interiorLayers.forEach(layer=>layer.clear());
    }

    layerZ(id) {
        return id & 0x3FF;
    }

    addID(id) {
        const z = this.layerZ(id);
        this.interiorLayers[z].addID(id);
    }

    removeID(id) {
        const z = this.layerZ(id);
        this.interiorLayers[z].removeID(id);
    }

    rebuild() {
        this.clear();
        const surfaces = GetModelService("Surfaces");
        // const surfaces = GetNamedView("ViewRoot").model.surfaces;
        surfaces.surfaces.forEach((surface,id) => this.addID(id));
    }

    rebuildLocal(add, remove) {
        remove.forEach(id => this.removeID(id));
        add.forEach(id => this.addID(id));
    }

    draw() {
        // const top = GetNamedView("ViewRoot").topLayer;
        const top = GetTopLayer();
        if (top === Voxels.sizeZ) return;
        this.interiorLayers[top].draw();
    }
}

//--------------------------------------------------------------------------------
//-- Layer -----------------------------------------------------------------------
//--------------------------------------------------------------------------------

// Layers hold horizontal slices through the terrain.

class Layer {
    constructor(z) {
        this.z = z;
        this.ids = new Set();
        this._triangles = new Triangles();
        this._lines = new Lines();
        this.isChanged = false;
    }

    destroy() {
        this._triangles.destroy();
        this._lines.destroy();
    }

    isEmpty() {
        return !this.ids.size;
    }

    markChanged() {
        this.isChanged = true;
    }

    clear() {
        this.ids.clear();
        this.markChanged();
    }

    addID(id) {
        this.ids.add(id);
        this.markChanged();
    }

    removeID(id) {
        this.ids.delete(id);
        this.markChanged();
    }

    get triangles() {
        if (this.isChanged) this.rebuild();
        return this._triangles;
    }

    get lines() {
        if (this.isChanged) this.rebuild();
        return this._lines;
    }

    rebuild() {
        const surfaces = GetModelService("Surfaces");
        // const surfaces = GetNamedView("ViewRoot").model.surfaces;
        this._triangles.clear();
        this._lines.clear();

        this.ids.forEach(id=>this.buildGeometry(surfaces.get(id)));

        this._triangles.load();
        this._lines.load();

        this._triangles.clear();
        this._lines.clear();

        this.isChanged = false;
    }

    buildGeometry() {}

    draw() {
        if (this.isEmpty()) return;
        this.triangles.draw();
        this.lines.draw();
    }
}

class TopLayer extends Layer {
    buildGeometry(surface) {
        BuildCeiling(this._triangles, this._lines, surface);
    }
}

class MiddleLayer extends Layer {
    buildGeometry(surface) {
        BuildNorthWall(this._triangles, this._lines, surface);
        BuildEastWall(this._triangles, this._lines, surface);
        BuildSouthWall(this._triangles, this._lines, surface);
        BuildWestWall(this._triangles, this._lines, surface);
        BuildFloorMiddle(this._triangles, this._lines, surface);
    }
}

class BottomLayer extends Layer {
    buildGeometry(surface) {
        BuildFloorBottom(this._triangles, this._lines, surface);
    }
}

class InteriorLayer extends Layer {
    constructor(z) {
        super(z);
        this.rebuildInterior();
    }

    isEmpty() {
        return (!this.hasInterior &&!this.ids.size);
    }

    rebuild() {
        const surfaces = GetModelService("Surfaces");
        // const surfaces = GetNamedView("ViewRoot").model.surfaces;
        this._triangles.clear();
        this._lines.clear();

        this.rebuildInterior();
        this.ids.forEach(id=>this.buildGeometry(surfaces.get(id)));

        this._triangles.load();
        this._triangles.clear();

        this._lines.load();
        this._lines.clear();
        this.isChanged = false;
    }

    buildGeometry(surface) {
        BuildFloorInterior(this._triangles, this._lines, surface);
    }

    rebuildInterior() {
        const voxels = GetModelService("Voxels");
        // const voxels = GetNamedView("ViewRoot").model.voxels;
        this.hasInterior = false;
        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                const type = voxels.get(x, y, this.z);
                if (!type) continue;
                let belowType = type;
                if (this.z > 0) belowType = voxels.get(x, y, this.z-1);
                if (!belowType) continue;
                const ic = InteriorColor(belowType);
                const lic = LineInteriorColor(belowType);
                BuildMeshZ(this._triangles, this._lines, [x,y,this.z], [[0,0,0], [1,0,0], [1,1,0], [0,1,0]], ic, lic);
                this.hasInterior = true;
            }
        }
    }
}

//--------------------------------------------------------------------------------
//-- BasePlate -----------------------------------------------------------------------
//--------------------------------------------------------------------------------

// Layers hold horizontal slices through the terrain.

class BasePlate {
    constructor(z) {
        this.triangles = new Triangles();
        this.lines = new Lines();
        this.rebuild();
    }

    destroy() {
        this.triangles.destroy();
        this.lines.destroy();
    }

    rebuild() {
        this.triangles.clear();
        this.lines.clear();

        let v = [[0,0,0],[Voxels.sizeX * Voxels.scaleX,0,0],[Voxels.sizeX * Voxels.scaleX,Voxels.sizeY * Voxels.scaleY,0],[0,Voxels.sizeY * Voxels.scaleY,0]];
        let c = [[0.4, 0.7, 0.4, 1],[0.4, 0.7, 0.4, 1],[0.4, 0.7, 0.4, 1],[0.4, 0.7, 0.4, 1]];
        let t = [[0,0], [Voxels.sizeX,0], [Voxels.sizeX, Voxels.sizeY], [0, Voxels.sizeY]];
        this.triangles.addFace(v,c,t);

        const n = [[0, 0, -1], [0, 0, -1]];
        c = [[0.5, 0.5, 0.5, 1],[0.5, 0.5, 0.5, 1]];
        t = [[0,0], [1,1]];

        for (let x = 1; x < Voxels.sizeX; x++) {
            v = [[x*Voxels.scaleX, Voxels.scaleY, 0],[x*Voxels.scaleX, (Voxels.sizeY-1)*Voxels.scaleY, 0]];
            this.lines.addLine(v, c, t, n);
        }

        for (let y = 1; y < Voxels.sizeY; y++) {
            v = [[Voxels.scaleX, y*Voxels.scaleY, 0],[(Voxels.sizeX-1)*Voxels.scaleX, y*Voxels.scaleY, 0]];
            this.lines.addLine(v, c, t, n);
        }

        this.triangles.load();
        this.triangles.clear();

        this.lines.load();
        this.lines.clear();
    }

    draw() {
        this.triangles.draw();
        this.lines.draw();
    }
}

//--------------------------------------------------------------------------------
//-- Functions -------------------------------------------------------------------
//--------------------------------------------------------------------------------

// These functions do the actual work of building the meshes that will be drawn.


function TopColor(type) {
    const c = Colors[type];
    return [c[0],c[1],c[2],1];
    // switch (type) {
    //     case Voxels.lava: return [1.0, 0.0, 0.0, 1];
    //     case Voxels.rock: return [0.7, 0.7, 0.7, 1];
    //     case Voxels.dirt: return [0.4, 0.8, 0.2, 1];
    //     default:
    // }
    // return [0,0,0,1];
}

function SideColor(type) {
    const c = Colors[type];
    return [c[0],c[1],c[2],1];
    // switch (type) {
    //     case Voxels.lava: return [1.0, 0.0, 0.0, 1];
    //     case Voxels.rock: return [0.7, 0.7, 0.7, 1];
    //     // case Voxels.dirt: return [0.8, 0.4, 0.2, 1];
    //     case Voxels.dirt: return [0.4, 0.8, 0.2, 1];
    //     default:
    // }
    // return [0,0,0,1];
}

function InteriorColor(type) {
    return v4_max([0,0,0,0], v4_sub(SideColor(type), [0.2, 0.2, 0.2, 0]));
}

function LineTopColor(type) {
    return v4_max([0,0,0,0], v4_sub(TopColor(type), [0.2, 0.2, 0.2, 0]));
}

function LineSideColor(type) {
    return v4_max([0,0,0,0], v4_sub(SideColor(type), [0.2, 0.2, 0.2, 0]));
}

function LineInteriorColor(type) {
    return v4_max([0,0,0,0], v4_sub(InteriorColor(type), [0.2, 0.2, 0.2, 0]));
}

function BuildCeiling(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.above];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [0,1,1], [1,1,1], [1,0,1]], sc, lsc);
}

function BuildNorthWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.north];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    switch (surface.sides[Voxels.north]) {
        case 0: // Solid Face
            BuildMeshY(triangles, lines, surface.xyz, [[0,1,0], [1,1,0], [1,1,1], [0,1,1]], sc, lsc);
            break;
        case 1: // Left slope
            BuildMeshY(triangles, lines, surface.xyz, [[0,1,0], [1,1,0], [0,1,1]], sc, lsc);
            break;
        case 2: // Right slope
            BuildMeshY(triangles, lines, surface.xyz, [[0,1,0], [1,1,0], [1,1,1]], sc, lsc);
            break;
        default:
    }
}

function BuildEastWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.east];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    switch (surface.sides[Voxels.east]) {
        case 0: // Solid Face
            BuildMeshX(triangles, lines, surface.xyz, [[1,1,0], [1,0,0], [1,0,1], [1,1,1]], sc, lsc);
            break;
        case 1: // Left slope
            BuildMeshX(triangles, lines, surface.xyz, [[1,1,0], [1,0,0], [1,1,1]], sc, lsc);
            break;
        case 2: // Right slope
            BuildMeshX(triangles, lines, surface.xyz, [[1,1,0], [1,0,0], [1,0,1]], sc, lsc);
            break;
        default:
    }
}

function BuildSouthWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.south];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    switch (surface.sides[Voxels.south]) {
        case 0: // Solid Face
            BuildMeshY(triangles, lines, surface.xyz, [[1,0,0], [0,0,0], [0,0,1], [1,0,1]], sc, lsc);
            break;
        case 1: // Left slope
            BuildMeshY(triangles, lines, surface.xyz, [[1,0,0], [0,0,0], [1,0,1]], sc, lsc);
            break;
        case 2: // Right slope
            BuildMeshY(triangles, lines, surface.xyz, [[1,0,0], [0,0,0], [0,0,1]], sc, lsc);
            break;
        default:
    }
}

function BuildWestWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.west];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    switch (surface.sides[Voxels.west]) {
        case 0: // Solid Face
            BuildMeshX(triangles, lines, surface.xyz, [[0,0,0], [0,1,0], [0,1,1], [0,0,1]], sc, lsc);
            break;
        case 1: // Left slope
            BuildMeshX(triangles, lines, surface.xyz, [[0,0,0], [0,1,0], [0,0,1]], sc, lsc);
            break;
        case 2: // Right slope
            BuildMeshX(triangles, lines, surface.xyz, [[0,0,0], [0,1,0], [0,1,1]], sc, lsc);
            break;
        default:
    }
}

function BuildFloorMiddle(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.below];
    if (!type) return;
    const tc = TopColor(type);
    const ltc = LineTopColor(type);
    switch (surface.shape) {
        case 3: // ramp
            switch (surface.facing) {
                case 0: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,0], [1,1,1], [0,1,1]], tc, ltc); break;
                case 1: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,1], [1,1,1], [0,1,0]], tc, ltc); break;
                case 2: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [1,0,1], [1,1,0], [0,1,0]], tc, ltc); break;
                case 3: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [1,0,0], [1,1,0], [0,1,1]], tc, ltc); break;
                default:
            }
            break;
        case 5: // half slope
        case 7:
            switch (surface.facing) {
                case 0: BuildMeshZ(triangles, lines, surface.xyz, [[1,1,1], [0,1,0], [1,0,0]], tc, ltc); break;
                case 1: BuildMeshZ(triangles, lines, surface.xyz, [[1,0,1], [1,1,0], [0,0,0]], tc, ltc); break;
                case 2: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [1,0,0], [0,1,0]], tc, ltc); break;
                case 3: BuildMeshZ(triangles, lines, surface.xyz, [[0,1,1], [0,0,0], [1,1,0]], tc, ltc); break;
                default:
            }
            break;
        case 6: // double ramp
            switch (surface.facing) {
                case 0: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,1], [0,1,1]], tc, ltc); break;
                case 1: BuildMeshZ(triangles, lines, surface.xyz, [[0,1,0], [0,0,1], [1,1,1]], tc, ltc); break;
                case 2: BuildMeshZ(triangles, lines, surface.xyz, [[1,1,0], [0,1,1], [1,0,1]], tc, ltc); break;
                case 3: BuildMeshZ(triangles, lines, surface.xyz, [[1,0,0], [1,1,1], [0,0,1]], tc, ltc); break;
                default:
            }
            break;
        case 8: // butterfly
            switch (surface.facing) {
                case 0:
                case 2:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [1,0,0], [0,1,0]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,1,1], [0,1,0], [1,0,0]], tc, ltc);
                    break;
                case 1:
                case 3:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,1,1], [0,0,0], [1,1,0]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,0,1], [1,1,0], [0,0,0]], tc, ltc);
                    break;
                default:
            }
            break;
        case 9: // cuban
            switch (surface.facing) {
                case 0:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,1,0], [0,0,1], [0.5,0,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0.5,0,0.5], [1,0,1], [1,1,0]], tc, ltc);
                    break;
                case 1:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,1,0], [0,1,1], [0,0.5,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,0.5,0.5], [0,0,1], [1,0,0]], tc, ltc);
                    break;
                case 2:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,0,0], [1,1,1], [0.5,1,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0.5,1,0.5], [0,1,1], [0,0,0]], tc, ltc);
                    break;
                case 3:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,0,0], [1,0,1], [1,0.5,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,0.5,0.5], [1,1,1], [0,1,0]], tc, ltc);
                    break;
                default:
            }
            break;
        case 10: // Ramp + left shim
            switch (surface.facing) {
                case 0:
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,1,1], [0,1,1], [0,0.5,0.5], [1,0,0]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [1,0,0], [0,0.5,0.5]], tc, ltc);
                    break;
                case 1:
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,0,1], [1,1,1], [0.5,1,0.5], [0,0,0]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,1,1], [0,0,0], [0.5,1,0.5]], tc, ltc);
                    break;
                case 2:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [1,0,1], [1,0.5,0.5], [0,1,0]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,1,1], [0,1,0], [1,0.5,0.5]], tc, ltc);
                    break;
                case 3:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,1,1], [0,0,1], [0.5,0,0.5], [1,1,0]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,0,1], [1,1,0], [0.5,0,0.5]], tc, ltc);
                    break;
                default:
            }
            break;
        case 11: // Ramp + right shim
            switch (surface.facing) {
                case 0:
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,1,1], [0,1,1], [0,0,0], [1,0.5,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,0,1], [1,0.5,0.5], [0,0,0]], tc, ltc);
                    break;
                case 1:
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,0,1], [1,1,1], [0,1,0], [0.5,0,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [0.5,0,0.5], [0,1,0]], tc, ltc);
                    break;
                case 2:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,0,1], [1,0,1], [1,1,0], [0,0.5,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,1,1], [0,0.5,0.5], [1,1,0]], tc, ltc);
                    break;
                case 3:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0,1,1], [0,0,1], [1,0,0], [0.5,1,0.5]], tc, ltc);
                    BuildMeshZ(triangles, lines, surface.xyz, [[1,1,1], [0.5,1,0.5], [1,0,0]], tc, ltc);
                    break;
                default:
            }
            break;
        default:
    }
}

function BuildFloorBottom(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.below];
    if (!type) return;
    const tc = TopColor(type);
    const ltc = LineTopColor(type);
    switch (surface.shape) {
        case 2: // Flat
            BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,0], [1,1,0], [0,1,0]], tc, ltc);
            break;
        case 4: // Half floor
            switch (surface.facing) {
                case 0: BuildMeshZ(triangles, lines, surface.xyz, [[1,1,0], [0,1,0], [1,0,0]], tc, ltc); break;
                case 1: BuildMeshZ(triangles, lines, surface.xyz, [[1,0,0], [1,1,0], [0,0,0]], tc, ltc); break;
                case 2: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,0], [0,1,0]], tc, ltc); break;
                case 3: BuildMeshZ(triangles, lines, surface.xyz, [[0,1,0], [0,0,0], [1,1,0]], tc, ltc); break;
                default:
            }
            break;
        case 7: // Opposite half floor
            switch (surface.facing) {
                case 0: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,0], [0,1,0]], tc, ltc); break;
                case 1: BuildMeshZ(triangles, lines, surface.xyz, [[0,1,0], [0,0,0], [1,1,0]], tc, ltc); break;
                case 2: BuildMeshZ(triangles, lines, surface.xyz, [[1,1,0], [0,1,0], [1,0,0]], tc, ltc); break;
                case 3: BuildMeshZ(triangles, lines, surface.xyz, [[1,0,0], [1,1,0], [0,0,0]], tc, ltc); break;
                default:
            }
            break;
        case 9: // Cuban
            switch (surface.facing) {
                case 0: BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,1,0], [0,1,0]], tc, ltc); break;
                case 1: BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,0,0], [1,1,0]], tc, ltc); break;
                case 2: BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,0,0], [1,0,0]], tc, ltc); break;
                case 3: BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,1,0], [0,0,0]], tc, ltc); break;
                default:
            }
            break;
        default:
    }
}

function BuildFloorInterior(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.below];
    if (!type) return;
    const ic = SideColor(type);
    const lic = LineSideColor(type);
    switch (surface.shape) {
        case 3: // Ramp
        case 6: // Double Ramp
        case 8: // Butterfly
        case 10: // Ramp + left shim
        case 11: // Ramp + right shim
            BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,0], [1,1,0], [0,1,0]], ic, lic);
            break;
        case 5: // Half slope
        case 7:
            switch (surface.facing) {
                case 0: BuildMeshZ(triangles, lines, surface.xyz, [[1,1,0], [0,1,0], [1,0,0]], ic, lic); break;
                case 1: BuildMeshZ(triangles, lines, surface.xyz, [[1,0,0], [1,1,0], [0,0,0]], ic, lic); break;
                case 2: BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,0], [0,1,0]], ic, lic); break;
                case 3: BuildMeshZ(triangles, lines, surface.xyz, [[0,1,0], [0,0,0], [1,1,0]], ic, lic); break;
                default:
            }
            break;
        case 9: // Cuban
            switch (surface.facing) {
                case 0:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,1,0], [0,0,0], [0.5,0,0]], ic, lic);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0.5,0,0], [1,0,0], [1,1,0]], ic, lic);
                    break;
                case 1:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,1,0], [0,1,0], [0,0.5,0]], ic, lic);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,0.5,0], [0,0,0], [1,0,0]], ic, lic);
                    break;
                case 2:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,0,0], [1,1,0], [0.5,1,0]], ic, lic);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0.5,1,0], [0,1,0], [0,0,0]], ic, lic);
                    break;
                case 3:
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [0,0,0], [1,0,0], [1,0.5,0]], ic, lic);
                    BuildMeshZ(triangles, lines, surface.xyz, [[0.5,0.5,0], [1,0.5,0], [1,1,0], [0,1,0]], ic, lic);
                    break;
                default:
            }
        break;
        default:
    }
}

// BuildMesh creates triangle/lines using the specified plane to calculate texture coordinates

function BuildMeshX(triangles, lines, xyz, corners, tColor, lColor) {
    const vertices = [];
    const coordinates = [];
    const tColors = [];
    const lColors = [];
    corners.forEach(c => {
        vertices.push(v3_multiply(v3_add(xyz,c),[Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ]));
        coordinates.push([c[1],c[2]]);
        tColors.push(tColor);
        lColors.push(lColor);
    });
    if (triangles) triangles.addFace(vertices, tColors, coordinates);
    if (lines) lines.addFace(vertices, lColors, coordinates);
}

function BuildMeshY(triangles, lines, xyz, corners, tColor, lColor) {
    const vertices = [];
    const coordinates = [];
    const tColors = [];
    const lColors = [];
    corners.forEach(c => {
        vertices.push(v3_multiply(v3_add(xyz,c),[Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ]));
        coordinates.push([c[0],c[2]]);
        tColors.push(tColor);
        lColors.push(lColor);
    });
    if (triangles) triangles.addFace(vertices, tColors, coordinates);
    if (lines) lines.addFace(vertices, lColors, coordinates);
}

function BuildMeshZ(triangles, lines, xyz, corners, tColor, lColor) {
    const vertices = [];
    const coordinates = [];
    const tColors = [];
    const lColors = [];
    corners.forEach(c => {
        vertices.push(v3_multiply(v3_add(xyz,c),[Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ]));
        coordinates.push([c[0],c[1]]);
        tColors.push(tColor);
        lColors.push(lColor);
    });
    if (triangles) triangles.addFace(vertices, tColors, coordinates);
    if (lines) lines.addFace(vertices, lColors, coordinates);
}

function v4_sub(a,b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}

function v4_dot(a,b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]  + a[3] * b[3];
}

function v4_min(a,b) {
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
}

function v4_max(a,b) {
    return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
