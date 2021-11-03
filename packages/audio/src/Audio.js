 import { ResonanceAudio } from "resonance-audio";
 import { m4_getTranslation, m4_getRotation, m4_rotationQ, v3_transform, RegisterMixin, ViewService } from "@croquet/worldcore-kernel";
// import { m4_getTranslation, m4_getRotation, m4_rotationQ, v3_transform } from "./Vector";
// import { RegisterMixin } from "./Mixins";
// import { ViewService } from "./Root";

let audioContext;
let audioResonance;

//------------------------------------------------------------------------------------------
//-- AudioManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The manager maintains pools of spatial and static sounds and reuses them.

export class AudioManager extends ViewService {
    constructor(name) {
        super(name || "AudioManager");

        audioContext = new AudioContext();
        audioResonance = new ResonanceAudio(audioContext);
        audioResonance.output.connect(audioContext.destination);

        this.spatialPool = [];
        this.staticPool = [];

        this.subscribe("input", "focus", this.focus);
        this.subscribe("input", "blur", this.blur);
        this.subscribe("input", "pointerDown", this.start);
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
        this.unsubscribe("input", "pointerDown");
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

// Including this mixin will create a spatial listener that will play any sounds that
// are triggered by by an AudioSource. If this Pawn is itself the AudioSource, then the
// sound will be played as a nonspatialized static sound.
//
// If you want to play sounds that only this listener can hear, use playStaticSound directly.

export const PM_AudioListener = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        if (this.isMyPlayerPawn) {
            this.staticSounds = new Map();
            this.listen("playSound", this.playStaticSoundForMyself);
            this.listen("viewGlobalChanged", this.refreshListenerPosition);
            this.listen("lookGlobalChanged", this.refreshListenerPosition);
        }
    }

    destroy() {
        super.destroy();
        const audio = this.service("AudioManager");
        if (!audio) return;
        this.staticSounds.forEach(sound => {
            audio.removeSound(sound);
        });
    }

    refreshListenerPosition() {
        const audio = this.service("AudioManager");
        audio.setListenerPosition(this.global);
    }

    addStaticSound(url) {
        if (this.staticSounds.has(url)) return;
        const audio = this.service("AudioManager");
        const sound = audio.addStaticSound(url);
        this.staticSounds.set(url, sound);
    }

    removeStaticSound(url) {
        if (!this.staticSounds.has(url)) return;
        const audio = this.service("AudioManager");
        const sound = this.staticSounds.get(url);
        audio.removeSound(sound);
        this.staticSounds.delete(url);
    }

    playStaticSound(data) {
        console.log(data);
        this.addStaticSound(data.url);
        const sound = this.staticSounds.get(data.url);
        sound.setVolume(data.volume);
        sound.play();
    }

    playStaticSoundForMyself(data) {
        if (!this.isMyPlayerPawn) return;
        this.playStaticSound(data);
    }

};

//------------------------------------------------------------------------------------------
//-- AudioSource ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// An AudioSource triggers a sound from the Actor. If the source is also the listener, the
// play message will be processed by the listener Pawn as a static sound. Otherwise
// the play message will be processed by the source Pawn as a spatial sound. This way every
// player hears the sound in the right location.

//-- Actor ---------------------------------------------------------------------------------

export const AM_AudioSource = superclass => class extends superclass {

    playSound(url, volume = 1) {
        this.say("playSound", {url, volume});
    }

};
RegisterMixin(AM_AudioSource);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_AudioSource = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        this.spatialSounds = new Map();
        this.listen("playSound", this.playSpatialSoundForOthers);
        this.listen("viewGlobalChanged", this.refreshSourcePosition);
    }

    destroy() {
        super.destroy();
        const audio = this.service("AudioManager");
        if (!audio) return;
        this.spatialSounds.forEach(sound => {
            audio.removeSound(sound);
        });
    }

    refreshSourcePosition() {
        const location = m4_getTranslation(this.global);
        const rotation = m4_getRotation(this.global);
        this.spatialSounds.forEach(sound => {
            sound.setLocation(location);
        });
    }

    addSpatialSound(url) {
        if (this.spatialSounds.has(url)) return;
        const location = m4_getTranslation(this.global);
        const audio = this.service("AudioManager");
        const sound = audio.addSpatialSound(url);
        sound.setLocation(location);
        this.spatialSounds.set(url, sound);
    }

    removeSpatialSound(url) {
        if (!this.spatialSounds.has(url)) return;
        const audio = this.service("AudioManager");
        const sound = this.spatialSounds.get(url);
        audio.removeSound(sound);
        this.spatialSounds.delete(url);
    }

    playSpatialSound(data) {
        this.addSpatialSound(data.url);
        const sound = this.spatialSounds.get(data.url);
        sound.setVolume(data.volume);
        sound.play();
    }

    playSpatialSoundForOthers(data) {
        if (this.isMyPlayerPawn) return;
        this.playSpatialSound(data);
    }

};
