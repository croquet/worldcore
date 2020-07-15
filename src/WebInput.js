import { v2_sub, v2_add, v2_scale, v2_magnitude, TAU } from "./Vector";
import { NamedView } from "./NamedView";

// Need to add doubletap

const DOUBLE_DURATION = 300; // milliseconds
const TRIPLE_DURATION = 600; // milliseconds

const TAP_DURATION = 300;   // milliseconds
const TAP_DISTANCE = 10;     // pixels

const SWIPE_DURATION = 300;   // milliseconds
const SWIPE_DISTANCE = 50;     // pixels

const keys = new Set();

// Returns true if the key is pressed. Includes entries for mouse buttons.
export function KeyDown(key) {
    return keys.has(key);
}

// Returns true if the combination of keys is pressed.
export function ChordDown(chord) {
    let allDown = true;
    chord.forEach(k => {allDown &= KeyDown(k);});
    return allDown;
}

//----------------------------------------------------------------------------------------------------
// Input
//
// Catches all user input events and transforms them into Croquet events.
// We don't want other systems to install their own listeners because they may not get cleaned up properly on disconnect/reconnect.
// Supports adding chord events to report when multiple buttons are pressed simultaneously.
//----------------------------------------------------------------------------------------------------

export class WebInputManager extends NamedView {
    constructor() {
        super("Input");
        this.listeners = [];
        this.touches = [];
        this.chords = new Map();

        this.lastClick = 0;
        this.penultimateClick = 0;

        this.addListener(document, 'contextmenu', e => e.preventDefault());
        this.addListener(window, 'resize', e => this.onResize(e));

        if ('ontouchstart' in document.documentElement) {
            this.addListener(document,'touchstart', e => this.onTouchStart(e));
            this.addListener(document,'touchend', e => this.onTouchEnd(e));
            this.addListener(document,'touchmove', e => this.onTouchMove(e));
            this.addListener(document,'touchcancel', e => this.onTouchCancel(e));
        }

        if ('onmousedown' in document.documentElement) {
            this.addListener(document, 'click', e => this.onClick(e));
            this.addListener(document, 'mousedown', e => this.onMouseDown(e));
            this.addListener(document, 'mouseup', e => this.onMouseUp(e));
            this.addListener(document, 'mousemove', e => this.onMouseMove(e));
            this.addListener(document, 'pointerlockchange', e => this.onPointerLock(e));
            this.addListener(document, 'wheel', e => this.onWheel(e));
        }

        if ('onkeydown' in document.documentElement) {
            this.addListener(document,'keydown', e => this.onKeyDown(e));
            this.addListener(document,'keyup', e => this.onKeyUp(e));
        }

    }

    destroy() {
        super.destroy();
        if (this.inPointerLock) document.exitPointerLock();
        if (this.inFullscreen) document.exitFullscreen();
        this.removeAllListeners();
    }

    addListener(element, type, callback) {
        element.addEventListener(type, callback, {passive: false});
        this.listeners.push({element, type, callback});
    }

    removeListener(type) {
        const remainingListeners = this.listeners.filter(listener => listener.type !== type);
        this.listeners.forEach(listener => {
            if (listener.type === type) listener.element.removeEventListener(listener.type, listener.callback, {passive: false});
        });
        this.listeners = remainingListeners;
    }

    removeAllListeners() {
        this.listeners.forEach(listener => listener.element.removeEventListener(listener.type, listener.callback, {passive: false}));
        this.listeners = [];
    }

    // If you want the input handler to report a chord event, you need to add the chord and give it an event name.
    addChord(name, chord) {
        chord.forEach(key => this.chords.set(key, {name, chord}));
    }

    get touchCount() {
        return this.touches.length;
    }

    addTouch(touch) {
        if (this.getTouch(touch.id)) return;
        this.touches.push(touch);
    }

    removeTouch(id) {
        this.touches = this.touches.filter(touch => touch.id !== id);
    }

    getTouch(id) {
        return this.touches.find(touch => touch.id === id);
    }

    onChordDown(key) {
        if (!this.chords.has(key)) return;
        const entry = this.chords.get(key);
        if (!ChordDown(entry.chord)) return;
        if (this.inPointerLock) this.publish("input", entry.name + "Down");
    }

    onChordUp(key) {
        if (!this.chords.has(key)) return;
        const entry = this.chords.get(key);
        if (!ChordDown(entry.chord)) return;
        if (this.inPointerLock) this.publish("input", entry.name + "Up");
    }

    get isFullscreen() {
        return document.fullscreenElement;
    }

    get canFullscreen() {
        return document.documentElement.requestFullscreen;
    }

