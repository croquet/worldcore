// Worldcore bridge to Unity
//
// Croquet Studios, 2020
import { View } from "@croquet/croquet";
import { ViewRoot } from "./ViewRoot";
import { NamedView, GetNamedView } from "./NamedView";
import { mix, PM_Spatial } from "./Mixins";
import { q_axisAngle, q_identity } from "./Vector";

let theUnityRenderManager; // we'll only be creating one

//------------------------------------------------------------------------------------------
// Mixins
//------------------------------------------------------------------------------------------

const VAL_SCALE = 10000;
const intString = arr => arr.map(v => String(Math.round(v * VAL_SCALE))).join(",");

export const PM_RenderUnity = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        const urm = this.unityRenderManager = theUnityRenderManager; // @@ can't rely on GetNamedView('UnityRenderManager'), because on view-root destruction and rebuild all named views are cleared
        this.unityHandle = urm.nextHandleForPawn(this);
        // console.log(`constructing croquet unity pawn ${this.unityHandle}`);
        this.publish(urm.id, 'unity_pawn_created', this.unityHandle); // if pawn is being built synchronously during an actor init(), this event will be handled after that init has completed but ahead of any other events for this pawn
    }

    destroy() {
        if (this.isDefunct) return;

        this.isDefunct = true;
        super.destroy();
        this.deleteUnityObject();
    }

    sendToUnity(selector, data) { this.unityRenderManager.sendToUnity(selector, data); }

    createUnityObject() {
        // NB: this is only sent once the data channel to Unity has been set up.
        if (this.isDefunct) {
            console.log("Pawn destroyed before unity object creation!");
            return;
        }

        // client code can specify configuration parameters (to be passed to Unity
        // for configuring the generated GameObject - its color, alpha etc) in
        // actor.unityConfig or - typically only for custom pawn classes - in
        // pawn.unityConfig.  the latter takes precedence.
        // the pawn's mixins are also given the chance to contribute default
        // values that will be used for properties not mentioned in unityConfig;
        // any spatial pawn, for example, will provide transform-setting properties
        // (setP, setR, setS) based on its actor's current state.
        // unityConfig then augments/overrides those defaults.
        // the mixins can access, but (for now) cannot override, the unityConfig's
        // type property.
        const uniqueConfig = this.unityConfig || this.actor.unityConfig || {};
        const defaultConfig = { type: uniqueConfig.type || "empty" };
        this.addDefaultUnityConfig(defaultConfig); // consult the mixin hierarchy
        const config = {
            ...defaultConfig,
            ...uniqueConfig
            };
        this.unityRenderManager.create(this.unityHandle, config);
    }

    addDefaultUnityConfig(config) {
        if (config.type !== "empty") Object.assign(config, {
            hsv: [120, 100, 100],
            alpha: 1
            });
    }

    deleteUnityObject() {
        this.unityRenderManager.delete(this.unityHandle);
    }
};

export const PM_UnitySpatial = superclass => class extends mix(superclass).with(PM_RenderUnity, PM_Spatial) {
    constructor(...args) {
        super(...args);

        this.listenOnce('spatial_setLocation', v => this.sendUnityUpdate({ setP: intString(v) }));
        this.listenOnce('spatial_setRotation', q => this.sendUnityUpdate({ setR: intString(q) }));
        this.listenOnce('spatial_setScale', v => this.sendUnityUpdate({ setS: intString(v) }));
    }

    addDefaultUnityConfig(config) {
        super.addDefaultUnityConfig(config);
        Object.assign(config, {
            setP: intString(this.location),
            setR: intString(this.rotation),
            setS: intString(this.scale)
            });
    }

    onAddChild(id) {
        const child = GetNamedView('PawnManager').get(id);
        // console.log(`onAddChild (${!!child})`);
        if (!child) return;

        super.onAddChild(id);
        this.unityRenderManager.addChild(this.unityHandle, child.unityHandle);
    }

    sendUnityUpdate(eventArgs) {
        this.unityRenderManager.sendUpdate(this.unityHandle, eventArgs, this.actor.lastEventTime);
    }
};

export const PM_UnitySmoothed = superclass => class extends PM_UnitySpatial(superclass) {
    constructor(...args) {
        super(...args);

        this.listenOnce('smoothed_moveTo', v => this.sendUnityUpdate({ toP: intString(v) }));
        this.listenOnce('smoothed_rotateTo', q => this.sendUnityUpdate({ toR: intString(q) }));
        this.listenOnce('smoothed_scaleTo', v => this.sendUnityUpdate({ toS: intString(v) }));
    }
};

