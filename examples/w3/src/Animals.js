import { Model } from "@croquet/croquet";
import { mix, Actor, Pawn, AM_Smoothed, PM_Smoothed, Material,
    AM_Behavioral, DestroyBehavior, SequenceBehavior, Behavior, PM_Visible, PM_InstancedVisible, CachedObject, UnitCube, m4_translation, m4_scaling,
    InstancedDrawCall, GetNamedView
 } from "@croquet/worldcore";
import { Voxels, AM_Voxel } from "./Voxels";
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
        // this.destroyAll();
    }

    onChanged(data) {
    }

    onSpawnPerson(xyz) {
        console.log(xyz);
        PersonActor.create({translation: Voxels.toWorldXYZ(...xyz)});
    }


}
Animals.register("Animals");

//------------------------------------------------------------------------------------------
//-- Animal --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AnimalActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {
    get pawn() {return AnimalPawn}
    init(options) {
        super.init(options);

        const animals = this.wellKnownModel("Animals");
        // if (this.voxelKey) plants.set(this.voxelKey, this);
    }

    destroy() {
        super.destroy();
        const animals = this.wellKnownModel("Animals");
        // if (this.voxelKey) plants.delete(this.voxelKey);
    }
}
AnimalActor.register('AnimalActor');

class AnimalPawn extends mix(Pawn).with(PM_Smoothed) {
}
// AnimalPawn.register('AnimalPawn');

//------------------------------------------------------------------------------------------
//-- Person --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PersonActor extends AnimalActor {
    get pawn() {return PersonPawn}
    init(options) {
        super.init(options);
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
// PersonPawn.register('PersonPawn');