import { q_axisAngle, Actor, Pawn, mix, AM_Avatar, PM_Avatar, GetNamedView, PM_Camera,
    PM_Visible, UnitCube, Material, DrawCall, PM_AudioListener, m4_translation, m4_scaling, PM_AudioSource, AM_Player, PM_Player } from "@croquet/worldcore";
    import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
// PlayerActor
//------------------------------------------------------------------------------------------

class PlayerActor extends mix(Actor).with(AM_Avatar, AM_Player) {
    init(options) {
        this.color = [0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1];
        super.init("PlayerPawn", {...options, location: [0,1.5,25]});
        // this.setLocation([0,1.5,25]);
        // console.log(this.color);
        this.listen("setName", name => {this.name = name; this.playerChanged();});
    }
}
PlayerActor.register('PlayerActor');

//------------------------------------------------------------------------------------------
// PlayerPawn
//------------------------------------------------------------------------------------------

let playerPawn;

export function MyPlayerPawn() {return playerPawn;}

class PlayerPawn extends mix(Pawn).with(PM_Avatar, PM_AudioListener, PM_AudioSource, PM_Visible, PM_Camera, PM_Player) {
    constructor(...args) {
        super(...args);
        this.tug = 0.2;
        // console.log(this.isMyPlayerPawn);
        // console.log(this.actor.playerId);
        // console.log(this.viewId);

        if (this.isMyPlayerPawn) {
            // console.log("My Player Pawn!");
            playerPawn = this;

            this.setCameraOffset(m4_translation([0,1,0]));

            this.right = 0;
            this.left = 0;
            this.fore = 0;
            this.back = 0;

            this.subscribe("hud", "enterGame", this.activateControls);

        } else {
            console.log("Other Player Pawn!");
            this.cube = UnitCube();
            this.cube.transform(m4_scaling([1,3,1]));
            this.cube.setColor(this.actor.color);
            this.cube.load();
            this.cube.clear();

            this.material = new Material();
            this.material.pass = 'opaque';
            this.material.texture.loadFromURL(paper);

            this.setDrawCall(new DrawCall(this.cube, this.material));
        }
    }

    destroy() {
        if (this.isMyPlayerPawn) playerPawn = null;
        super.destroy();

    }

    activateControls() {
        this.unsubscribe("hud", "enterGame");

        this.subscribe("input", "dDown", () => this.turnRight(-1));
        this.subscribe("input", "dUp", () => this.turnRight(0));
        this.subscribe("input", "aDown", () => this.turnLeft(1));
        this.subscribe("input", "aUp", () => this.turnLeft(0));

        this.subscribe("input", "ArrowRightDown", () => this.turnRight(-1));
        this.subscribe("input", "ArrowRightUp", () => this.turnRight(0));
        this.subscribe("input", "ArrowLeftDown", () => this.turnLeft(1));
        this.subscribe("input", "ArrowLeftUp", () => this.turnLeft(0));

        this.subscribe("input", "wDown", () => this.goFore(-1));
        this.subscribe("input", "wUp", () => this.goFore(0));
        this.subscribe("input", "sDown", () => this.goBack(1));
        this.subscribe("input", "sUp", () => this.goBack(0));

        this.subscribe("input", "ArrowUpDown", () => this.goFore(-1));
        this.subscribe("input", "ArrowUpUp", () => this.goFore(0));
        this.subscribe("input", "ArrowDownDown", () => this.goBack(1));
        this.subscribe("input", "ArrowDownUp", () => this.goBack(0));

        this.subscribe("hud", "fore", f => this.goFore(-1 * f));
        this.subscribe("hud", "back", f => this.goBack(1 * f));
        this.subscribe("hud", "left", f => this.turnLeft(1 * f));
        this.subscribe("hud", "right", f => this.turnRight(-1 * f));

        // this.subscribe("hud", "sound", () => this.say("playPhoton"));
    }


    turnRight(a) {
        this.right = a;
        this.setSpin(q_axisAngle([0,1,0], 0.0015 * (this.right + this.left)));
    }

    turnLeft(a) {
        this.left = a;
        this.setSpin(q_axisAngle([0,1,0], 0.0015 * (this.right + this.left)));
    }

    goFore(z) {
        this.fore = z;
        this.setVelocity([0, 0,  0.01 * (this.fore + this.back)]);
    }

    goBack(z) {
        this.back = z;
        this.setVelocity([0, 0,  0.01 * (this.fore + this.back)]);
    }

    setName(name) { this.say("setName", name); }

}
PlayerPawn.register('PlayerPawn');
