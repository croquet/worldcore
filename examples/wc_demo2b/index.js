// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, ActorManager, ThreeRenderManager, PawnManager, PlayerManager, RapierPhysicsManager,
    toRad, LoadRapier } from "@croquet/worldcore";
import { LevelActor } from "./src/Level";
import { MyPlayerPawn } from "./src/Player";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting model!!!!!");
        this.seedColors();
        this.level = LevelActor.create();
        this.actors = [];
    }

    destroy() {
        this.level.destroy();
        super.destroy();
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.phyicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 20}));
        this.actorManager = this.addManager(ActorManager.create());
    }

    seedColors() {
        this.colors = [];
        for (let i = 0; i < 100; i++ ) {
            this.colors.push([0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1]);
        }
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        /*
        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);

        this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalAim([0.2,-1,0.1]);

        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.05);
            ao.density = 0.3;
            ao.falloff = 0.5;
        }
        */
        this.resizeToWindow();
    }

    resizeToWindow() {
        this.render.camera.aspect = window.innerWidth / window.innerHeight;
        this.render.camera.updateProjectionMatrix();
        this.render.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new ThreeRenderManager());
        this.ui = this.addManager(new UIManager());
        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());
    }

}

async function go() {
    await LoadRapier();
    App.makeWidgetDock();
    const session = await Session.join(`wc-demo2-${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: 20});
}

go();
