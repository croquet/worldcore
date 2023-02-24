import { View } from "@croquet/croquet";
const THREE = require("three");

const AudioContext = window.AudioContext || window.webkitAudioContext;

class AudioManagerView extends View {
    constructor(model) {
        super(model);
        
        this.listenerMatrix = new THREE.Matrix4();
        this.euler = new THREE.Euler();

        this.audioContext = new AudioContext();
        window.addEventListener('click', event => {
            if(this.audioContext.state !== 'running')
                this.audioContext.resume();
        }, {once : true});

        this.scene = new ResonanceAudio(this.audioContext);
        this.scene.output.connect(this.audioContext.destination);

        this.sounds = [];
        this.staticPool = [];
        this.spatialPool = [];

        this.audioElements = [];
        this.sources = [];
        this.mediaStreamSources = [];

        this.subscribe('audio', 'set-listener', this.setListener);

        this.subscribe('audio', 'create', this.create);
        this.subscribe('audio', 'play', this.play);
        this.subscribe('audio', 'update', this._update);
        this.subscribe('audio', 'stop', this.stop);
    }

    setListener({location, euler}) {
        this.euler.copy(euler);
        this.euler.y -= Math.PI;

        this.listenerMatrix.makeRotationFromEuler(this.euler);
        this.listenerMatrix.setPosition(...location);

        this.scene.setListenerFromMatrix(this.listenerMatrix);
    }

    _getMatrix4({euler, location, matrix4}) {
        const _matrix4 = matrix4 || new THREE.Matrix4();

        if(euler) {
            const _euler = new THREE.Euler();
            _euler.copy(euler);
            _matrix4.makeRotationFromEuler(_euler);
        }

        if(location)
            _matrix4.setPosition(...location);

        return _matrix4;
    }

    create({location, euler, src, stream, autoplay, isSpatial, gain, volume, callback}) {        
        let source, audioElement, audioElementSource, mediaStreamSource;
        if(isSpatial) {
            if(this.spatialPool.length && src) {
                const spatialObject = this.spatialPool.pop();
                audioElement = spatialObject.audioElement;
                audioElement.src = src;
                audioElementSource = spatialObject.audioElementSource;
                source = spatialObject.source;
            }
            else {
                if(src) {
                    audioElement = new Audio(src);
                    audioElementSource = this.audioContext.createMediaElementSource(audioElement);
                }
                else {
                    mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
                    audioElement = new Audio();
                    audioElement.srcObject = stream;
                }
        
                source = this.scene.createSource();
                source.setFromMatrix(this._getMatrix4({euler, location}));

                if(audioElementSource) {
                    audioElementSource.connect(source.input);
                }
                else {
                    mediaStreamSource.connect(source.input);
                }
            }

            if(gain)
                source.setGain(gain);
        }
        else {
            if(this.staticPool.length) {
                const staticObject = this.staticPool.pop();
                audioElement = staticObject.audioElement;
                audioElement.src = src;
            }
            else {
                audioElement = new Audio(src);
            }

            if(volume)
                audioElement.volume = volume;
        }
        
        const index = this.sounds.push({audioElement, audioElementSource, source})-1;
        audioElement.onended = () => this.onended({index});

        if(autoplay) {
            this.play({index});
        }

        if(callback)
            callback(index);
    }

    play({index}) {
        if(this.sounds[index]) {
            const {audioElement} = this.sounds[index];
            audioElement.play();
        }
    }

    _update({index, euler, location}) {
        if(this.sounds[index]) {
            const {source} = this.sounds[index];
            if(source)
                source.setFromMatrix(this._getMatrix4({euler, location}));
        }
    }

    stop({index}) {
        if(this.sounds[index]) {
            const {audioElement} = this.sounds[index];
            audioElement.pause();
            this.onended({index});
        }
    }

    onended({index}) {
        const {source, audioElement, audioElementSource, mediaStreamSource} = this.sounds[index];
        delete this.sounds[index];

        if(mediaStreamSource) return;

        if(source) {
            this.spatialPool.push({source, audioElement, audioElementSource});
        }
        else {
            this.staticPool.push({audioElement});
        }
    }


    detach() {
        this.audioContext.close();
        super.detach();
    }
}

export { AudioManagerView }