// World Core Test
//
// Croquet Studios, 2020

import { App, ModelRoot, ViewRoot, InputManager, toRad, m4_scaleRotationTranslation, q_axisAngle, v3_scale, sphericalRandom, StartWorldcore } from "@croquet/worldcore-kernel";
import { RenderManager } from "@croquet/worldcore-webgl";
import { RapierPhysicsManager, LoadRapier, RapierVersion } from "@croquet/worldcore-rapier";
import { UIManager, TextWidget } from "@croquet/worldcore-widget";
import { LevelActor } from "./src/Level";
import { CubeSprayActor, CylinderSprayActor, ConeSprayActor, BallSprayActor } from "./src/Fountain";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [ {service: RapierPhysicsManager, options: {gravity: [0,-9.8, 0], timeStep: 15}}];
    }

    init(...args) {
        super.init(...args);
        console.log("Starting model!");
        this.seedColors();
        this.level = LevelActor.create();
        this.shots = [];

        this.subscribe("hud", "shoot", this.shoot);
        this.subscribe("hud", "pause", this.pause);
        this.subscribe("hud", "disable", this.disable);
        this.subscribe("input", "dDown", this.test);

    }

    destroy() {
        this.level.destroy();
        super.destroy();
    }

    pause(p) {
        const physicsManager = this.service('RapierPhysicsManager');
        this.isPaused = p;
        if (p) {
            physicsManager.pause();
        } else {
            physicsManager.resume();
        }
    }

    disable(d) {
        this.disabled = d;
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

    static viewServices() {
        return [ InputManager, RenderManager, UIManager];
    }

    constructor(model) {
        super(model);

        const input = this.service("InputManager");
        input.addChord("cheat", ['q', 't']);

        const render = this.service("RenderManager");
        render.setBackground([0.45, 0.8, 0.8, 1.0]);
        render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        render.lights.setDirectionalAim([0.2,-1,0.1]);
        render.camera.setLocation(m4_scaleRotationTranslation(1, q_axisAngle([1,0,0], toRad(-30)), [0,20,22]));
        render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = render.aoShader;
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

    addHud() {
        const ui = this.service("UIManager");
        this.cheatText = new TextWidget({parent: ui.root, local: [10,10], size: [100,20], text: "Cheat On", point: 12, visible: false, alignX: 'left'});
        this.disableText = new TextWidget({parent: ui.root,local: [10,30], size: [100,20], text: "Shots Disabled", point: 12, visible: false, alignX: 'left'});
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
}

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.fountain',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: 'test',
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 30,
})
