import { mix, Actor, Pawn, PM_Spatial, Material, v3_add,
    Cylinder, Cone, m4_translation, CachedObject, q_axisAngle, TAU, InstancedDrawCall, m4_rotationX, toRad, v3_scale,
    Behavior, AM_Behavioral, ModelService } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";
import { AM_VoxelSmoothed, PM_LayeredInstancedVisible } from "./Components";
import { TimberActor } from "./Rubble";

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
        // this.subscribe("editor", "spawnRoad", this.onSpawnRoad);
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
            if (!this.has(key)) return;
            this.get(key).validate();
        });
    }

    has(key) {
        return this.props.has(key);
    }

    get(key) {
        return this.props.get(key);
    }

    set(key, plant) {
        this.destroyOne(key);
        this.props.set(key, plant);
    }

    delete(key) {
        this.props.delete(key);
    }

    destroyOne(key) {
        if (this.has(key)) this.get(key).destroy();
    }

    destroyAll() {
        const doomed = new Map(this.props);
        doomed.forEach(plant => plant.destroy());
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
        if (this.key) props.set(this.key, this);
    }

    destroy() {
        super.destroy();
        const props = this.service("Props");
        if (this.key) props.delete(this.key);
    }
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
        if (!surface || surface.rawElevation(this.fraction[0], this.fraction[1]) !== this.fraction[2]) this.harvest();
    }

    harvest() {
        const translation0 = this.translation;
        const translation1 = v3_add(this.translation, v3_scale([0,0,6], this.scale[0]));
        const translation2 = v3_add(this.translation, v3_scale([0,0,12], this.scale[0]));
        TimberActor.create({translation: translation0, scale: this.scale});
        TimberActor.create({translation: translation1, scale: this.scale});
        TimberActor.create({translation: translation2, scale: this.scale});
        this.destroy();
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
    get pawn() {return RoadPawn};

    init(options) {
        super.init(options);
        // console.log("new road actor!");
        this.sideExits = new Array(4).fill(null);
        this.connect();
        this.publish("road", "changed", this.xyz);
    }

    destroy() {
        this.disconnect();
        this.publish("road", "changed", this.xyz)
        super.destroy();
    }

    disconnect() {
        this.sideExits.forEach( (exit,n) => {
            if (exit) exit.exits[opp(n)] = null;
        });
    }

    connect() {
        const surfaces = this.service("Surfaces");
        const paths = this.service("Paths");
        const props = this.service("Props");
        const surface = surfaces.get(this.key);
        const waypoint = paths.waypoints.get(this.key);
        if (!waypoint) return; // error here

        this.sideExits.fill(null);

        const s = this.sideRoads(surface);
        // console.log(s);
        for (let n = 0; n < 4; n++) {
            if (!s[n]) return;
            const exit = waypoint.exits[n];
            if (!exit) return;
            const prop = props.get(exit);
            if (prop instanceof RoadActor) {
                this.sideExits[n] = prop;
                prop.sideExits[opp(n)] = this;
            }
        }

        // this.supressCorners();
    }

    sideRoads(surface) {
        let roads = [false, false, false, false];
        switch (surface.shape) {
            case 2:
                roads = [true, true, true, true];
                break;
            case 3:
                roads = [true, false, true, false];
                break;
            case 4:
                roads = [true, true, false, false];
                break;
            case 7:
                roads = [false, false, true, true];
                break;
            default:
        }
        rot4(roads, surface.facing);

        return roads;
    }

    // Side roads suppress corner roads

    supressCorners() {
        if (this.exits[0]) {
            this.exits[9] = null;
            this.exits[6] = null;
        }
        if (this.exits[1]) {
            this.exits[6] = null;
            this.exits[7] = null;
        }
        if (this.exits[2]) {
            this.exits[7] = null;
            this.exits[8] = null;
        }
        if (this.exits[3]) {
            this.exits[8] = null;
            this.exits[9] = null;
        }
    }

    validate() {
        const surface = this.service('Surfaces').get(this.key);
        if (!surface || !surface.hasFloor()) this.destroy();
    }

}
RoadActor.register("RoadActor");

class RoadPawn extends PropPawn {
    constructor(...args) {
        super(...args);
        // this.setDrawCall(CachedObject("roadDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("raodMesh", this.buildMesh);
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
        top.destroy();
        trunk.transform(m4_rotationX(toRad(90)));
        trunk.transform(m4_translation([0,0,4.5]));
        trunk.load();
        trunk.clear();
        return trunk;
    }

}

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
