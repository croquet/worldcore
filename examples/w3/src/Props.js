import { mix, Actor, Pawn, PM_Spatial, v3_add, m4_translation, CachedObject, q_axisAngle, TAU,  m4_rotationX, toRad, v3_scale,
    ModelService } from "@croquet/worldcore-kernel";
import { Material, Cylinder, Cone, InstancedDrawCall } from "@croquet/worldcore-webgl";
import { Behavior, AM_Behavioral } from "@croquet/worldcore-behavior";
import paper from "../assets/paper.jpg";
import { AM_VoxelSmoothed, PM_LayeredInstancedVisible } from "./Components";
import { TimberActor } from "./Rubble";
import { Surface } from "./Surfaces";

//------------------------------------------------------------------------------------------
//-- Props ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds all the large static objects in the world. Only one prop can exist in each voxel.

export class Props extends ModelService {
    init() {
        super.init("Props");
        this.props = new Map();
        this.subscribe("surfaces", "newLevel", this.onNewLevel);
        this.subscribe("surfaces", "changed", this.onChanged);
        this.subscribe("editor", "spawnTree", this.onSpawnTree);
        this.subscribe("editor", "spawnRoad", this.onSpawnRoad);
    }

    destroy() {
        super.destroy();
        this.destroyAll();
    }

    onNewLevel() {
        this.destroyAll();
    }

    onChanged(data) {
        const touched = data.remove;
        touched.forEach(key => {
            if (!this.props.has(key)) return;
            this.props.get(key).validate();
        });
    }

    get(key) {
        return this.props.get(key);
    }

    add(key, prop) {
        const previous = this.props.get(key);
        if (previous) previous.destroy();
        this.props.set(key, prop);
    }

    remove(key) {
        this.props.delete(key);
    }

    destroyAll() {
        const doomed = new Map(this.keys);
        doomed.forEach(prop => prop.destroy());
    }

    onSpawnTree(xyz) {
        TreeActor.create({xyz});
    }

    onSpawnRoad(xyz) {
        RoadActor.create({xyz});
    }

}
Props.register("Props");

//------------------------------------------------------------------------------------------
//-- PropActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Base class for all props. Props have a voxel xyz position as well as their normal position
// in the world.

class PropActor extends mix(Actor).with(AM_VoxelSmoothed) {

    get pawn() {return PropPawn};

    init(options) {
        super.init(options);
        const props = this.service("Props");
        props.add(this.key, this);
    }

    destroy() {
        super.destroy();
        const props = this.service("Props");
        props.remove(this.key);
    }

    validate() {}
}
PropActor.register('PropActor');

//------------------------------------------------------------------------------------------
//-- PropPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Prop pawns refresh when the top layer changes to hide themselves if they're above the
// top layer.

class PropPawn extends mix(Pawn).with(PM_Spatial, PM_LayeredInstancedVisible) {
    constructor(...args) {
        super(...args);
        this.subscribe("hud", "topLayer", () => this.say("viewGlobalChanged"));
    }
}

//------------------------------------------------------------------------------------------
//-- TreeBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Basic grown behavior. Stops when the tree reaches mix size.

class TreeBehavior extends Behavior {

    init(options) {
        super.init(options);
        this.size = this.actor.size;
    }

    do(delta) {
        const growth = 0.02;
        this.size = Math.min(this.actor.maxSize, this.size + growth * delta / 1000);
        this.actor.set({scale: [this.size, this.size, this.size]});
        if (this.size >= this.actor.maxSize) {
            this.succeed();
        }
    }
}
TreeBehavior.register('TreeBehavior');

//------------------------------------------------------------------------------------------
//-- TreeActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TreeActor extends mix(PropActor).with(AM_Behavioral) {
    get pawn() {return TreePawn};
    get size() {return this._size || 0.2}
    get maxSize() {return this._maxSize || 1};

    init(options) {
        super.init(options);
        this.randomizePosition();
        this.startBehavior(TreeBehavior, {tickRate: 500});
    }

    destroy() {
        this.harvest();
        super.destroy();
    }

    randomizePosition() {
        if (!this._maxSize) this._maxSize = 1 - 0.6 * this.random();
        const surface = this.service('Surfaces').get(this.key);
        let x = 0.2 + 0.6 * this.random();
        let y = 0.2 + 0.6 * this.random();
        let z = surface.rawElevation(x,y);
        if (z === undefined) { // Handle placing tree on half floor or shim
            x = 1-x;
            y = 1-y;
            z = surface.rawElevation(x,y);
            if (z === undefined) console.warn("Illegal tree position! " + [x,y]);
        }

        this.set({
            fraction:[x,y,z],
            rotation: q_axisAngle([0,0,1], TAU * this.random()),
            scale: [this.size, this.size, this.size]
        });

    }

    validate() {
        const surface = this.service('Surfaces').get(this.key);
        if (!surface || surface.rawElevation(this.fraction[0], this.fraction[1]) !== this.fraction[2]) this.destroy();
    }

    harvest() {
        const translation0 = this.translation;
        const translation1 = v3_add(this.translation, v3_scale([0,0,6], this.scale[0]));
        const translation2 = v3_add(this.translation, v3_scale([0,0,12], this.scale[0]));
        TimberActor.create({translation: translation0, scale: this.scale});
        TimberActor.create({translation: translation1, scale: this.scale});
        TimberActor.create({translation: translation2, scale: this.scale});
    }
}
TreeActor.register("TreeActor");

