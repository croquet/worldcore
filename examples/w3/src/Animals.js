import { Model, Constants } from "@croquet/croquet";
import { mix, Actor, Pawn, AM_Smoothed, PM_Smoothed, Material,
    AM_Behavioral, DestroyBehavior, SequenceBehavior, Behavior, PM_Visible, PM_InstancedVisible, CachedObject, UnitCube, m4_translation, m4_scaling,
    InstancedDrawCall, GetNamedView, LoopBehavior, SucceedBehavior, v2_sub, v2_scale, v2_magnitude, q_axisAngle, v2_normalize, SelectorBehavior, ParallelSelectorBehavior, CompositeBehavior
 } from "@croquet/worldcore";
import { Voxels, AM_Voxel } from "./Voxels";
import { AM_VoxelSmoothed, PM_VoxelSmoothed} from "./Components";
import { FallBehavior } from "./SharedBehaviors"
import paper from "../assets/paper.jpg";

export class Animals extends Model {
    init() {
        super.init();
        this.beWellKnownAs("Animals");
        this.animals = new Set();
        this.subscribe("surfaces", "newLevel", this.onNewLevel);
        this.subscribe("surfaces", "changed", this.onChanged);
        this.subscribe("editor", "spawnPerson", this.onSpawnPerson);
    }

    destroy() {
        super.destroy();
        this.destroyAll();
    }

    destroyAll() {
        const doomed = new Set(this.animals);
        doomed.forEach(animal => animal.destroy());
    }

    onNewLevel() {
        this.destroyAll();
    }

    onChanged(data) {
    }

    onSpawnPerson(xyz) {

        for (let n = 0; n < 10; n++) {
            if (this.animals.size < 500) PersonActor.create({xyz});
        }


    }

}
Animals.register("Animals");

//------------------------------------------------------------------------------------------
//-- Animal --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AnimalActor extends mix(Actor).with(AM_VoxelSmoothed, AM_Behavioral) {
    get pawn() {return AnimalPawn}
    init(options) {
        super.init(options);
        const animals = this.wellKnownModel("Animals");
        animals.animals.add(this);
        if (!animals.vip) animals.vip = this;
        this.publish("animals", "countChanged", animals.animals.size);
    }

    destroy() {
        super.destroy();
        const animals = this.wellKnownModel("Animals");
        animals.animals.delete(this);
        if (this === animals.vip) {
            delete animals.vip;
            if (animals.animals.size > 0) animals.vip = [...animals.animals][0];
        }
        this.publish("animals", "countChanged", animals.animals.size);
    }
}
AnimalActor.register('AnimalActor');

class AnimalPawn extends mix(Pawn).with(PM_VoxelSmoothed) {
}

//------------------------------------------------------------------------------------------
//-- Animal Behaviors ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Checks if animal has been buried in a solid voxel, or had its floor collapse. Run in parallel
// with other behaviors.

class TestTerrain extends Behavior {
    do() {
        const voxels = this.wellKnownModel("Voxels");
        const water = this.wellKnownModel("Water");
        const surfaces = this.wellKnownModel("Surfaces");
        if (voxels.get(...this.actor.xyz)) { // Buried
            this.actor.destroy();
        } else if (water.getVolume(...this.actor.xyz) > Constants.path.maxWaterDepth + this.actor.fraction[2] ) { // Drowned
            console.log("Drowned!");
            this.actor.startBehavior(FallBehavior, {tickRate: 50});
        } else {
            const s = surfaces.get(this.actor.key);
            if (!s || !s.hasFloor()) {
                this.actor.startBehavior(FallBehavior, {tickRate: 50});
            } else {
                const x = this.actor.fraction[0];
                const y = this.actor.fraction[1];
                const z = s.elevation(x,y);
                this.actor.voxelMoveTo(this.actor.xyz, [x,y,z]);
            }
        }

    }
}
TestTerrain.register('TestTerrain');

class PersonBehavior extends CompositeBehavior {
    init(options) {
        super.init(options);
        this.startChild(TestTerrain, {tickRate:200});
        this.startChild(Wander);
    }
}
PersonBehavior.register('PersonBehavior');

class Wander extends CompositeBehavior {
    init(options) {
        super.init(options);
        this.startChild(SeekBehavior, {tickRate: 500});
    }

