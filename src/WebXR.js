import { q_pitch, q_yaw, toDeg } from "..";
import { NamedView } from "./NamedView";

export class WebXRManager extends NamedView {

    constructor() {
        super("WebXRManager");
        if (!navigator.xr) return;
        navigator.xr.isSessionSupported('immersive-ar').then(supported => {
            if (supported) this.subscribe("input", "click", this.start);
        })
    }

    start() {
        console.log("Starting WebXR!");
        this.unsubscribe("input", "click");
        navigator.xr.requestSession('inline', {requiredFeatures: ['local']}).then(xrSession => {
            this.xrSession = xrSession;
            console.log("Has VR session!");

            this.xrSession.requestReferenceSpace('local').then(localReferenceSpace => {
                this.localReferenceSpace = localReferenceSpace;

                this.canvas = document.createElement('canvas');
                this.context = this.canvas.getContext('webgl', {xrCompatible: true});

                this.context.makeXRCompatible().then( xxx => {

                    this.baseLayer = new XRWebGLLayer(this.xrSession, this.context);
                    this.xrSession.updateRenderState({baseLayer: this.baseLayer});

                    this.xrSession.requestAnimationFrame(this.onFrame.bind(this));
                });

            });

        })
    }

    onFrame(timestamp, frame) {
        // this.context.bindFramebuffer(this.context.FRAMEBUFFER, this.baseLayer.framebuffer);
        const pose = frame.getViewerPose(this.localReferenceSpace);
        if (pose) {
            const o = pose.transform.orientation;
            const q = [o.x, o.y, o.z, o.w];
            this.publish("xr", "orientation", q);
        //     const pitch = q_pitch(q);
        //     const yaw = q_yaw(q);
        //    console.log(toDeg(yaw));
        }
        this.xrSession.requestAnimationFrame(this.onFrame.bind(this));
    }
}