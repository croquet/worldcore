import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, q_axisAngle, RegisterMixin, AM_OnNavGrid, AM_NavGrid } from "@croquet/worldcore";

import { TestPawn, BasePawn, AvatarPawn } from "./Views";


//------------------------------------------------------------------------------------------
// SpatialActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SpatialActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {}
SpatialActor.register('SpatialActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    // static modelServices() {
    //     return [];
    // }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");

        this.base = SpatialActor.create({pawn: "GroundPawn"});
        this.sun = SpatialActor.create({name: "sun", pawn: "TestPawn", translation:[0,2,0]});
        this.planet = SpatialActor.create({name: "planet", pawn: "PlanetPawn", parent: this.sun, translation:[5,0,0]});

        this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        this.planet.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

        this.subscribe("input", "pointerDown", this.click);
    }

    click() {
        console.log("click");

        if (this.sun.pawn === "TestPawn") {
            this.sun.set({pawn: "BallPawn"});
        } else {
            this.sun.set({pawn: "TestPawn"});
        }
    }



}
MyModelRoot.register("MyModelRoot");
