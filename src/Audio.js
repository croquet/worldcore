import { NamedView, GetNamedView} from "./NamedView";
import { m4_identity, m4_translation, m4_getTranslation, m4_getRotation} from "./Vector";
import { RegisterMixin } from "./Mixins";
import photon from "../assets/Photon.mp3";

let audioContext;
let audioResonance;

//------------------------------------------------------------------------------------------
//-- AudioManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AudioManager extends NamedView {
    constructor() {
        super("AudioManager");

        audioContext = new AudioContext();
        audioResonance = new ResonanceAudio(audioContext);
        audioResonance.output.connect(audioContext.destination);

        this.spatialPool = [];
        this.staticPool = [];

        this.subscribe("input", "mouse0Down", this.start);
        this.subscribe("input", "touchDown", this.start);
    }

    start() {
        console.log("Starting audio manager");

        audioContext.resume();

        this.unsubscribe("input", "mouse0Down");
        this.unsubscribe("input", "touchDown");

        // this.setListenerLocation(0,0,0);

        // this.ddd = this.addSpatialSound(photon);
        // this.removeSound(this.ddd);

        // this.ddd = this.addSpatialSound(photon);
        // this.ddd.setVolume(10);
        // this.ddd.setLocation(-10,10,0);
        // this.ddd.play();

    }

    destroy() {
        super.destroy();
        audioContext.close();
        audioContext = null;
        audioResonance = null;
    }

    setListenerLocation(v) {
        audioResonance.setListenerPosition(...v);
    }

    addSpatialSound(url) {
        let sound;
        if (this.spatialPool.length) {
            sound = this.spatialPool.pop();
            sound.setSound(url);
        } else {
            sound = new SpatialSound(url);
        }
        sound.setDefaults();
        return sound;

    }

    removeSound(sound) {
        sound.setSound(undefined);
        if (sound instanceof SpatialSound) {
            this.spatialPool.push(sound);
        }

    }

}

//------------------------------------------------------------------------------------------
//-- SpatialSound --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SpatialSound {
    constructor(url) {
        this.audioElement = new Audio(url);
        this.resonanceSource = audioResonance.createSource();
        this.elementSource = audioContext.createMediaElementSource(this.audioElement);
        this.elementSource.connect(this.resonanceSource.input);
    }

    setDefaults() {
        this.setLocation([0,0,0]);
        this.setVolume(1);
    }

    setURL(url) {
        this.audioElement.src = url;
    }

    setVolume(volume) {
        this.resonanceSource.setGain(volume);
    }

    setLocation(v) {
        this.resonanceSource.setPosition(...v);
    }

    play() {
        this.audioElement.load();
        this.audioElement.play();
    }
}


//------------------------------------------------------------------------------------------
//-- PM_AudioListener ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_AudioListener = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        GetNamedView("AudioManager");
    }

    destroy() {
        GetNamedView("AudioManager");
        super.destroy();
    }

    refresh() {
        super.refresh();
        const audio = GetNamedView("AudioManager");
        const location = m4_getTranslation(this.global);
        const rotation = m4_getRotation(this.global);
        audio.setListenerLocation(...location);
    }

};

//------------------------------------------------------------------------------------------
//-- AudioSource ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_AudioSource = superclass => class extends superclass {

    playSound(url) {
        this.say("audio_playSound", url);
    }

};
RegisterMixin(AM_AudioSource);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_AudioSource = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        this.sounds = new Map();
        this.listen("audio_playSound", this.playSound);
    }

    destroy() {
        super.destroy();
        const audio = GetNamedView("AudioManager");
        this.sounds.forEach(sound => {
            audio.removeSound(sound);
        });
    }

    refresh() {
        super.refresh();
        const location = m4_getTranslation(this.global);
        const rotation = m4_getRotation(this.global);
        this.sounds.forEach(sound => {
            sound.setLocation(location);
        });
    }

    addSound(url) {
        if (this.sounds.has(url)) return;
        const location = m4_getTranslation(this.global);
        const audio = GetNamedView("AudioManager");
        const sound = audio.addSpatialSound(url);
        sound.setLocation(location);
        this.sounds.set(url, sound);
    }

    removeSound(url) {
        if (!this.sounds.has(url)) return;
        const audio = GetNamedView("AudioManager");
        const sound = this.sounds.get(url);
        audio.removeSound(sound);
        this.sounds.delete(url);
    }

    playSound(url) {
        console.log("mixin play");
        this.addSound(url);
        const sound = this.sounds.get(url);
        sound.play();
    }

};
