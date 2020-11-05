import { View } from "@croquet/croquet";
import { GetNamedView, NamedView } from "./NamedView";

class ViewSequenceManager extends NamedView {
    constructor() {
        super("ViewSequenceManager");
        this.active = new Set();
    }

    destroy() {
        super.destroy();
    }

    update(time, viewDelta) {
    }
}

class ViewSequence extends View {
    constructor() {
    }

    destroy() {
        super.disconnect();
    }

    start() {
        const sm = GetNamedView("ViewSequenceManager");
        sm.active.add(this);
    }

    stop() {
        const sm = GetNamedView("ViewSequenceManager");
        sm.active.remove(this);
    }

    get isRunning() {
        const sm = GetNamedView("ViewSequenceManager");
        return sm.active.has(this);
    }

    addKeyFrame(kf) {

    }

}

// Sequence types
// forward
// reverse
// pingPong
// repeats?

// Keyframes have
// key
// time
// value
// isControl -- is the kf an enpoint or a control point?

