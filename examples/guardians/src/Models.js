import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, q_euler } from "@croquet/worldcore";
import { Paths } from "./Paths";

function rgb(r, g, b) {
    return (r<<16)+(g<<8)+b;
}


//------------------------------------------------------------------------------------------
// FireballActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FireballActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    init(...args) {
        super.init(...args);
        this.fireUpdate();
        this.fireballVisible = false;
        this.subscribe("menu","FireballToggle", this.fireballToggle);
        this.timeOffset = Math.random()*100;
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.counter = 0;
        this.maxCounter = 30;
        this.fireScale = 0.025;
        this.scale = [0.025,0.025, 0.025];
    }
    
    fireUpdate(){
        this.future(50).fireUpdate();
        let fs = this.fireScale + this.counter * 0.001;
        let rise = 0.025;
        this.scale = [fs, fs, fs];
        this.translation = [this.translation[0], this.translation[1]+rise, this.translation[2]];
        if(this.counter++ > this.maxCounter) this.destroy();
        else this.say("updateFire", [this.now()+this.timeOffset,(this.maxCounter-this.counter)/this.maxCounter]);
    }

    fireballToggle(){
        this.fireballVisible = !this.fireballVisible;
    }
    get pawn() {return "FireballPawn"}
}
FireballActor.register('FireballActor');


//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// LaserActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LaserActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get pawn() {return "LaserPawn"}
}
LaserActor.register('LaserActor');

//------------------------------------------------------------------------------------------
// BotActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    init(...args) {
        super.init(...args);
        this.listen("killMe", this.killMe);
    }

    killMe(){ 
        FireballActor.create({translation:this.translation});
        this.destroy();
    }

    get pawn() {return "BotPawn"}

}
BotActor.register('BotActor');

//------------------------------------------------------------------------------------------
// BotEyeActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BotEyeActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get pawn() {return "BotEyePawn"}
}
BotEyeActor.register('BotEyeActor');

//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return "BasePawn"}
}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [Paths];
    }

    init(...args) {
        super.init(...args);
        this.version = 0.1;
        console.log("Start root model!!");

        this.base = BaseActor.create({rotation: q_euler(-Math.PI/2, 0, 0)});
        this.seedColors();
        this.test0 = TestActor.create({pawn: "TestPawn",translation:[12.5,0.5,5.5]});
        this.laser = LaserActor.create({translation:[0,0.5,0], color: this.colors[3]});
        for(let i=0; i<10; i++) for(let j=0; j<10; j++){
            const bot = BotActor.create({translation:[-20+i+Math.random()/2, 0.5, -20+j+Math.random()/2]});
            const eye = BotEyeActor.create({parent: bot});
        }
        //FireballActor.create({translation:[0,2,0], scale:[0.05, 0.05, 0.05]});
        // this.test1 = TestActor.create({pawn: "TestPawn", parent: this.test0, translation:[5,0,0]});

        // this.test0.behavior.start({name: "SpinBehavior", axis:[0,1,0], speed: 2});
        // this.test1.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

        // this.test00 = TestActor.create({pawn: "TestPawn",translation:[-5,0,0]});
        // this.test01 = TestActor.create({pawn: "TestPawn",translation:[5,0,0]});
        // this.test10 = TestActor.create({pawn: "TestPawn",translation:[0,0,-5]});
        // this.test11 = TestActor.create({pawn: "TestPawn",translation:[0,0,5]});

    }
    seedColors() {
        this.colors = [
            rgb(255, 64, 64),        // Red
            rgb(255, 178, 122),        // Orange
            rgb(255, 240, 111),        // Yellow
            rgb(64, 206, 64),        // Green
            rgb(64, 64, 255),         // Blue  
            rgb(255, 64, 255)]        // Purple
    }
}
MyModelRoot.register("MyModelRoot");
