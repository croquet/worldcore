import { Model } from "@croquet/croquet";
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
        PersonActor.create({xyz});
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
    }

    destroy() {
        super.destroy();
        const animals = this.wellKnownModel("Animals");
        animals.animals.delete(this);
    }
}
AnimalActor.register('AnimalActor');

class AnimalPawn extends mix(Pawn).with(PM_VoxelSmoothed) {
}

//------------------------------------------------------------------------------------------
//-- Animal Behaviors ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestTerrain extends Behavior {
    do() {
        const voxels = this.wellKnownModel("Voxels");
        const surfaces = this.wellKnownModel("Surfaces");
        if (voxels.get(...this.actor.xyz)) {
            console.log("Buried alive!");
            this.actor.destroy();
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
        this.startChild(WalkTo, {tickRate: 50, xyz: [0,0,4], fraction:[0.25, 0.25, 0]});
    }
}
PersonBehavior.register('PersonBehavior');


class WalkTo extends Behavior {

    get xyz() { return this._xyz}
    get fraction() { return this._fraction || [0.5, 0.5, 0]}

    init(options) {
        super.init(options);

        const paths = this.wellKnownModel('Paths');
        const start = this.actor.key;
        const end = Voxels.packKey(...this.xyz);
        // if (start === end) { // We're already at the destination
        //     this.succeed();
        //     return;
        // }

        this.path = paths.findPath(start, end);
        console.log(this.path);
        if (this.path.length < 1) { // No path was found
            this.fail();
            return;
        }

        if (this.path.length === 1) { /// already at start
            this.step = 0;
            this.finale = true;
            this.exit = this.fraction;
        } else {
            this.step = 0;
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
        let key = this.actor.key;
        let xyz = this.actor.xyz;
        let fraction = this.actor.fraction;

        let travel = 0.001 * delta;
        let advance = v2_scale(this.forward, travel); // amount traveled this tick
        let remaining = v2_sub(this.exit, fraction); // remaing distance to exit

        while (Math.abs(advance[0]) > Math.abs(remaining[0]) || Math.abs(advance[1]) > Math.abs(remaining[1])) { // Hop to the next voxel

            // Make sure the path still exits
            const paths = this.wellKnownModel("Paths");
            const atEnd = this.step === this.path.length-1;
            if (!atEnd && !paths.hasExit(key, this.path[this.step+1])) { // Route no longer exists
                console.log("Broken path!");
                this.fail();
                return;
            }

            // Calculate the leftover travel
            travel -= v2_magnitude(remaining);

            // Advance along the path
            this.step++;
            if (this.step === this.path.length-1) { // We've arrived!
                const previousXYZ = xyz;
                key = this.path[this.step];
                xyz = Voxels.unpackKey(key);
                this.exit = this.fraction;
                this.finale = true;
                const entrance = this.findEntrance(xyz, previousXYZ);
                // entrance[2] = 0;
                fraction = entrance;
            } else {
                const previousXYZ = xyz;
                key = this.path[this.step];
                xyz = Voxels.unpackKey(key);

                // Find the entrance point
                const entrance = this.findEntrance(xyz, previousXYZ);
                entrance[2] = 0;

            //     // Move to next voxel

                fraction = entrance;

                // Find the new exit
                const nextKey = this.path[this.step+1];
                const nextXYZ = Voxels.unpackKey(nextKey);
                this.exit = this.findExit(xyz, nextXYZ);

            }

            // Point ourselves toward the new exit

            remaining = v2_sub(this.exit, fraction);
            this.forward = v2_normalize(remaining);
            advance = v2_scale(this.forward, travel);


        }

        if (this.finale && v2_magnitude(remaining) < 0.01) { // We've arrived!
            console.log("done!");
            console.log(this.xyz);
            console.log(this.fraction);
            this.actor.voxelMoveTo(this.xyz, this.fraction);
            this.succeed();
            return;
        }


        fraction[0] = Math.min(1, Math.max(0, fraction[0] + advance[0]));
        fraction[1] = Math.min(1, Math.max(0, fraction[1] + advance[1]));

        const surfaces = this.wellKnownModel("Surfaces");
        const surface = surfaces.get(key);
        if (surface) {
            fraction[2] = surface.elevation(...fraction);
        }

        this.actor.voxelMoveTo(xyz, fraction);
        this.rotateToFacing(this.forward);
    }

    // Given the xy addresses of the current voxel and the voxel you're coming from, returns the point in the current voxel
    // you should enter at.

    findEntrance(here, there) {
        const x0 = here[0];
        const y0 = here[1];
        const x1 = there[0];
        const y1 = there[1];
        if (x0 > x1) {
            if (y0 > y1) return [0,0];
            if (y0 < y1) return [0,1];
            return [0,0.5];
        }
        if (x0 < x1) {
            if (y0 > y1) return [1,0];
            if (y0 < y1) return [1,1];
            return [1,0.5];
        }
        if (y0 > y1) return [0.5,0];
        if (y0 < y1) return [0.5,1];
        return [0.5, 0.5];
    }

    // Given the xy addresses of the current voxel and the voxel you're headed toward, returns the point in the current voxel
    // you should move toward.

    findExit(here, there) {
        const x0 = here[0];
        const y0 = here[1];
        const x1 = there[0];
        const y1 = there[1];
        if (x0 > x1) {
            if (y0 > y1) return [0,0];
            if (y0 < y1) return [0,1];
            return [0,0.5];
        }
        if (x0 < x1) {
            if (y0 > y1) return [1,0];
            if (y0 < y1) return [1,1];
            return [1,0.5];
        }
        if (y0 > y1) return [0.5,0];
        if (y0 < y1) return [0.5,1];
        return [0.5, 0.5];
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