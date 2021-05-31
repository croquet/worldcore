import { Model } from "@croquet/croquet";
import { mix, Actor, Pawn, AM_Smoothed, PM_Smoothed, Material,
    AM_Behavioral, DestroyBehavior, SequenceBehavior, Behavior, PM_Visible, PM_InstancedVisible, CachedObject, UnitCube, m4_translation, m4_scaling,
    InstancedDrawCall, GetNamedView, LoopBehavior, SucceedBehavior
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

class NoFloor extends Behavior {
    start() {
        const surfaces = this.wellKnownModel("Surfaces");
        const s = surfaces.get(this.actor.key);
        if (!s || !s.hasFloor()) {
            this.succeed();
        } else {
            this.fail();
        }
    }
}
NoFloor.register('NoFloor');

class TestFall extends SequenceBehavior {
    get children() { return [
        NoFloor,
        FallBehavior,
        DestroyBehavior
    ]}
}
TestFall.register("TestFall");

class SucceedTestFall extends SucceedBehavior {
    get child() {return TestFall}
}
SucceedTestFall.register("SucceedTestFall");

class PersonBehavior extends LoopBehavior {
    get child() { return SucceedTestFall}
}
PersonBehavior.register("PersonBehavior");

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
        console.log(this.fraction);
        console.log(this.translation);
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