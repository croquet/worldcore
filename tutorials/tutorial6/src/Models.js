// Tutorial 6 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, Behavior, sphericalRandom, q_axisAngle } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// Behaviors -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class InflateBehavior extends Behavior {

    get size() { return this._size || 3}
    get rate() { return this._rate || 0.5}

    onStart () {
        this.scale = this.actor.scale[0];
    }

    do(delta) {
        this.scale += this.rate * delta/1000;
        this.actor.set({scale:[this.scale,this.scale,this.scale]});
        if (this.scale > this.size) this.succeed();
    }


}
InflateBehavior.register('InflateBehavior');

//------------------------------------------------------------------------------------------
// BaseActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
        this.listen("spawn", this.doSpawn);
    }

    doSpawn(xyz) {
        const translation = [...xyz]
        translation[1] = 0.5;
        const test = TestActor.create({pawn:"ClickPawn", parent: this, translation})
        const axis = sphericalRandom();
        test.behavior.start("InflateBehavior");
        test.behavior.start({name: "SpinBehavior", axis, speed: 0.3});
        const target = [...xyz];
        target[1] +=5
        test.behavior.start({name: "SequenceBehavior", behaviors:[
            {name: "GotoBehavior", target, speed: 1}
        ]})
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
        this.listen("kill", this.destroy);
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// ColorActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    get color() { return this._color || [0.5,0.5,0.5]}

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        this.base = BaseActor.create();
        this.parent = TestActor.create({pawn: "TestPawn", parent: this.base, translation:[0,1,0]});
        this.child = ColorActor.create({pawn: "ColorPawn", parent: this.parent, translation:[0,0,2]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        this.subscribe("input", "cDown", this.colorChange);

    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
    }

}
MyModelRoot.register("MyModelRoot");
