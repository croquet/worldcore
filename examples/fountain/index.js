// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, InputManager, UIManager, AudioManager, ActorManager, RenderManager, PawnManager, PlayerManager, RapierPhysicsManager,
    toRad, LoadRapier,m4_scalingRotationTranslation, q_axisAngle, v3_scale, sphericalRandom, TextWidget, GetViewFPS, RapierVersion } from "@croquet/worldcore";
import { LevelActor } from "./src/Level";
import { CubeSprayActor, CylinderSprayActor, ConeSprayActor, BallSprayActor } from "./src/Fountain";
import { Sphere } from "../../src/Render";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting model!");
        this.seedColors();
        this.level = LevelActor.create();
        this.shots = [];

        this.subscribe("hud", "shoot", this.shoot);
        this.subscribe("hud", "pause", this.pause);
        this.subscribe("hud", "disable", this.disable);
        // this.subscribe("test", "ping", this.ignore);
        this.subscribe("input", "dDown", this.test);

    }

    destroy() {
        this.level.destroy();
        super.destroy();
    }

    pause(p) {
        this.isPaused = p;
        if (p) {
            this.physicsManager.pause();
        } else {
            this.physicsManager.resume();
        }
    }

    disable(d) {
        this.disabled = d;
    }

    // ignore() {}

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.physicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 15}));
        this.actorManager = this.addManager(ActorManager.create());
    }

    seedColors() {
        this.colors = [];
        for (let i = 0; i < 100; i++ ) {
            const r = Math.random() * 0.9;
            const g = Math.random() * 0.9;
            const b = Math.random() * 0.9;
            this.colors.push([0.9-r, 0.9-g, 1-b, 1]);
        }
    }

    shoot() {
        if (this.isPaused) return;
        if (this.shots.length >= 50) {
            const doomed = this.shots.shift();
            doomed.destroy();
        }
        let p;
        const r = Math.random();
        if (r < 0.5) {
            p = CubeSprayActor.create({translation: [0, 17, 19]});
        } else if (r < 0.7) {
            p = BallSprayActor.create({translation: [0, 17, 19]});
        } else if (r < 0.9) {
            p = CylinderSprayActor.create({translation: [0, 17, 19]});
        } else {
            p = ConeSprayActor.create({translation: [0, 17, 19]});
        }

        const spin = v3_scale(sphericalRandom(),Math.random() * 1.5);
        p.applyTorqueImpulse(spin);
        p.applyImpulse([0, 0, -16]);
        this.shots.push(p);
    }

    test() {
        console.log(RapierVersion());
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

        this.addHud();

        this.subscribe("input", " Down", this.shoot);
        this.subscribe("input", "tap", this.shoot);
        this.subscribe("input", "pDown", this.pause);
        this.subscribe("input", "dDown", this.disable);

        this.subscribe("input", "cheatDown", this.cheat);


    }

    createManagers() {
        // this.webInput = this.addManager(new InputManager(this.model));
        this.input = this.addManager(new InputManager(this.model));
        this.render = this.addManager(new RenderManager(this.model));
        this.ui = this.addManager(new UIManager(this.model));
        // this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager(this.model));

        this.input.addChord("cheat", ['q', 't']);
    }

    addHud() {
        this.cheatText = new TextWidget(this.ui.root, {local: [10,10], size: [100,20], text: "Cheat On", point: 12, visible: false, alignX: 'left'});
        this.disableText = new TextWidget(this.ui.root, {local: [10,30], size: [100,20], text: "Shots Disabled", point: 12, visible: false, alignX: 'left'});
    }

    shoot() {
        if(!this.cheatMode && this.model.disabled) return;
        this.publish("hud", "shoot")
    }

    pause() {
        if (!this.cheatMode) return;
        this.paused = !this.paused;
        this.publish("hud", "pause", this.paused)
    }

    disable() {
        if (!this.cheatMode) return;
        this.disabled = !this.disabled;
        this.disableText.set({visible: this.disabled});
        this.publish("hud", "disable", this.disabled)
    }

    cheat() {
        this.cheatMode = !this.cheatMode;
        this.cheatText.set({visible: this.cheatMode});
    }

    // reportLatency(latency) {
    //     console.log(latency);
    // }

    // postFPS() {
    //     console.log(Math.round(GetViewFPS()));
    //     this.future(500).postFPS();
    // }

    // update(time) {
    //     super.update(time);
    //     console.log(Math.round(GetViewFPS()));
    // }



}

async function go() {
    await LoadRapier();
    App.makeWidgetDock();
    // const session = await Session.join(`fountain-${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: 30});
    // const session = await Session.join(`fountain`, MyModelRoot, MyViewRoot, {tps: 30, debug: "snapshot"});

    const session = await Session.join({
        appId: 'io.croquet.fountain',
        name: App.autoSession(),
        // name: 'test',
        password: 'dummy-pass',
        model: MyModelRoot,
        view: MyViewRoot,
        tps: 30,
    });
    //setInterval(ping, 500, session)
    //const session = await Session.join(`fountain`, MyModelRoot, MyViewRoot, {tps: 30});
}

function ping(session) {
    if (!session.view) return;
    session.view.publish("test", "ping");
    session.view.reportLatency(session.latency);
}

go();
