// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, ActorManager, RenderManager, PawnManager, PlayerManager, RapierPhysicsManager,
    toRad, LoadRapier,m4_scalingRotationTranslation, q_axisAngle, v3_scale, sphericalRandom } from "@croquet/worldcore";
import { LevelActor } from "./src/Level";
import { SprayActor } from "./src/Fountain";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting model!!!");
        this.seedColors();
        this.level = LevelActor.create();
        this.shots = [];
        this.subscribe("input", " Down", this.shoot);
        this.subscribe("input", "touchTap", this.shoot);
        this.subscribe("input", "dDown", this.pause);
        this.subscribe("input", "fDown", this.resume);
    }

    destroy() {
        this.level.destroy();
        super.destroy();
    }

    pause() {
        this.isPaused = true;
        this.phyicsManager.pause();
    }

    resume() {
        this.isPaused = false;
        this.phyicsManager.resume();
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.phyicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 15}));
        this.actorManager = this.addManager(ActorManager.create());
    }

    seedColors() {
        this.colors = [];
        for (let i = 0; i < 100; i++ ) {
            this.colors.push([0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1]);
        }
    }

    shoot() {
        if (this.isPaused) return;
        if (this.shots.length >= 20) {
            const doomed = this.shots.shift();
            doomed.destroy();
        }
        const p = SprayActor.create({translation: [0, 17, 19]});
        const spin = v3_scale(sphericalRandom(),Math.random() * 1.5);
        p.applyTorqueImpulse(spin);
        p.applyImpulse([0, 0, -16]);
        this.shots.push(p);
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);

        this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalAim([0.2,-1,0.1]);

        this.render.camera.setLocation(m4_scalingRotationTranslation(1, q_axisAngle([1,0,0], toRad(-30)), [0,20,22]));
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.4);
            ao.density = 0.9;
            ao.falloff = 0.7;
        }

    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());
        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());
    }

}

async function go() {
    await LoadRapier();
    App.makeWidgetDock();
    const session = await Session.join(`fountain-${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: 30});
}

go();