export const PM_UnityAvatar = superclass => class extends PM_UnitySmoothed(superclass) {
    addDefaultUnityConfig(config) {
        super.addDefaultUnityConfig(config);
        if (config.type === 'userAvatar') {
            const userRecord = this.unityRenderManager.localUserRecord;
            if (userRecord && userRecord.avatar === this.actor) config.viewId = this.viewId;
        }
    }

    moveTo(v) {
        this.say('avatar_moveTo', v);
    }

    rotateTo(q) {
        this.say('avatar_rotateTo', q);
    }

    setVelocity(v) {
        this.say('avatar_setVelocity', v);
    }

    setSpin(q) {
        this.say('avatar_setSpin', q);
    }
};

//------------------------------------------------------------------------------------------
// Managers
//------------------------------------------------------------------------------------------

// the URM survives session shutdowns and restoration (e.g., due to a break in the
// network connection to the reflector), keeping the WebRTC data channel to Unity
// open across such breaks.  during a break, urm.bootstrapView will be null; we use that
// to filter out any messages that Unity sends.
class UnityRenderManager extends NamedView {
    constructor(bootstrapView) {
        super('UnityRenderManager');
        console.log("Start up URM");
        this.bootstrapView = bootstrapView;
        this.nextHandle = 1;
        this.pawnsByHandle = {};

        this.dataChannelReady = false;
        this.unityQueue = [];

        this.addSubscriptions();

        window.unitySideChannelMessage = msgString => this.handleUnityMessage(msgString);
        this.prepareUnityDataChannel();
    }

    addSubscriptions() {
        // even though the URM sticks around during destruction and rebuilding of
        // the main views, its subscriptions will be discarded and must be rebuilt.
        this.subscribe(this.id, 'unity_pawn_created', this.triggerCreateUnityObject);
        this.subscribe(this.viewId, { event: "synced", handling: "immediate" }, this.handleSyncState);
        this.handleSyncState(this.realm.isSynced());

        this.subscribe('unity', 'messageForUnity', this.forwardMessageToUnity);
    }

    reattach() {
        super.reattach();
        this.addSubscriptions();
    }

    destroy() {
        // managers are shut down in an indeterminate order.  if the PawnManager has
        // already been shut down, all Unity pawns will have been told to destroy
        // themselves.  if not, do it here so we can get on with flushing the message
        // queue to inform Unity.
        console.log(`shutting down URM ${this.id}`);
        const pawnManager = GetNamedView('PawnManager');
        if (pawnManager) { // still there
            pawnManager.pawns.forEach(pawn => {
                if (pawn.createUnityObject) pawn.destroy();
            });
        }
        this.flushUnityQueue(); // in any case, ensure any deletion messages are sent
        this.unsubscribe('unity', 'messageForUnity');
        this.bootstrapView = null;
        this.nextHandle = 1;
        this.detach(); // de-register as a view
    }

    forwardMessageToUnity(msg) {
        this.sendToUnity(msg.selector, msg.data);
    }

    get localUserRecord() {
        return this.bootstrapView.model.userRegistry[this.bootstrapView.viewId];
    }

    get localUserIndex() {
        const userRecord = this.localUserRecord;
        return userRecord && userRecord.userIndex;
    }

    // the signalling mechanism we have until the RTC data channel is established.
    // since this mechanism relies on the remote process seeing the change to
    // the window.location, user code mustn't send multiple messages in the same
    // continuous execution of JS code (or only the last will be seen).
    // in fact, messages probably need to be separated by a frame or more.
    sendOnUnitySideChannel(selector, data) {
        // console.log("side-channel message", data);
        const encodedData = encodeURIComponent(JSON.stringify(data));
        const pseudoPath = `croquetMessage?selector=${selector}&data=${encodedData}`;
        const url = `uniwebview://${pseudoPath}`;
        window.location.href = url;
    }

