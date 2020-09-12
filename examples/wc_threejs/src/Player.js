import { q_axisAngle, Actor, Pawn, mix, AM_Avatar, PM_Avatar, PM_ThreeCamera,
    PM_ThreeVisible, PM_AudioListener, PM_AudioSource, AM_Player, PM_Player } from "@croquet/worldcore";
import * as THREE from "three";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
// PlayerActor
//------------------------------------------------------------------------------------------

class PlayerActor extends mix(Actor).with(AM_Avatar, AM_Player) {
    init(options) {
        super.init("PlayerPawn", options);
        this.setLocation([0,1.5,25]);
        this.listen("setName", name => {this.name = name; this.playerChanged();});
    }
    version() { return "0.001"; }
}
PlayerActor.register('PlayerActor');

//------------------------------------------------------------------------------------------
// PlayerPawn
//------------------------------------------------------------------------------------------
let playerPawn;

export function MyPlayerPawn() {return playerPawn;}

class PlayerPawn extends mix(Pawn).with(PM_Avatar, PM_AudioListener, PM_AudioSource, PM_ThreeVisible, PM_ThreeCamera, PM_Player) {
    constructor(...args) {
        super(...args);
        this.tug = 0.2;
        if (this.isMyPlayerPawn) {
            playerPawn = this;

            //this.setOffset(m4_translation([0,1,0]));

            this.right = 0;
            this.left = 0;
            this.fore = 0;
            this.back = 0;

            this.subscribe("hud", "enterGame", this.activateControls);

        } else {
            const paperTexture = new THREE.TextureLoader().load( paper );

            paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
            paperTexture.repeat.set(1,3);

            const geometry = new THREE.BoxBufferGeometry( 1, 3, 1 );
            const material = new THREE.MeshStandardMaterial( {map: paperTexture, color: 0x77ff77} );
            this.cube = new THREE.Mesh( geometry, material );
            this.cube.castShadow = true;
            this.cube.receiveShadow= true;
            this.setRenderObject(this.cube);
        }
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

    destroy() {
        super.destroy();
        if (this.isMyPlayerPawn) {
            playerPawn = null;
        }
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
