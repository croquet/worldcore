import { View } from "@croquet/croquet";
const THREE = require("three");

class AgoraIOView extends View {
    constructor(model) {
        super(model);

        //AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.ERROR);

        this.appID = '0ac239bacb0f42a4b526a31c617ca672';
        this.client = AgoraRTC.createClient({
            mode : 'rtc',
            codec : 'h264',
        });

        this.remoteStreams = [];
    }

    init({token, channel, modelId}) {
        this.joining = true;
        this.client.init(this.appID, () => {
            this.client.join(token, channel, modelId, () => {  
                this.publish('agora.io', 'onjoin');

                this.joined = true;
                this.joining = false;
                this.modelId = modelId;

                this.localStream = AgoraRTC.createStream({
                    streamID : modelId,
                    audio : true,
                    video : false,
                });
        
                this.localStream.init(() => {
                    this.client.publish(this.localStream, error => {
                        console.error(error);
                    })
                });
                
                this.client.on('stream-added', this.onStreamAdded.bind(this));
                this.client.on('stream-subscribed', this.onStreamSubscribed.bind(this));

                this.client.on('peer-online', this.onPeerOnline.bind(this));
                this.client.on('peer-leave', this.onPeerLeave.bind(this));

                this.client.on('active-speaker', this.onActiveSpeaker.bind(this));
            }, error => console.error(error));
        }, error => console.error(error));
    }

    onPeerOnline(event) {
        const modelId = event.uid;
        this.publish(modelId, 'agora.io-onjoin');
    }
    onPeerLeave(event) {
        const modelId = event.uid;
        this.publish(modelId, 'agora.io-onleave');
    }

    onActiveSpeaker(event) {
        const modelId = event.uid;
        this.publish(modelId, 'agora.io-onactivespeaker');
    }

    onStreamAdded(event) {
        const remoteStream = event.stream;
        const modelId = remoteStream.getId();

        if(this.modelId !== modelId) {
            this.client.subscribe(remoteStream, error => {
                console.error(error);
            });
        }
    }
    onStreamSubscribed(event) {
        const {stream} = event;
        const modelId = stream.getId();

        this.publish('audio', 'create', {
            stream : stream.stream,
            isSpatial : true,
            callback : index => {
                this.remoteStreams.push({stream, modelId, index});

                this.subscribe(modelId, 'refresh', _ => {
                    const {euler, location} = _;
                    const _euler = new THREE.Euler();
                    _euler.copy(euler);
                    _euler.y -= Math.PI;
                    this.publish('audio', 'update', {
                        index,
                        location : location,
                        euler : _euler,
                    });
                });
            },
        });
    }

    leave() {
        this.client.leave(() => {
            this.publish('agora.io', 'onleave');
            this.joined = false;
            this.localStream.stop();
            this.localStream.close();

            this.remoteStreams.forEach(_ => {
                const {stream, modelid, index} = _;
                stream.stop();
            });
        }, error => console.error(error));
    }

    detach() {
        if(this.joined)
            this.leave();
    }
}

export { AgoraIOView }