    prepareUnityDataChannel() {
        // since the Unity end will be driving the connection setup, we don't
        // need to handle local negotiation, including local generation of ICE
        // candidates.
        // ...right??
        const ICE_SERVERS = null;
        const connection = this.connection = new RTCPeerConnection(ICE_SERVERS);

        // set up a data-channel handler when the remote end sets one up
        connection.addEventListener('datachannel', event => {
            console.log('datachannel', event);
            const channel = this.dataChannel = event.channel;
            channel.onopen = _evt => console.log(`data channel opened`);
            channel.onerror = evt => console.log(`data channel error: ${evt.message}`);
            channel.onclose = _evt => console.log(`data channel closed`);
            channel.addEventListener('message', evt => this.dataChannelMessage(evt));
            });
        connection.addEventListener('connectionstatechange', event => {
            const state = connection.connectionState;
            console.log(`connectionstatechange: ${state}`);
            switch (state) {
                case 'connected':
                    break;
                case 'disconnected': // @@@ anything we can do for a possibly temporary disconnection?
                    break;
                case 'failed':
                case 'closed':
                    console.warn(`Unexpected shutdown of data channel`);
                    this.dataChannelReady = false;
                    this.prepareUnityDataChannel();
                    break;
                default:
            }
            });

        // it seems that this event is fired just once, when this end generates
        // an answer for the offer from the Unity side.  if that's true, there's
        // no need to send it separately for that end to consider.  but log it,
        // in case we sometimes see lots of them.
        connection.addEventListener('icecandidate', event => console.log("local ICE candidate", event));
    }

    addIceCandidate(data) {
        // handle a candidate from the far end
        const iceCandidate = new RTCIceCandidate(data);
        this.connection.addIceCandidate(iceCandidate).catch(e => console.error('CONNECTION ADD ICE FAILED', e.name, e.message));
    }

    async receiveOffer(data) { // Handler for receiving an offer from the other user (who started the signalling process).
        // Note that during signalling, we will receive negotiationneeded/answer, or offer, but not both, depending
        // on whether we were the one that started the signalling process.
        const offer = data.offer.replace(/_\+_/g, '\n');
        console.log("receive offer", offer);
        const peer = this.connection;
        await peer.setRemoteDescription({ type: "offer", sdp: offer }); // can supply an offer-like object directly, rather than using it to instantiate an RTCSessionDescription (see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription)
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        const encodedAnswer = answer.sdp.replace(/\r\n?|\n/g, "_+_");
        this.sendOnUnitySideChannel('rtc_setup_answer', { answer: encodedAnswer });
    }

    sendToUnity(selector, data) {
        this.unityQueue.push({ selector, data });
    }

    flushUnityQueue() {
        // the event queue is sent as a single string of joined lines
        // interleaving selectors with JSON-stringified data objects:
        //
        //     sel1
        //     { index: 0, x: 1, y: 1, z: 0 }
        //     sel1
        //     { index: 1, x: 2, y: 1, z: 0 }

        if (!this.dataChannelReady) return;

        const queue = this.unityQueue;
        if (!queue.length) return;

        const lines = [];
        let msgLen = 0;
        const MAX_LENGTH = 60000; // should be safe up to 64k
        let mi = 0;
        while (mi < queue.length && msgLen < MAX_LENGTH) {
            const spec = queue[mi];
            const dataString = JSON.stringify(spec.data);
            lines.push(spec.selector, dataString);
            msgLen += spec.selector.length + dataString.length + 2;
            mi++; // mi will always end up as the number of included messages
        }

        if (mi < queue.length) {
            console.log(`reached maximum message-buffer size; holding back ${queue.length - mi} messages`);
            queue.splice(0, mi); // remove just the sent messages
        } else queue.length = 0;

        const msgString = lines.join('\n');
        this.dataChannel.send(msgString);
// console.log(msgString);
    }

    dataChannelMessage(event) {
        this.handleUnityMessage(event.data);
    }

