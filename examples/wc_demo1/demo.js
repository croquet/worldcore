// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager,  SliderWidget, q_axisAngle, toRad, Actor, Pawn, mix,
    PM_AudioSource, AM_AudioSource, AM_Avatar, PM_Avatar, GetNamedView, UserList, ActorManager, User, PM_Camera,
    RenderManager, PM_Visible, UnitCube, Material, DrawCall, PawnManager, LocalUser, PM_AudioListener, v3_transform, m4_translation, m4_scaling, m4_scalingRotationTranslation, q_identity, PlayerManager, LoadRapier } from "@croquet/worldcore";

import diana from "./assets/diana.jpg";
import paper from "./assets/paper.jpg";
import {JoinScreen, GameScreen } from  "./src/HUD";
import { SceneActor } from "./src/Scene";
import {MyPlayerPawn} from "./src/Player";
// import llama from "./assets/llama.jpg";
// import ttt from "./assets/test.svg";
import photon from "./assets/Photon.mp3";


//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Avatar, AM_AudioSource) {
    init() {
        super.init("MyPawn");
        this.subscribe("input", " Down", this.playPhoton);
        this.subscribe("hud", "sound", this.playPhoton);
    }

    playPhoton() {
        this.playSound(photon);
    }


}
MyActor.register('MyActor');

//------------------------------------------------------------------------------------------
// MyPawn
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Avatar, PM_Visible, PM_AudioSource) {
    constructor(...args) {
        super(...args);

        this.cube = UnitCube();
        this.cube.transform(m4_scalingRotationTranslation([1,7,1], q_identity(), [0, 3.5, 0]));
        this.cube.setColor([0.7, 0.2, 0.2, 1]);
        this.cube.load();
        this.cube.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.setDrawCall(new DrawCall(this.cube, this.material));
    }

}
MyPawn.register('MyPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init() {
        super.init();
        console.log("Starting model!");
        this.actor = MyActor.create();
        this.actor.setLocation([0,0,0]);
        this.scene = SceneActor.create();
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.actorManager = this.addManager(ActorManager.create());
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
        this.render.lights.setAmbientColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalColor([0.2, 0.2, 0.2]);
        this.render.lights.setDirectionalAim([0.2,0.1,-1]);

        if (this.render.aoShader) {
            this.render.aoShader.count = 16;
            this.render.aoShader.density = 0.2;
            this.render.aoShader.falloff = 1;
            this.render.aoShader.radius = 0.1;
            this.render.aoShader.bias = 0.001;
        }

        this.setScale(this.ui.size);

        this.joinScreen = new JoinScreen(this.ui.root, {autoSize: [1,1]});
        this.gameScreen = new GameScreen(this.ui.root, {autoSize: [1,1], visible: false});

        this.subscribe("hud", "enterGame", this.enterGameScreen);

    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());
        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());

    }

    enterGameScreen() {
        this.joinScreen.hide();
        this.gameScreen.show();
    }

    setScale(xy) {
        const narrow = Math.min(xy[0], xy[1]);
        this.ui.setScale(narrow/800);
    }

}

// Session.join(`wc_demo1_${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: "60"});
// Session.join(`wc_demo1`, MyModelRoot, MyViewRoot, {tps: "60"});


async function go() {
    // await LoadRapier();
    // App.messages = true;
    App.makeWidgetDock();
    const session = await Session.join(`wc-demo1-${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: 20});
}

go();