    enterFullscreen() {
        if (this.isFullscreen) return;
        if (!this.canFullscreen) return;
        document.documentElement.requestFullscreen();
    }

    exitFullscreen() {
        if (!this.isFullscreen) return;
        document.exitFullscreen();
    }

    get inPointerLock() {
        return document.pointerLockElement || document.mozPointerLockElement;
    }

    get canPointerLock() {
        return document.documentElement.requestPointerLock || document.documentElement.mozRequestPointerLock;
    }

    enterPointerLock() {
        if (this.inPointerLock) return;
        if (!this.canPointerLock) return;
        document.documentElement.requestPointerLock = this.canPointerLock;
        document.documentElement.requestPointerLock();
    }

    exitPointerLock() {
        if (!this.inPointerLock) return;
        document.exitPointerLock();
    }

    onClick(event) {
        window.focus();
        this.publish("input", "click");
    }

    onPointerLock(event) {
        this.publish("input", "pointerLock", this.inPointerLock);
    }

    onResize(event) {
        // Delay actual resize event to address iOS posting of resize before page layout finishes.
        // (Also it kind of looks better .... )
        this.publish("input", "beforeResize");
        this.future(500).futureResize();
    }

    futureResize() {
        this.publish("input", "resize");
    }

    // publishes  both keyDown + arg and "xDown" where "x" is the key

    onKeyDown(event) {
        // console.log(event);
        // // if (event.ctrlKey || event.metaKey) {
        // //     this.onControlKey(event);
        // //     return;
        // // }
        const key = event.key;
        keys.add(key);
        // console.log(keys);
        if (event.repeat) {
            this.publish("input", key + "Repeat", {key, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey});
            this.publish("input", "keyRepeat", {key, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey});
            // This can generate a lot of events! Don't subscribe to in model.
        } else {
            this.publish("input", key + "Down", {key, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey});
            this.publish("input", "keyDown", {key, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey});
        }
        this.onChordDown(key);
    }

    // onControlKey(e) {
    //     switch (e.key) {
    //         case 'z':
    //             e.preventDefault();
    //             this.publish("input", "undo");
    //             this.publish("input", "keyDown", "Undo");
    //             break;
    //         case 'y':
    //             e.preventDefault();
    //             this.publish("input", "redo");
    //             this.publish("input", "keyDown", "Redo");
    //             break;
    //         case 'x':
    //             e.preventDefault();
    //             this.publish("input", "cut");
    //             this.publish("input", "keyDown", "Cut");
    //             break;
    //         case 'c':
    //             e.preventDefault();
    //             this.publish("input", "copy");
    //             this.publish("input", "keyDown", "Copy");
    //             break;
    //         case 'v':
    //             e.preventDefault();
    //             this.publish("input", "paste");
    //             this.publish("input", "keyDown", "Paste");
    //             break;
    //         default:
    //     }
    // }

    // publish both keyUp + arg and "xUp" where "x" is the key
    onKeyUp(event) {
        const key = event.key;
        if (!KeyDown(key)) return;
        this.publish("input", key + "Up", {key, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey});
        this.publish("input", "keyUp", {key, shift: event.shiftKey, alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey});
        this.onChordUp(key);
        keys.delete(key);
    }

    onMouseDown(event) {
        event.preventDefault(); // Required to prevent focus changes that break text input widget focus hack.
        let key = "mouse" + event.button;
        if (KeyDown('Control') && key === 'mouse0') key = 'mouse2';
        if (KeyDown(key)) return;
        const pX = event.clientX;
        const pY = event.clientY;
        keys.add(key);
        this.publish("input", key + "Down", [pX, pY]);
        this.onChordDown(key);
        if (event.timeStamp - this.lastClick < DOUBLE_DURATION) {
            if (event.timeStamp - this.penultimateClick < TRIPLE_DURATION) {
                this.publish("input", key + "Triple", [pX, pY]);
            } else {
                this.publish("input", key + "Double", [pX, pY]);
            }
        }
        this.penultimateClick = this.lastClick;
        this.lastClick = event.timeStamp;
    }

    onMouseUp(event) {
        event.preventDefault();
        let key = "mouse" + event.button;
        if (KeyDown('Control') && key === 'mouse0') key = 'mouse2';
        if (!KeyDown(key)) return;
        const pX = event.clientX;
        const pY = event.clientY;
        this.publish("input", key + "Up", [pX, pY]);
        this.onChordUp(key);
        keys.delete(key);
    }

    onWheel(event) {
        event.preventDefault();
        const y = event.deltaY;
        this.publish("input", "wheel", y);
    }