    // handle a message that comes in either through the webview or the dataChannel
    handleUnityMessage(msgString) {
        // if croquet's session drops, we null out the bootstrapView and use
        // that to reject any residual messages coming through from Unity
        if (!this.bootstrapView) return;
        /*
        console.log(`@@@@
            ${msgString}
            @@@@`);
        */
        const msg = JSON.parse(msgString);
        msg.data = msg.data || {}; // won't necessarily be sent with a data property
        const { selector, data } = msg;
        if (selector === 'rtc_setup_ice_candidate') {
            this.addIceCandidate(data);
        } else if (selector === 'rtc_setup_offer') {
            this.receiveOffer(data);
        } else if (selector === 'unity_ready') {
            this.dataChannelReady = true;
            this.handleSyncState(this.realm.isSynced());
        } else if (selector === 'avatar_velocity') {
            // the local unity instance has moved the avatar that has the given handle.
            // we just forward the message to the avatar's pawn, which will issue an
            // event subscribed to by the actor (which is therefore automatically
            // sent via the reflector).
            const pawn = this.pawnsByHandle[data.h];
            if (pawn) {
                const vec = data.x === undefined ? [0, 0, 0] : [data.x, data.y, data.z];
                pawn.setVelocity(vec);
            }
        } else if (selector === 'avatar_spin') {
            // same as above.
            const pawn = this.pawnsByHandle[data.h];
            if (pawn) {
                let q;
                if (data.x === undefined) q = q_identity();
                else {
                    const axis = [data.x, data.y, data.z];
                    const rate = data.rate; // already in radians/ms
                    q = q_axisAngle(axis, rate);
                }
                pawn.setSpin(q);
            }
        } else {
            // messages from unity that are not obviously for consumption
            // by an individual actor/pawn are published under the 'unity' scope.
            // a Unity app should subscribe to this in a model - typically the
            // main session model - so that the event will in fact be reflected.
            // we tag the event with the viewId of the originating client.
            data.userViewId = this.bootstrapView.viewId;
            this.publish('unity', 'reflectedUnityEvent', msg);
        }
    }

    handleSyncState(isSynced) {
        //console.warn(`synced: ${isSynced}`);
        this.waitingForIslandSync = !isSynced;
        console.log(`synced: ${isSynced}`);
        if (this.dataChannelReady) this.sendToUnity('set_sync_state', { synced: isSynced });
    }

    update(time) {
        super.update(time);
        this.flushUnityQueue();
    }

    nextHandleForPawn(pawn) {
        // for now, all pawn types are lumped in together
        const handle = this.nextHandle++;
        this.pawnsByHandle[handle] = pawn;
        return handle;
    }

    // during pawn creation that happens after startup (i.e., once views and managers
    // are already all up and running), we need to delay scheduling of the unity
    // create_object message until the actor has finished its initialisation.
    // we achieve that by having each unity pawn publish the unity_pawn_created
    // event from its constructor.  that event is handled here.
    triggerCreateUnityObject(handle) {
        const pawn = this.pawnsByHandle[handle];
        if (pawn) pawn.createUnityObject();
    }

    create(handle, config) {
        // console.log("Creating Unity render object " + handle);
        this.sendToUnity('create_object', { handle, ...config });
    }

    delete(handle) {
        // console.log("Deleting Unity render object " + handle);
        delete this.pawnsByHandle[handle];
        this.sendToUnity('delete_object', { h: handle });
    }

    addChild(handle, childHandle) {
        this.sendToUnity('add_child', { h: handle, childH: childHandle });
    }

    sendUpdate(handle, eventArgs) {
        const unityArgs = { h: handle, ...eventArgs };
        this.sendToUnity('update_object', unityArgs);
    }
}

export class UnityViewRoot extends ViewRoot {
    constructor(model) {
        super(model);
        this.model = model;
    }

    createManagers() {
        // set up the URM before calling super(), where the PawnManager will be
        // created and will immediately set about making pawns - including
        // Unity pawns - to serve all the Actors found on the Model side.
        this.addManager(theUnityRenderManager); // register, so it'll be shut down on detach()
        super.createManagers();
    }
}

let AppViewRoot = UnityViewRoot; // default

export class UnityViewStarter extends View {
    static setViewRoot(ViewClass) { AppViewRoot = ViewClass; }

    constructor(model) {
        console.log(`starting bootstrap view`);
        super(model);
        this.model = model;
        this.sessionView = null;
        let urm = theUnityRenderManager;
        if (!urm) urm = theUnityRenderManager = new UnityRenderManager(this);
        else {
            urm.bootstrapView = this;
            urm.reattach();
        }
        if (!urm.dataChannelReady) urm.sendOnUnitySideChannel('URM_ready', { viewId: this.viewId });
    }

    update(time) {
        if (this.sessionView) this.sessionView.update(time);
        else if (theUnityRenderManager.dataChannelReady && AppViewRoot) this.sessionView = new (AppViewRoot)(this.model);
    }

    detach() {
        if (this.sessionView) {
            this.sessionView.detach();
            delete this.sessionView;
        }
        super.detach();
    }
}