//------------------------------------------------------------------------------------------
//-- TreePawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TreePawn extends PropPawn {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("pineTreeDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("pineTreeMesh", this.buildMesh);
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        this.service("RenderManager").scene.addDrawCall(draw);
        return draw;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    buildMesh() {
        const trunk = Cylinder(0.5, 10, 7, [0.7, 0.5, 0.3, 1]);
        const top = Cone(2, 0.1, 15, 8, [0.4, 0.8, 0.4, 1]);
        top.transform(m4_translation([0,10,0]));
        trunk.merge(top);
        top.destroy();
        trunk.transform(m4_rotationX(toRad(90)));
        trunk.transform(m4_translation([0,0,4.5]));
        trunk.load();
        trunk.clear();
        return trunk;
    }

}
//------------------------------------------------------------------------------------------
//-- Road ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RoadActor extends PropActor {

    init(options) {
        super.init(options);
        this.exits = [0,0,0,0,0,0,0,0,0,0];
        this.findExits();
        this.rebuildAdjacent(this.exits);
        this.publish("road", "add", this.xyz);
    }

    destroy() {
        const oldExits = this.exits;
        this.exits = [0,0,0,0,0,0,0,0,0,0];
        this.rebuildAdjacent(oldExits);
        this.publish("road", "delete", this.xyz)
        super.destroy();
    }

    change() {
        this.publish("road", "change", this.xyz);
    }

    get exitCount() {
        let count = 0;
        this.exits.forEach(e => {if(e) count++});
        return count;
    }

    // Returns the exits in ccw order, starting with noon
    get ccwExits() {
        return [
            this.exits[0],
            this.exits[9],
            this.exits[3],
            this.exits[8],
            this.exits[2],
            this.exits[7],
            this.exits[1],
            this.exits[6]
        ];
    }

    get exitGaps() {
        const ccw = this.ccwExits;
        let first = 0;
        while(!ccw[first]) {first++};
        const out = [];
        let n0 = first;
        do {
            let n1 = n0+1;
            while(!ccw[n1%8]) {n1++};
            const size = n1-n0;
            out.push({start: n0, size});
            n0 = n1%8;
        } while(n0 !== first)
        return out;
    }

    validate() { // Need to test validity
        this.destroy();
    }

    rebuildAdjacent(exits) {
        const props = this.service("Props");
        exits.forEach((key, n) => {
            if (!key) return;
            const adjacent = props.get(key);
            adjacent.findExits();
            adjacent.cullExits();
            adjacent.change();
        });
        this.cullExits();
    }

    // Find legal exits to adjacent roads
    findExits() {
        const paths = this.service("Paths");
        const props = this.service("Props");
        const surfaces = this.service("Surfaces");

        this.exits.fill(0);

        // Constrain by surface shape

        const surface = surfaces.get(this.key);
        const shape = surface.shape;
        const levelSides = surface.levelSides();

        // Set exits to point to adjacent roads

        const waypoint = paths.waypoints.get(this.key);
        const pathExits = waypoint.exits;
        pathExits.forEach( (key,n) => {
            if (!key) return;
            if (shape !== 2 && !levelSides[n]) return; // Road must be level
            const prop = props.get(key);
            if (!prop || !(prop instanceof RoadActor)) return;
            this.exits[n] = key;
        })

        // Eliminate corner exits next to side exits

        if (this.exits[0]) { this.exits[9] = 0; this.exits[6] = 0; };
        if (this.exits[1]) { this.exits[6] = 0; this.exits[7] = 0; };
        if (this.exits[2]) { this.exits[7] = 0; this.exits[8] = 0; };
        if (this.exits[3]) { this.exits[8] = 0; this.exits[9] = 0; };

    }

    // Eliminate exits that are not reciprocated
    cullExits() {
        const props = this.service("Props");
        this.exits.forEach((key, n) => {
            if (!key) return;
            const prop = props.get(key);
            if (!prop.exits[opp(n)]) this.exits[n] = 0;
        });
    }


}
RoadActor.register("RoadActor");

//------------------------------------------------------------------------------------------
//-- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Given a voxel direction, returns the opposite.
function opp(side) {
    switch (side) {
        case 0: return 2;
        case 1: return 3;
        case 2: return 0;
        case 3: return 1;
        case 4: return 5;
        case 5: return 4;
        case 6: return 8;
        case 7: return 9;
        case 8: return 6;
        case 9: return 7;
        default: return 0;
    }
}

// Rotates the values of a 4 array clockwise

function rot4(a, n) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    switch (n) {
        case 1:
            a[0] = a3;
            a[1] = a0;
            a[2] = a1;
            a[3] = a2;
            break;
        case 2:
            a[0] = a2;
            a[1] = a3;
            a[2] = a0;
            a[3] = a1;
            break;
        case 3:
            a[0] = a1;
            a[1] = a2;
            a[2] = a3;
            a[3] = a0;
            break;
        default:
    }
}
