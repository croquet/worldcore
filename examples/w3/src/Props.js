import { Model } from "@croquet/croquet";
import { mix, Actor, Pawn, PM_Spatial, AM_Smoothed, PM_Smoothed, Material, PM_InstancedVisible, v3_add,
    Cylinder, Cone, m4_translation, CachedObject, q_axisAngle, TAU, InstancedDrawCall, m4_rotationX, toRad, v3_scale,
    Behavior, AM_Behavioral, viewRoot, ModelService
 } from "@croquet/worldcore";
import { FallBehavior } from "./SharedBehaviors"
import paper from "../assets/paper.jpg";
import { AM_VoxelSmoothed, PM_LayeredInstancedVisible } from "./Components";

//------------------------------------------------------------------------------------------
//-- Props ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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

class PropPawn extends mix(Pawn).with(PM_Spatial, PM_LayeredInstancedVisible) {
    constructor(...args) {
        super(...args);
        this.subscribe("hud", "topLayer", this.refresh);
    }
}

//------------------------------------------------------------------------------------------
//-- TreeBehaviors -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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
        // z -= 0.1; // Stick into ground. Causes validation problem.

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
//-- Timber --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TimberActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {
    get pawn() {return TimberPawn};
    init(options) {
        super.init(options);
        this.startBehavior(FallBehavior, {tickRate:50});
    }
}
TimberActor.register("TimberActor");

export class TimberPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("timberDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("timberMesh", this.buildMesh);
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
        const log = Cylinder(0.5, 5, 7, [0.7, 0.5, 0.3, 1]);
        log.load();
        log.clear();
        return log;
    }
}

//------------------------------------------------------------------------------------------
//-- Road ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RoadActor extends PropActor {
    get pawn() {return RoadPawn};

    init(options) {
        super.init(options);
        console.log("new road actor!");
        this.exits = [false,false,false,false, false,false,false,false, false, false];
        // this.connect();
    }

    connect() {
        const paths = this.service("Paths");
        const props = this.service("Props");
        const waypoint = paths.waypoints.get(this.key);
        if (!waypoint) return; // error here

        waypoint.exits.forEach((exit, n) =>  {
            if (!exit) return;
            const prop = props.get(exit);
            this.exits[n] = prop instanceof RoadActor;
        });
        console.log(this.exits);
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
        this.setDrawCall(CachedObject("roadDrawCall", () => this.buildDraw()));
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


