import { NamedView, GetNamedView} from "./NamedView";
import { m4_identity, m4_translation, m4_getTranslation, m4_getRotation, m4_rotationQ, v3_transform} from "./Vector";
import { RegisterMixin } from "./Mixins";
// import photon from "../assets/Photon.mp3";

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

    removeSound(sound) {
        sound.setURL(undefined);
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
        const audio = GetNamedView("AudioManager");
        if (this.isMyPlayerPawn) this.refreshAudioPosition();
        // this.subscribe("input", "focus", this.refreshAudio);
    }

    destroy() {
        GetNamedView("AudioManager");
        super.destroy();
    }

    refreshAudioPosition() {
        const audio = GetNamedView("AudioManager");
        audio.setListenerPosition(this.global);
    }

    refresh() {
        super.refresh();
        if (this.isMyPlayerPawn) this.refreshAudioPosition();
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

    playSound(url) {
        this.say("playSound", url);
    }

};
RegisterMixin(AM_AudioSource);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_AudioSource = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        this.sounds = new Map();
        this.listen("playSound", this.playSound);
    }

    destroy() {
        super.destroy();
        const audio = GetNamedView("AudioManager");
        if (!audio) return;
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
        this.addSound(url);
        const sound = this.sounds.get(url);
        sound.play();
    }

};
