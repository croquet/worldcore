import { mix, Actor, Pawn, AM_Spatial, PM_Spatial } from "@croquet/worldcore-kernel";
import { PM_Visible, Triangles, Material, DrawCall } from "@croquet/worldcore-webgl";
import { AM_RapierPhysics, RAPIER } from "@croquet/worldcore-rapier";
import { FountainActor } from "./Fountain";
import paper from "../assets/paper.jpg";

export class LevelActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    get pawn() {return LevelPawn};
    init() {

        super.init({translation: [0,0,0], scale: [1,1,1]});

        const rbd = RAPIER.RigidBodyDesc.newStatic();
        this.createRigidBody(rbd);

        let cd = RAPIER.ColliderDesc.cuboid(75,4,75);
        cd.setTranslation(0,-4,0);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(1,40,40);
        cd.setTranslation(16,0,0);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(1,40,40);
        cd.setTranslation(-16,0,0);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(40,40,1);
        cd.setTranslation(0,0,20);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(40,40,1);
        cd.setTranslation(0,0,-16);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        this.fountain = FountainActor.create({translation: [0,0,0]});

    }

    destroy() {
        super.destroy();
        this.fountain.destroy();
    }
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);
        console.log("Building level pawn");
        const c = [0.5, 0.5, 0.5, 1];

        this.ground = new Triangles();
        this.ground.addFace([[-75,0,75], [75,0,75], [75,0,-75], [-75,0,-75]], [c,c,c,c], [[0,0], [75,0], [75,75], [0,75]]);

        this.ground.addFace([[-15,0,-15], [15,0,-15], [15,5,-15], [-15,5,-15]], [c,c,c,c], [[0,0], [75,0], [75,75], [0,75]]);
        this.ground.addFace([[-15,0,15], [-15,0,-15], [-15,5,-15], [-15,5,15]], [c,c,c,c], [[0,0], [75,0], [75,75], [0,75]]);
        this.ground.addFace([[15,0,-15], [15,0,15], [15,5,20], [15,5,-15]], [c,c,c,c], [[0,0], [75,0], [75,75], [0,75]]);

        this.ground.load();
        this.ground.clear();

        this.material = new Material();
        this.material.texture.loadFromURL(paper);

        const draw = new DrawCall(this.ground, this.material);

        this.setDrawCall(draw);
    }

    destroy() {
        super.destroy();
        this.ground.destroy();
        this.material.destroy();
    }

}
