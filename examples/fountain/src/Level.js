import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, PM_Visible, Triangles, Material, DrawCall, AM_RapierPhysics, q_axisAngle } from "@croquet/worldcore";
import { FountainActor } from "./Fountain";
import paper from "../assets/paper.jpg";

export class LevelActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {
    init() {

        super.init("LevelPawn", {translation: [0,0,0], scale: [1,1,1]});

        this.addRigidBody({type: 'static'});
        this.addBoxCollider({
            size: [50,1,50],
            friction: 1,
            density: 1,
            restitution: 0.1
        });

        this.fountain = FountainActor.create({translation: [0,1.5,0]});

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
        this.ground.addFace([[-50,1,50], [50,1,50], [50,1,-50], [-50,1,-50]], [c,c,c,c], [[0,0], [50,0], [50,50], [0,50]]);

        this.ground.load();
        this.ground.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.draw = new DrawCall(this.ground, this.material);

        this.setDrawCall(this.draw);

    }

    destroy() {
        super.destroy();
        this.ground.destroy();
        this.material.destroy();

    }

}
LevelPawn.register('LevelPawn');
