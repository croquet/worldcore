 import { ResonanceAudio } from "resonance-audio";
import { NamedView, GetNamedView} from "./NamedView";
import { m4_identity, m4_translation, m4_getTranslation, m4_getRotation, m4_rotationQ, v3_transform} from "./Vector";
import { RegisterMixin } from "./Mixins";

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

        this.subscribe("input", "focus", this.focus);
        this.subscribe("input", "blur", this.blur);
        this.subscribe("input", "mouse0Down", this.start);
        this.subscribe("input", "touchDown", this.start);
    }

    focus() {
        audioContext.resume();
    }

    blur() {
        audioContext.suspend();
    }

    start() {
        console.log("Starting audio manager");

        audioContext.resume();

        this.unsubscribe("input", "mouse0Down");
        this.unsubscribe("input", "touchDown");
    }

    destroy() {
        super.destroy();
        audioContext.close();
        audioContext = null;
        audioResonance = null;
    }

    setListenerPosition(m) {
        const location = m4_getTranslation(m);
        const rotation = m4_getRotation(m);
        const rotationMatrix = m4_rotationQ(rotation);
        const up = v3_transform([0, -1, 0], rotationMatrix);
        const forward = v3_transform([0, 0, 1], rotationMatrix);
        audioResonance.setListenerPosition(...location);
        audioResonance.setListenerOrientation(...forward, ...up);
    }

    addSpatialSound(url) {
        let sound;
        if (this.spatialPool.length) {
            sound = this.spatialPool.pop();
            sound.setURL(url);
        } else {
            sound = new SpatialSound(url);
        }
        sound.setDefaults();
        return sound;
    }

    addStaticSound(url) {
        let sound;
        if (this.staticPool.length) {
            sound = this.staticPool.pop();
            sound.setURL(url);
        } else {
            sound = new StaticSound(url);
        }
        sound.setDefaults();
        return sound;
    }

    removeSound(sound) {
        sound.setURL(undefined);
        if (sound instanceof SpatialSound) {
            this.spatialPool.push(sound);
        } else if (sound instanceof StaticSound) {
            this.staticPool.push(sound);
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
        if (audioContext.state !== "running") return;
        this.audioElement.load();
        this.audioElement.play();
    }
}

//------------------------------------------------------------------------------------------
//-- StaticSound ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class StaticSound {
    constructor(url) {
        this.audioElement = new Audio(url);
    }

    setDefaults() {
        this.setVolume(1);
    }

    setURL(url) {
        this.audioElement.src = url;
    }

    setVolume(volume) {
        this.audioElement.volume = volume;
    }

    play() {
        if (audioContext.state !== "running") return;
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
        this.staticSounds = new Map();
        if (this.isMyPlayerPawn) this.refreshAudioPosition();
        this.listen("playSound", this.playStaticSound);
    }

    refreshAudioPosition() {
        const audio = GetNamedView("AudioManager");
        audio.setListenerPosition(this.global);
    }

    refresh() {
        super.refresh();
        if (this.isMyPlayerPawn) this.refreshAudioPosition();
    }

    addStaticSound(url) {
        if (this.staticSounds.has(url)) return;
        const audio = GetNamedView("AudioManager");
        const sound = audio.addStaticSound(url);
        this.staticSounds.set(url, sound);
    }

    removeStaticSound(url) {
        if (!this.staticSounds.has(url)) return;
        const audio = GetNamedView("AudioManager");
        const sound = this.staticSounds.get(url);
        audio.removeSound(sound);
        this.staticSounds.delete(url);
    }

    playStaticSound(data) {
        if (!this.isMyPlayerPawn) return;
        this.addStaticSound(data.url);
        const sound = this.staticSounds.get(data.url);
        sound.setVolume(data.volume);
        sound.play();
    }

};

//------------------------------------------------------------------------------------------
//-- AudioSource ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_AudioSource = superclass => class extends superclass {
    init(...args) {
        super.init(...args);
    }

    playSound(url, volume) {
        this.say("playSound", {url, volume});
    }


};
RegisterMixin(AM_AudioSource);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_AudioSource = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        this.spatialSounds = new Map();
        this.listen("playSound", this.playSpatialSound);
    }

    destroy() {
        super.destroy();
        const audio = GetNamedView("AudioManager");
        if (!audio) return;
        this.spatialSounds.forEach(sound => {
            audio.removeSound(sound);
        });
    }

    refresh() {
        super.refresh();
        const location = m4_getTranslation(this.global);
        const rotation = m4_getRotation(this.global);
        this.spatialSounds.forEach(sound => {
            sound.setLocation(location);
        });
    }

    addSpatialSound(url) {
        if (this.spatialSounds.has(url)) return;
        const location = m4_getTranslation(this.global);
        const audio = GetNamedView("AudioManager");
        const sound = audio.addSpatialSound(url);
        sound.setLocation(location);
        this.spatialSounds.set(url, sound);
    }

    removeSpatialSound(url) {
        if (!this.spatialSounds.has(url)) return;
        const audio = GetNamedView("AudioManager");
        const sound = this.spatialSounds.get(url);
        audio.removeSound(sound);
        this.spatialSounds.delete(url);
    }

    playSpatialSound(data) {
        if (this.isMyPlayerPawn) return;
        this.addSpatialSound(data.url);
        const sound = this.spatialSounds.get(data.url);
        sound.setVolume(data.volume);
        sound.play();
    }

};
