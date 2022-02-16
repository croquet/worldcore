
import { mix, Actor, Pawn, CachedObject, m4_translation, m4_scale, ModelService } from "@croquet/worldcore-kernel";
import { AM_Behavioral } from "@croquet/worldcore-behavior";
import { Material, UnitCube, InstancedDrawCall } from "@croquet/worldcore-webgl";
import { AM_VoxelSmoothed, PM_VoxelSmoothed, PM_LayeredInstancedVisible} from "./Components";
import { PersonBehavior } from "./Behaviors"
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
//-- Animals -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Manages all the dynamic characters operating under AI controll.

export class Animals extends ModelService {
    init() {
        super.init("Animals");
        this.animals = new Set();
        this.subscribe("surfaces", "newLevel", this.onNewLevel);
        this.subscribe("surfaces", "changed", this.onChanged);
        this.subscribe("editor", "spawnPerson", this.onSpawnPerson);
        // this.subscribe("hud", "firstPerson", this.onFirstPerson); // xxx hack for fp camera sync
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

    // onFirstPerson(fp) { this.fp = fp}; // xxx hack for fp camera sync

    get first() {
        let out = undefined;
        if (this.animals.size > 0) out = [...this.animals][0];
        return out;
    }

}
Animals.register("Animals");

//------------------------------------------------------------------------------------------
//-- AnimalActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Animals can move around in the world and have behaviors attached to them.

class AnimalActor extends mix(Actor).with(AM_VoxelSmoothed, AM_Behavioral) {

    get pawn() {return AnimalPawn}

    init(options) {
        super.init(options);
        const animals = this.service("Animals");
        animals.animals.add(this);
        // if (!animals.vip) animals.vip = this;
        this.publish("animals", "countChanged", animals.animals.size);
    }

    destroy() {
        super.destroy();
        const animals = this.service("Animals");
        animals.animals.delete(this);
        // if (this === animals.vip) {
        //     delete animals.vip;
        //     if (animals.animals.size > 0) animals.vip = [...animals.animals][0];
        // }
        this.publish("animals", "countChanged", animals.animals.size);
    }
}
AnimalActor.register('AnimalActor');

//------------------------------------------------------------------------------------------
//-- AnimalPawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class AnimalPawn extends mix(Pawn).with(PM_VoxelSmoothed) {
}

//------------------------------------------------------------------------------------------
//-- PersonActor ---------------------------------------------------------------------------
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
        const surface = this.service('Surfaces').get(this.key);
        const x = 0.5;
        const y = 0.5;
        // const z = surface.rawElevation(x,y);
        const z = surface.elevation(x,y);
        this.set({fraction: [x,y,z]});
    }
}
PersonActor.register('PersonActor');

//------------------------------------------------------------------------------------------
//-- PersonPawn ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PersonPawn extends mix(AnimalPawn).with(PM_LayeredInstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("personDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("personMesh", this.buildMesh);
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        this.service("WebGLRenderManager").scene.addDrawCall(draw);
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
        mesh.transform(m4_scale([0.6, 0.6, 2.2]));
        mesh.transform(m4_translation([0,0,-0.2]));
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildShinyMesh() {
        const mesh = UnitCube();
        mesh.setColor([1, 0,0,1]);
        mesh.transform(m4_translation([0,0,0.5]));
        mesh.transform(m4_scale([0.6, 0.6, 2.2]));
        mesh.transform(m4_translation([0,0,-0.2]));
        mesh.load();
        mesh.clear();
        return mesh;
    }


}