    onMouseMove(event) {
        const pX = event.clientX;
        const pY = event.clientY;
        const dX = event.movementX;
        const dY = event.movementY;
        this.publish("input", "mouseXY", [pX, pY]);
        this.publish("input", "mouseDelta", [dX, dY]);
    }

    onTouchStart(event) {
        event.preventDefault(); // This suppresses the extra mouse events that touch automatically adds
        for (const touch of event.changedTouches) {
            const id = touch.identifier;
            const x = touch.clientX;
            const y = touch.clientY;
            const time = event.timeStamp;
            this.addTouch({id, time, start: [x,y], current: [x,y]});
            if (this.touchCount === 1) this.publish("input", "touchDown", [x,y]);
        }
        if (!this.inDouble && this.touchCount > 1) {
            this.inDouble = true;
            const t0 = this.touches[0];
            const t1 = this.touches[1];
            t0.doubleStart = t0.current;
            t1.doubleStart = t1.current;
            const mid = v2_scale(v2_add(t0.doubleStart, t1.doubleStart), 0.5);
            this.publish("input", "doubleStart", mid);
        }
    }

    onTouchEnd(event) {
        event.preventDefault(); // This suppresses the extra mouse events that touch automatically adds
        for (const touch of event.changedTouches) {
            const id = touch.identifier;
            const start = this.getTouch(id);
            this.removeTouch(id);

            if (!this.touchCount && start) { // Single touch ended
                const x = touch.clientX;
                const y = touch.clientY;
                const duration = event.timeStamp - start.time;
                const dx = x - start.start[0];
                const dy = y - start.start[1];
                const distanceX = Math.abs(dx);
                const distanceY = Math.abs(dy);
                if (duration < TAP_DURATION && distanceX < TAP_DISTANCE && distanceY < TAP_DISTANCE) this.publish("input", "touchTap", [x,y]);
                if (duration < SWIPE_DURATION && distanceX > SWIPE_DISTANCE) this.publish("input", "touchSwipeX", dx);
                if (duration < SWIPE_DURATION && distanceY > SWIPE_DISTANCE) this.publish("input", "touchSwipeY", dy);
                this.publish("input", "touchUp", [x,y]);
            }
        }
        if (this.inDouble) {
            if (this.touchCount > 1) { // Restart double context with new midpoints
                const t0 = this.touches[0];
                const t1 = this.touches[1];
                t0.doubleStart = t0.current;
                t1.doubleStart = t1.current;
                const mid = v2_scale(v2_add(t0.doubleStart, t1.doubleStart), 0.5);
                this.publish("input", "doubleEnd");
                this.publish("input", "doubleStart", mid);
            } else { // End double context
                this.inDouble = false;
                this.publish("input", "doubleEnd");
            }
        }

    }

    onTouchMove(event) {
        event.preventDefault(); // This suppresses the extra mouse events that touch automatically adds
        for (const touch of event.changedTouches) {     // Update the current position of all touches
            const id = touch.identifier;
            const t = this.getTouch(id);
            if (!t) continue;
            const x = touch.clientX;
            const y = touch.clientY;
            t.current = [x,y];
        }
        if (this.touchCount === 1) { // Drag event
            const t = this.touches[0];
            const dx = t.current[0] - t.start[0];
            const dy = t.current[1] - t.start[1];
            if (Math.abs(dx) > TAP_DISTANCE || Math.abs(dy) > TAP_DISTANCE) this.publish("input", "touchXY", t.current); // Only publish drag events that exceed the tap distance

        } else if (this.touchCount > 1) { // Double touch event
            const t0 = this.touches[0];
            const t1 = this.touches[1];

            const xy = v2_scale(v2_add(t0.current, t1.current), 0.5);

            const delta0 = v2_sub(t1.doubleStart, t0.doubleStart);
            const delta1 = v2_sub(t1.current, t0.current);

            const gap0 = v2_magnitude(delta0);
            const gap1 = v2_magnitude(delta1);
            let zoom = 1;
            if (gap0 > 0) zoom = gap1 / gap0;

            const angle0 = Math.atan2(delta0[0], delta0[1]);
            const angle1 = Math.atan2(delta1[0], delta1[1]);
            let dial = (angle1 - angle0 + TAU) % TAU;
            if (dial > Math.PI) dial -= TAU;

            this.publish("input", "doubleChanged", {xy, zoom, dial});
        }

    }

    onTouchCancel(event) {
        event.preventDefault(); // This suppresses the extra mouse events that touch automatically adds
        this.touches = [];
    }

    validDouble() {
        return this.touch0 && this.touch1;
    }

}