    reportSuccess(child, data) {
        if (child instanceof SeekBehavior) {
            const path = data;
            this.startChild(WalkTo, {tickRate: 50, path});
        } else if (child instanceof WalkTo) {
            this.startChild(SeekBehavior, {tickRate: 500});
        }
    };

    reportFailure(child, data) {
        if (child instanceof SeekBehavior) {
            this.fail();
        } else if (child instanceof WalkTo) {
            this.startChild(SeekBehavior, {tickRate: 500});
        }
    };

}
Wander.register('Wander');

class SeekBehavior extends Behavior {
    init(options) {
        super.init(options);
        this.seek();
    }

    do() { this.seek(); }

    seek() {
        const surfaces = this.wellKnownModel("Surfaces");
        const paths = this.wellKnownModel('Paths');
        const key = surfaces.randomFloor();
        const path = paths.findPath(this.actor.key, key);
        if (path.length > 0) this.succeed(path);
    }

}
SeekBehavior.register('SeekBehavior');

// Can be started with either an xyz destination or a path. You can also
// set fraction to determine where in the final voxel you go.

class WalkTo extends Behavior {

    get xyz() { return this._xyz}
    get fraction() { return this._fraction || [0.5, 0.5, 0]}
    get speed() { return this._speed || 1}; // Voxels traversed per second.
    get path() { return this._path};

    init(options) {
        super.init(options);

        if (this.path){
            const xyz = Voxels.unpackKey(this.path[this.path.length-1]);
            this.set({xyz});
        } else {
            const paths = this.wellKnownModel('Paths');
            const start = this.actor.key;
            const end = Voxels.packKey(...this.xyz);
            const path = paths.findPath(start, end);
            this.set({path});
        }

        this.step = 0;

        if (this.path.length < 1) { // No path was found
            this.fail();
            return;
        } else if (this.path.length === 1) { // Already at end voxel.
            this.exit = this.fraction;
        } else {
            const here = Voxels.unpackKey(this.path[0]);
            const there = Voxels.unpackKey(this.path[1]);
            this.exit = this.findExit(here, there);
        }

        this.forward = v2_sub(this.exit, this.actor.fraction);

        const mag = v2_magnitude(this.forward);
        if (mag > 0) {
            this.forward = v2_scale(this.forward, 1/mag);
        } else {    // Starting at exit point, so any forward vector will work
            this.forward = [1,0];
        }

        this.rotateToFacing(this.forward);
    }

    do(delta) {

        const water = this.wellKnownModel('Water');

        let xyz = this.actor.xyz;
        let fraction = this.actor.fraction;

        let freedom = 1;
        const depth = water.getVolume(...xyz) - fraction[2];
        if (depth > Constants.path.deepWaterDepth) freedom /= Constants.path.deepWaterWeight;

        let travel = freedom * this.speed * delta / 1000;
        let remaining = v2_sub(this.exit, fraction); // remaing distance to exit
        let advance = v2_scale(this.forward, travel); // amount traveled this tick

        while (Math.abs(advance[0]) > Math.abs(remaining[0]) || Math.abs(advance[1]) > Math.abs(remaining[1])) { // Moved past exit
            if (this.step === this.path.length-1) { // We've arrived!
                this.reposition(this.xyz, this.fraction);
                this.succeed();
                return;
            } else { // Skip to next voxel

                const nextKey = this.path[this.step+1];
                const paths = this.wellKnownModel("Paths");
                if (!paths.hasExit(this.actor.key, nextKey)) { // Route no longer exists
                    this.fail();
                    return;
                }

                const maxDepth = Constants.path.maxDepth;
                if (water.getVolumeByKey(nextKey) > maxDepth) { // Route is flooded
                    this.fail();
                    return;
                }

                this.step++;

                const previous = xyz;
                xyz = Voxels.unpackKey(this.path[this.step]);
                fraction = this.findEntrance(xyz, previous);

                if (this.step === this.path.length-1) { // We've entered the final voxel
                    this.exit = this.fraction;
                } else {
                    const next = Voxels.unpackKey(this.path[this.step+1]);
                    this.exit = this.findExit(xyz, next);
                }

                travel -= v2_magnitude(remaining);
                remaining = v2_sub(this.exit, fraction);
                // this.forward = v2_normalize(remaining);

                const mag = v2_magnitude(remaining);
                if (mag > 0)  this.forward = v2_scale(remaining, 1/mag);

                if (Number.isNaN(this.forward[0])) {
                    console.log("remaining" + remaining);
                    console.log("forward  " + this.forward);
                }

                advance = v2_scale(this.forward, travel);
            }
        }

        // if (Number.isNaN(advance[0])) {
        //     console.log("advance  " + advance);
        // }

        fraction[0] = Math.min(1, Math.max(0, fraction[0] + advance[0]));
        fraction[1] = Math.min(1, Math.max(0, fraction[1] + advance[1]));

        // if (Number.isNaN(fraction[0])) {
        //     console.log("fraction  " + fraction);
        // }

        this.reposition(xyz, fraction);
        this.rotateToFacing(this.forward);
    }

