import { v3_add, v3_multiply, ViewService, GetModelService } from "@croquet/worldcore-kernel";
import { Triangles, Lines, Material, DrawCall} from "@croquet/worldcore-webgl";
import { Voxels } from "./Voxels";
import { GetTopLayer } from "../index";
import paper from "../assets/paper.jpg";
import stripe from "../assets/stripe50.png";
import { Colors } from "./Colors";

// The terrain renderer builds the render model from the surfaces.

// There are three categories of terrain geometry:
//
//  * Middle -- The walls of an air voxel (if there are adjacent solid voxels)
//  * Bottom -- The floor of an air voxel at z = 0 (if there's a solid voxel below)
//  * Interior -- The floor between two solid voxels (which is cross-hatched)
//
// The terrain is broken out like this so that we can easily render different slices through the terrain.

//--------------------------------------------------------------------------------
//-- TerrainRender ---------------------------------------------------------------
//--------------------------------------------------------------------------------

// Top level class that manages the exterior and interior terrain meshes and their
// corresponding draw calls.

export class TerrainRender extends ViewService {
    constructor() {
        super("TerrainRender");
        const render = this.service("WebGLRenderManager");

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
        this.middleLayers = [Voxels.sizeZ];
        this.bottomLayers = [Voxels.sizeZ];
        for (let z = 0; z < Voxels.sizeZ; z++) {
            this.middleLayers[z] = new MiddleLayer(z);
            this.bottomLayers[z] = new BottomLayer(z);
        }
    }

    destroy() {
        this.middleLayers.forEach(layer=>layer.destroy());
        this.bottomLayers.forEach(layer=>layer.destroy());
    }

    clear() {
        this.middleLayers.forEach(layer=>layer.clear());
        this.bottomLayers.forEach(layer=>layer.clear());
    }

    layerZ(id) {
        return id & 0x3FF;
    }

    addID(id) {
        const z = this.layerZ(id);
        this.middleLayers[z].addID(id);
        this.bottomLayers[z].addID(id);
    }

    removeID(id) {
        const z = this.layerZ(id);
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
        const top = GetTopLayer();
        if (top < Voxels.sizeZ) this.bottomLayers[top].draw();
        for (let i = top-1; i >= 0; i--) {
            this.middleLayers[i].draw();
            this.bottomLayers[i].draw();
        }
    }
}

//--------------------------------------------------------------------------------
//-- InteriorMesh ----------------------------------------------------------------
//--------------------------------------------------------------------------------

// Holds the geometry for the hidden surfaces of the terrain that are only
// visible when the players is looking at a horizontal slice.

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

class MiddleLayer extends Layer {
    buildGeometry(surface) {
        BuildNorthWall(this._triangles, this._lines, surface);
        BuildEastWall(this._triangles, this._lines, surface);
        BuildSouthWall(this._triangles, this._lines, surface);
        BuildWestWall(this._triangles, this._lines, surface);
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

    rebuildInterior() {
        const voxels = GetModelService("Voxels");
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
}

function SideColor(type) {
    const c = Colors[type];
    return [c[0],c[1],c[2],1];
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

function BuildNorthWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.north];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    BuildMeshY(triangles, lines, surface.xyz, [[0,1,0], [1,1,0], [1,1,1], [0,1,1]], sc, lsc);
}

function BuildEastWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.east];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    BuildMeshX(triangles, lines, surface.xyz, [[1,1,0], [1,0,0], [1,0,1], [1,1,1]], sc, lsc);
}

function BuildSouthWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.south];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    BuildMeshY(triangles, lines, surface.xyz, [[1,0,0], [0,0,0], [0,0,1], [1,0,1]], sc, lsc);
}

function BuildWestWall(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.west];
    if (!type) return;
    const sc = SideColor(type);
    const lsc = LineSideColor(type);
    BuildMeshX(triangles, lines, surface.xyz, [[0,0,0], [0,1,0], [0,1,1], [0,0,1]], sc, lsc);
}

function BuildFloorBottom(triangles, lines, surface) {
    if (!surface) return;
    const type = surface.faces[Voxels.below];
    if (!type) return;
    const tc = TopColor(type);
    const ltc = LineTopColor(type);
    if (surface.shape === 2) BuildMeshZ(triangles, lines, surface.xyz, [[0,0,0], [1,0,0], [1,1,0], [0,1,0]], tc, ltc);
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

function v4_max(a,b) {
    return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