    reposition(xyz, fraction) {
        const surfaces = this.wellKnownModel("Surfaces");
        const surface = surfaces.get(Voxels.packKey(...xyz));
        if (surface) fraction[2] = surface.elevation(...fraction);
        this.actor.voxelMoveTo(xyz, fraction);
    }

    // Given the xyz of the current voxel and the voxel you're coming from, returns the point in the current voxel
    // you should enter at.

    findEntrance(here, there) {
        const x0 = here[0];
        const y0 = here[1];
        const x1 = there[0];
        const y1 = there[1];
        if (x0 > x1) {
            if (y0 > y1) return [0,0,0];
            if (y0 < y1) return [0,1,0];
            return [0,0.4,0];
        }
        if (x0 < x1) {
            if (y0 > y1) return [1,0,0];
            if (y0 < y1) return [1,1,0];
            return [1,0.6,0];
        }
        if (y0 > y1) return [0.6,0,0];
        if (y0 < y1) return [0.4,1,0];
        return [0.5,0.5,0];
    }

    // Given the xyz of the current voxel and the voxel you're headed toward, returns the point in the current voxel
    // you should move toward.

    findExit(here, there) {
        const x0 = here[0];
        const y0 = here[1];
        const x1 = there[0];
        const y1 = there[1];
        if (x0 > x1) {
            if (y0 > y1) return [0,0,0];
            if (y0 < y1) return [0,1,0];
            return [0,0.6,0];
        }
        if (x0 < x1) {
            if (y0 > y1) return [1,0,0];
            if (y0 < y1) return [1,1,0];
            return [1,0.4,0];
        }
        if (y0 > y1) return [0.4,0,0];
        if (y0 < y1) return [0.6,1,0];
        return [0.5, 0.5,0];
    }

    rotateToFacing(xy) {
        let angle = Math.acos(xy[1]);
        if (xy[0] > 0) angle *= -1;
        this.actor.rotateTo(q_axisAngle([0,0,1], angle));
    }

}
WalkTo.register("WalkTo");


//------------------------------------------------------------------------------------------
//-- Person --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PersonActor extends AnimalActor {
    get pawn() {return PersonPawn}
    init(options) {
        super.init(options);
        this.set({tickRate: 50});
        this.setStartPostion();
        this.startBehavior(PersonBehavior);
    }

    setStartPostion() {
        const surface = this.wellKnownModel('Surfaces').get(this.key);
        const x = 0.5;
        const y = 0.5;
        const z = surface.rawElevation(x,y);
        this.set({fraction: [x,y,z]});
    }
}
PersonActor.register('PersonActor');

class PersonPawn extends mix(AnimalPawn).with(PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("personDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("personMesh", this.buildMesh);
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);
        return draw;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    buildMesh() {
        const mesh = UnitCube();
        mesh.transform(m4_translation([0,0,0.5]));
        mesh.transform(m4_scaling([0.6, 0.6, 2.2]));
        mesh.transform(m4_translation([0,0,-0.2]));
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildShinyMesh() {
        const mesh = UnitCube();
        mesh.setColor([1, 0,0,1]);
        mesh.transform(m4_translation([0,0,0.5]));
        mesh.transform(m4_scaling([0.6, 0.6, 2.2]));
        mesh.transform(m4_translation([0,0,-0.2]));
        mesh.load();
        mesh.clear();
        return mesh;
    }

}