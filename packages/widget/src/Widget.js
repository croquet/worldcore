import { v2_sub, v2_multiply, v2_add, v2_scale, v2_magnitude, LoadFont, LoadImage, ViewService, WorldcoreView } from "@croquet/worldcore-kernel";

// import { v2_sub, v2_multiply, v2_add, v2_scale, v2_magnitude } from "./Vector";
// import { LoadFont, LoadImage} from "./ViewAssetCache";
// import QRCode from "../lib/qr/qrcode";
// import { ViewService, WorldcoreView } from "./Root";

let ui;             // The UI manager

let pressedControls = new Map();    // Maps pointer ids to the control widget they were last pressed inside
let keyboardFocus;                  // The widget currently receiving input from the keyboard

//------------------------------------------------------------------------------------------
//-- Helper Functions ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Widget attributes can be either values or arrays ... this compares arbitrary things.

// function deepEquals(a, b) {
//     if (a === b) return true;
//     if (!a || !b) return false;
//     const al = a.length;
//     const bl = b.length;
//     if (!al || !bl) return false;
//     if (al !== bl) return false;
//     for (let i = 0; i < al; i++) if (a[i] !== b[i]) return false;
//     return true;
// }

function canvasColor(r, g, b) {
    return 'rgb(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) +')';
}

function isLetter(c) { // Returns true if the character is an alphabetic letter.
    return c.toLowerCase() !== c.toUpperCase();
}

function isDigit(c) { // Returns true if the character is a digit.
    return c.match(/[0-9]/i);
}

function isLetterOrDigit(c) {
    return isLetter(c) || isDigit(c);
}

function v4_scale(v,s) {
    return [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
}


//------------------------------------------------------------------------------------------
//-- UIManager -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The UI is the top-level UI manager. It creates the canvas that the UI is drawn on, and catches events
// and passes them to the widget tree.
//
// It re-publishes pointer events after it's given the UI widgets a chance to intercept them.
//
// Takes the device's pixel ratio into account. This can be over-ridden using SetScale.

export class UIManager extends ViewService {

    constructor(name) {
        super(name ||'UIManager');

        ui = this; // Global pointer for widgets to use.

        this.scale = 1;
        this.size = [100,100];
        this.global = [0,0];

        this.resize();
        new CanvasWidget({parent: this, autoSize: [1,1]});

        // this.fakeText = document.createElement("input"); // This is a hack to trigger a virtual keyboard on a mobile device
        // this.fakeText.setAttribute("type", "text");
        // this.fakeText.style.position = "absolute";
        // this.fakeText.value = "A"; // Fool keyboard into not automatically using caps
        // this.fakeText.style.opacity = "0";
        // this.fakeText.addEventListener("focusout", this.fakeTextBlur);
        // document.body.insertBefore(this.fakeText, null);

        this.subscribe("input", {event: "resize", handling: "immediate"}, this.resize);
        this.subscribe("input", {event: "pointerMove", handling: "immediate"}, this.pointerMove);
        this.subscribe("input", {event: "pointerDown", handling: "immediate"}, this.pointerDown);
        this.subscribe("input", {event: "pointerUp", handling: "immediate"}, this.pointerUp);
        this.subscribe("input", {event: "tap", handling: "immediate"}, this.pointerTap);
        this.subscribe("input", {event: "doubleDown", handling: "immediate"}, this.doubleDown);
        this.subscribe("input", {event: "tripleDown", handling: "immediate"}, this.tripleDown);
        this.subscribe("input", {event: "keyDown", handling: "immediate"}, this.keyDown);
        this.subscribe("input", {event: "keyRepeat", handling: "immediate"}, this.keyDown);
    }

    destroy() {
        super.destroy();
        pressedControls.clear();
        if (keyboardFocus) keyboardFocus.blur();
        if (this.root) this.root.destroy();
        ui = null;
    }

    addChild(child) {
        this.root = child;
    }

    removeChild(child) {
        this.root = null;
    }

    // addChild(root) {
    //     root.setParent(this);
    // }

    // removeChild(child) {
    //     if (this.root === child) this.root = null;
    // }

    get isVisible() { return true; }

    resize() {
        this.ratio = window.devicePixelRatio;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.size = [width, height];
        if (this.root) this.root.markChanged();
        this.publish("ui", "resize", this.size);
    }

    setScale(scale) {
        this.scale = scale;
        if (this.root) this.root.markChanged();
    }

    update() {
        if (!this.isChanged) return;
        this.isChanged = false;
        this.root.update();
    }

    markChanged() {
        this.isChanged = true;
    }

    pointerMove(event) {
        const pressed = pressedControls.get(event.id);
        if (pressed) {
            pressed.pointerDrag(event);
        } else if (event.type === "mouse" && this.root) {
            this.root.pointerMove(event);
            this.publish("ui", "pointerMove", event);
        } else {
            this.publish("ui", "pointerMove", event);
        }
    }

    pointerDown(event) {
        if (event.button !== 0) {
            this.publish("ui", "pointerDown", event);
            return;
        }
        if (this.root && this.root.pointerDown(event)) return;
        this.canTap = true;
        this.publish("ui", "pointerDown", event);
    }

    doubleDown(event) {
        if (keyboardFocus) keyboardFocus.doubleDown(event);
    }

    tripleDown(event) {
        if (keyboardFocus) keyboardFocus.tripleDown(event);
    }

    pointerUp(event) {
        if (event.button !== 0) {
            this.publish("ui", "pointerUp", event);
            return;
        }
        const pressed = pressedControls.get(event.id);
        if (pressed) {
            pressed.pointerUp(event); }
        else {
            this.canTap = false;
            this.publish("ui", "pointerUp", event);
        }
    }

    pointerTap(event) {
        if (!this.canTap) return;
        this.publish("ui", "tap", event);
    }

    keyDown(key) {
        if (keyboardFocus) keyboardFocus.keyInput(key);
    }


    // This is a hack to trigger the virtual keyboard on mobile. There is an invisible text entry element that
    // gets drawn underneath the real text entry widget. Giving this fake text field focus pops up the
    // keyboard. When we have our own virtual keyboard as part of the widget system, this should go away.

    // requestVirtualKeyboard(xy) {
    //     console.log("requet");
    //     this.fakeText.style.left = xy[0] + 'px';
    //     this.fakeText.style.top = xy[1] + 'px';
    //     this.fakeText.focus();
    // }

    // dismissVirtualKeyboard() {
    //     // this.fakeText.blur();
    // }

    // fakeTextBlur() {
    //     this.value = "A"; // This prevents the virtual keyboard from defaults to caps
    //     if (keyboardFocus) keyboardFocus.blur();
    // }

}

//------------------------------------------------------------------------------------------
//-- Widget --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The base widget class.

export class Widget extends WorldcoreView {
    constructor(options) {
        super(ui.model);
        this.set(options);
        this.buildChildren();
    }

    destroy() {
        if (this.children) this.children.forEach(child => child.destroy());
        if (this.parent) this.set({parent: null});
        this.detach();
    }

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
        this.markChanged();
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
        this.markChanged();
    }

    setCanvasWidget(canvasWidget) {
        if (canvasWidget === this.canvasWidget) return;
        this.canvasWidget = canvasWidget;
        if (this.children) this.children.forEach(child => child.setCanvasWidget(this.canvasWidget));
    }

    get cc() {return this.canvasWidget.context;}

    setCursor(c) {
        this.canvasWidget.element.style.cursor = c;
    }

    markChanged() {
        ui.markChanged();
        this.$scale = undefined;
        this.$size = undefined;
        this.$global = undefined;
        this.$origin = undefined;
        if (this.isChanged) return;
        this.isChanged = true;
        if (this.bubbleChanges && this.parent) this.parent.markChanged();
        if (this.children) this.children.forEach(child => child.markChanged());
    }

    // Mark the whole canvas changed (used for hiding widgets)
    markCanvasChanged() {
        if (this.canvasWidget) this.canvasWidget.markChanged();
    }

    set(options = {}) {
        if (options.parent && options.parent.canvasWidget) this.setCanvasWidget(options.parent.canvasWidget);
        const oldParent = this.parent;
        for (const option in options) {
            const n = "_" + option;
            this[n] = options[option];
        }

        if ('parent' in options ) {
            if (oldParent) oldParent.removeChild(this);
            if (this.parent) this.parent.addChild(this);
        }
        if ('visible' in options || options.scale ) this.markCanvasChanged();
        this.markChanged();
    }

    show() { this.set({visible: true}); }
    hide() { this.set({visible: false}); }
    toggleVisible() { this.set({visible: !this.isVisible}); }

    get parent() {return this._parent; }
    get anchor() { return this._anchor || [0,0];}
    get pivot() { return this._pivot || [0,0];}
    get local() { return this._local || [0,0];}
    get autoSize() { return this._autoSize || [0,0];}
    get isClipped() { return this._clip; }  // Default to false
    get isVisible() { return this._visible === undefined || this._visible;} // Default to true
    get visible() { return this._visible === undefined || this._visible;} // Default to true
    get color() { return this._color || [0,0,0];}
    get bubbleChanges() { return this._bubbleChanges; } // Default to false
    get rawSize() { return this._size || [100,100];}
    get lockAspectRatio() { return this._lockAspectRatio }; // Use with autoSize [1,0] or [0,1] to scale widget while preserving aspect ratio

    get width() { return this._width || 0};
    get height() { return this._height || 0};

    get opacity() { // Children don't inherit opacity, but the opacity of a canvas applies to everything drawn on it.
        if (this._opacity === undefined) return 1;
        return (this._opacity);
    }

    get scale() {
        if (this.$scale) return this.$scale;
        this.$scale = this._scale || 1;
        if (this.parent) this.$scale *= this.parent.scale;
        return this.$scale;
    }

    get border() { return v4_scale((this._border || [0,0,0,0]), this.scale); }

    // Returns the size of the drawable area
    get size() {
        if (this.$size) return this.$size;
        const size = this._size || [100,100];
        this.$size = v2_scale(size, this.scale);
        if (this.parent) {
            const parentSize = this.parent.size;
            if (this.autoSize[0]) {
                this.$size[0] = parentSize[0] * this.autoSize[0];
                if (this.lockAspectRatio && size[0] && !this.autoSize[1]) this.$size[1] = this.$size[0] * size[1] / size[0];
            }
            if (this.autoSize[1]) {
                this.$size[1] = parentSize[1] * this.autoSize[1];
                if (this.lockAspectRatio && size[1] && !this.autoSize[0]) this.$size[0] = this.$size[1] * size[0] / size[1];
            }
        }
        const border = this.border;
        this.$size[0] -= (border[0] + border[2]);
        this.$size[1] -= (border[1] + border[3]);
        return this.$size;
    }

    // Returns the upper left corner in global coordinates
    get global() {
        if (this.$global) return this.$global;
        const local = v2_scale(this.local, this.scale);
        // const local = this.local;
        if (this.parent) {
            const border = this.border;
            const size = [...this.size];
            size[0] += (border[0] + border[2]);
            size[1] += (border[1] + border[3]);
            const anchor = v2_multiply(this.parent.size, this.anchor);
            const pivot = v2_multiply(size, this.pivot);
            const offset = v2_sub(anchor, pivot);
            const ulBorder = [border[0], border[1]];
            this.$global = v2_add(this.parent.global, v2_add(ulBorder, v2_add(local, offset)));
        } else {
            this.$global = local;
        }
        return this.$global;
    }

    // Returns the upper left corner relative to the drawing canvas
    get origin() {
        if (this.$origin) return this.$origin;
        this.$origin = v2_sub(this.global, this.canvasWidget.global);
        return this.$origin;
    }

    //Returns true if the global point is inside the element
    inside(xy) {
        const x = xy[0];
        const y = xy[1];
        if (x < this.global[0] || x > (this.global[0] + this.size[0])) return false;
        if (y < this.global[1] || y > (this.global[1] + this.size[1])) return false;
        return true;
    }

    pointerMove(event) {
        if (!this.isVisible) return;
        if (this.children) this.children.forEach(child => child.pointerMove(event));
    }

    pointerDown(event) {
        if (!this.isVisible) return false;
        let consumed = false;
        if (this.children) this.children.forEach(child => consumed = child.pointerDown(event) || consumed);
        return consumed;
    }

    pointerUp(event) {}

    pointerDrag(event) {}

    update() {
        if (!this.isVisible) return;
        this.cc.save();
        this.cc.globalAlpha = this.opacity;
        if (this.isClipped) this.clip();
        if (this.isChanged) this.draw();
        if (this.children) this.updateChildren();
        this.cc.restore();
        this.isChanged = false;
    }

    // Some complex widgets need more control over how they build and update their children
    buildChildren() {}

    updateChildren() {
        this.children.forEach(child => child.update());
    }

    clip() {
        this.cc.rect(this.global[0], this.global[1], this.size[0], this.size[1]);
        this.cc.clip();
    }

    clear() {
        const xy = this.global;
        const size = this.size;
        this.cc.clearRect(xy[0], xy[1], size[0], size[1]);
    }

    draw() {}

}

//------------------------------------------------------------------------------------------
//-- ElementWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Manages an independent DOM element as a widget.

export class ElementWidget extends Widget {

    destroy() {
        super.destroy();
        this.element.remove();
    }

    get color() { return this._color; } // Null = transparent
    get zIndex() { if (this._zIndex === undefined) { return 1; } return this._zIndex; }

    visiblityChanged() {
        this.draw();
        super.visiblityChanged();
    }

    get ancestorsAreVisible() {
        let v = this.isVisible;
        let p = this.parent;
        while (p) {
            v = v && p.isVisible;
            p = p.parent;
        }
        return v;
    }

    draw() {
        this.element.style.zIndex = "" + this.zIndex;
        this.element.style.opacity = "" + this.opacity;
        if (this.color) {
            this.element.style.background = canvasColor(...this.color);
        } else {
            this.element.style.background = 'transparent';
        }

        const ratio = ui.ratio;
        if (this.ancestorsAreVisible) {
            this.element.style.display = 'inline';
        } else {
            this.element.style.display = 'none';
        }
        const left = this.global[0];
        const top = this.global[1];
        const width = this.size[0];
        const height = this.size[1];
        this.element.width = width * ratio;
        this.element.height = height * ratio;
        this.element.style.top = top + "px";
        this.element.style.left = left + "px";
        this.element.style.width = width + "px";
        this.element.style.height = height + "px";
    }
}

//------------------------------------------------------------------------------------------
//-- CanvasWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CanvasWidget extends ElementWidget {
    constructor(...args) {
        super(...args);
        this.element = document.createElement("canvas");
        this.element.style.cssText = "position: absolute; left: 0; top: 0; border: 0;";
        document.body.insertBefore(this.element, null);

        this.context = this.element.getContext('2d');
        this.canvasWidget = this;
    }

    markChanged() {
        super.markChanged();
    }

    setCanvasWidget() {
        this.canvasWidget = this;
        if (this.children) this.children.forEach(child => child.setCanvasWidget(this.canvasWidget));
    }

    draw() {
        super.draw();
        this.cc.scale(ui.ratio, ui.ratio);
        this.clear();
    }
}

//------------------------------------------------------------------------------------------
//-- IFrameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class IFrameWidget extends ElementWidget {
//     constructor(...args) {
//         super(...args);
//         this.element = document.createElement("iframe");
//         this.element.style.cssText = "position: absolute; left: 0; top: 0; border: 0;";
//         document.body.insertBefore(this.element, null);
//     }

//     get source() { return this._source || ""; }

//     update() {
//         if (this.isChanged) this.draw();
//         this.isChanged = false;
//     }

//     draw() {
//         super.draw();
//         this.element.src = this.source;
//     }

// }

//------------------------------------------------------------------------------------------
//-- LayoutWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class LayoutWidget extends Widget {
    constructor(...args) {
        super(...args);
        this.slots = [];
        this.markChanged();
    }

    updateChildren() {
        if (this.isChanged) this.resizeSlots();
        this.slots.forEach(slot => slot.update());
    }

    resizeSlots() {}

    get slotCount() { return this.slots.size; }
    get margin() { return this._margin || 0; }

    slot(n) {
        return this.slots[n];
    }

    addSlot(w,n) {
        n = n || this.slots.length;
        w.set({parent: this, bubbleChanges: true});
        this.slots.splice(n,0,w);
        this.markChanged();
    }

    removeSlot(n) {
        if (this.slots[n]) this.slots[n].set({parent: null});
        this.slots.splice(n,1);
        this.markChanged();
    }

    destroySlot(n) {
        if (this.slots[n]) this.slots[n].destroy();
        this.slots.splice(n,1);
        this.markChanged();
    }

    destroyAllSlots() {
        this.slots.forEach(slot => slot.destroy());
        this.slots = [];
        this.markChanged();
    }

}

//------------------------------------------------------------------------------------------
//-- HorizontalWidget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class HorizontalWidget extends LayoutWidget {

    addSlot(w,n) {
        super.addSlot(w,n);
        w.set({autoSize: [0,1]});
    }

    resizeSlots() {
        let widthSum = Math.max(0, (this.slots.length - 1) * this.margin);
        let autoCount = 0;
        this.slots.forEach(slot => {
            if (slot.width) {
                widthSum += slot.width;
            } else {
                autoCount++;
            }
        });

        let autoWidth = 0;
        if (autoCount > 0) autoWidth = Math.max(0, (this.size[0] / this.scale - widthSum) / autoCount);
        let offset = 0;
        this.slots.forEach(slot => {
            let width = autoWidth;
            if (slot.width) width = slot.width;
            slot.set({size:[width, 0], local:[offset,0]});
            offset += width + this.margin;
        });
    }

}

//------------------------------------------------------------------------------------------
//-- VerticalWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class VerticalWidget extends LayoutWidget {

    addSlot(w,n) {
        super.addSlot(w,n);
        w.set({autoSize: [1,0]});
    }

    resizeSlots() {
        let heightSum = Math.max(0, (this.slots.length - 1) * this.margin);
        let autoCount = 0;
        this.slots.forEach(slot => {
            if (slot.height) {
                heightSum += slot.height;
            } else {
                autoCount++;
            }
        });

        let autoHeight = 0;
        if (autoCount > 0) autoHeight = Math.max(0, (this.size[1] / this.scale - heightSum) / autoCount);
        let offset = 0;
        this.slots.forEach(slot => {
            let height = autoHeight;
            if (slot.height) height = slot.height;
            slot.set({size: [0, height], local:[0, offset]});
            offset += height + this.margin;
        });
    }

}

//------------------------------------------------------------------------------------------
//-- EmptyWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Clears the background when its drawn

export class EmptyWidget extends Widget {

    draw() {
        this.clear();
    }

}

//------------------------------------------------------------------------------------------
//-- BoxWidget -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws an area filled with a solid color.

export class BoxWidget extends Widget {

    draw() {
        const xy = this.origin;
        const size = this.size;
        this.cc.fillStyle = canvasColor(...this.color);
        this.cc.fillRect(xy[0], xy[1], size[0], size[1]);
    }

}

//------------------------------------------------------------------------------------------
//-- ImageWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Displays an image.

export class ImageWidget extends Widget {

    get image() { return this._image; }     // A canvas
    get url() { return this._url; }

    set(options = {}) {
        super.set(options);
        if (options.url ) this.loadFromURL(options.url);
    }

    loadFromURL(url) {
        this._image = LoadImage(url, image => {
            this._image = image;
            this.markChanged();
        });
        this.markChanged();
    }

    loadFromCanvas(c) {
        this._image = c;
        this.markChanged();
    }

    draw() {
        if (!this.image) return;
        const xy = this.origin;
        const size = this.size;
        this.cc.drawImage(this.image, xy[0], xy[1], size[0], size[1]);
    }

}

//------------------------------------------------------------------------------------------
//-- QRWidget ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class QRWidget extends ImageWidget {

//     get text() { return this._text; }

//     set(options = {}) {
//         super.set(options);
//         if (options.text) this.makeFromText(options.text);
//     }

//     destroy() {
//         super.destroy();
//         if (this._element) this._element.remove();
//     }

//     makeFromText(t) {
//         if (!this._element) this._element = document.createElement('div');
//         this.markChanged();
//         const code = new QRCode(this._element, {
//             text: t,
//             width: 128,
//             height: 128,
//             colorDark: "#000000",
//             colorLight: "#ffffff",
//             correctLevel: QRCode.CorrectLevel.L   // L, M, Q, H
//         });
//         if (code) this.loadFromCanvas(code.getCanvas());
//     }

// }

//------------------------------------------------------------------------------------------
//-- NineSliceWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Displays a nine-slice image that scales to preserve the proportions of its edges.

export class NineSliceWidget extends ImageWidget {

    get inset() { return this._inset || [32, 32, 32, 32];}              // Offset in pixels from edge of image to make slices
    get insetScale() { return (this._insetScale || 1) * this.scale;}    // Scaling factor to translate inset to screen pixels

    draw() {
        if (!this.image) return;
        const height = this.image.height;
        const width = this.image.width;
        const xy = this.origin;
        const x = xy[0];
        const y = xy[1];
        const size = this.size;
        const xSize = size[0];
        const ySize = size[1];
        const left = this.inset[0];
        const top = this.inset[1];
        const right = this.inset[2];
        const bottom = this.inset[3];
        const insetScale = this.insetScale;

        // Left Column
        this.cc.drawImage(
            this.image,
            0, 0,
            left, top,
            x, y,
            left * insetScale, top * insetScale
        );
        this.cc.drawImage(
            this.image,
            0, top,
            left, height - top - bottom,
            x, y + top * insetScale,
            left * insetScale, ySize - (top + bottom) * insetScale
        );
        this.cc.drawImage(
            this.image,
            0, height - bottom,
            left, bottom,
            x, y + ySize- bottom * insetScale,
            left * insetScale, bottom * insetScale
        );

        //Middle Column
        this.cc.drawImage(
            this.image,
            left, 0,
            width - left - right, top,
            x + left * insetScale, y,
            xSize - (left + right) * insetScale, top * insetScale
        );
        this.cc.drawImage(
            this.image,
            left, top,
            width - left - right, height - top - bottom,
            x + left * insetScale, y + top * insetScale,
            xSize - (left + right) * insetScale, ySize - (top + bottom) * insetScale
        );
        this.cc.drawImage(
            this.image,
            left, height - bottom,
            width - left - right, bottom,
            x + left * insetScale, y + ySize - bottom * insetScale,
            xSize - (left + right) * insetScale, bottom * insetScale
        );

        // Right Column
        this.cc.drawImage(
            this.image,
            width-right, 0,
            right, top,
            x + xSize - right * insetScale, y,
            right * insetScale, top * insetScale
        );
        this.cc.drawImage(
            this.image,
            width-right, top,
            right, height - top - bottom,
            x + xSize - right * insetScale, y + top * insetScale,
            right * insetScale, ySize - (top + bottom) * insetScale
        );
        this.cc.drawImage(
            this.image,
            width-right, height - bottom,
            right, bottom,
            x + xSize - right * insetScale, y + ySize - bottom * insetScale,
            right * insetScale, bottom * insetScale
        );

    }

}

//------------------------------------------------------------------------------------------
//-- TextWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a piece of static text.
//
// Text should always be drawn over some background widget to refresh properly. When a text
// widget is updated, it triggers a refresh of its parent. If you floating text, put in in an
// EmptyWidget.
//
// Needs:
//
// * Selection methods for multiline text
// * Maybe single and multiline text get split into different widgets?

export class TextWidget extends Widget {

    setFontByURL(url) {
        this._font = LoadFont(url, () => this.markChanged());
        this.markChanged();
    }

    get fontURL() { return this._fontURL; }
    get bubbleChanges() { return this._bubbleChanges === undefined || this._bubbleChanges;} // Override to default to true
    get text() { if (this._text !== undefined) return this._text; return "Text";}
    get font() { return this._font || "sans-serif";}
    get point() { return (this._point || 24) * this.scale;}
    get lineSpacing() { return (this._lineSpacing || 0) * this.scale;}
    get style() { return this._style || "normal";}
    get alignX() { return this._alignX || "center";}
    get alignY() { return this._alignY || "middle";}
    get wrap() { return this._wrap === undefined || this._wrap;} // Default to true

    set(options = {}) {
        super.set(options);
        if (options.fontURL) this.setFontByURL(this.fontURL);
    }

    // Breaks lines by word wrap or new line.

    get lines() {

        this.cc.textAlign = this.alignX;
        this.cc.textBaseline = this.alignY;
        this.cc.font = this.style + " " + this.point + "px " + this.font;
        this.cc.fillStyle = canvasColor(...this.color);

        if (!this.wrap) return this.text.split('\n');
        const spaceWidth = this.cc.measureText(' ').width;
        const sizeX = this.size[0];
        const words = this.text.split(' ');
        const out = [];
        let sum = sizeX+1;
        words.forEach( word => {
            const wordWidth = this.cc.measureText(word).width;
            if (word.includes('\n')) {
                const split = word.split('\n');
                split.forEach((s,i) => {
                    const sWidth = this.cc.measureText(s).width;
                    if (i > 0 || sum + spaceWidth + sWidth > sizeX) {
                        sum = sWidth;
                        out.push(s);
                    } else {
                        sum += spaceWidth + sWidth;
                        out[out.length-1] += ' ' + s;
                    }
                });
            } else if (sum + spaceWidth + wordWidth > sizeX) {
                sum = wordWidth;
                out.push(word);
            } else {
                sum += spaceWidth + wordWidth;
                out[out.length-1] += ' ' + word;
            }
        });
        return out;
    }

    get lineHeight() {
        return this.point + this.lineSpacing;
    }

    get textHeight() {
        return this.lines.length * this.lineHeight;
    }

    draw() {
        const lineHeight = (this.point + this.lineSpacing);

        // this.cc.textAlign = this.alignX;
        // this.cc.textBaseline = this.alignY;
        // this.cc.font = this.style + " " + this.point + "px " + this.font;
        // this.cc.fillStyle = canvasColor(...this.color);

        const lines = this.lines;

        let xy = [0,0];
        let yOffset = 0;
        if (this.alignX === "center") {
            xy[0] = this.size[0] / 2;
        } else if (this.alignX === "right") {
            xy[0] = this.size[0];
        }
        if (this.alignY === "middle") {
            xy[1] = this.size[1] / 2;
            yOffset = lineHeight * (lines.length-1) / 2;
        } else if (this.alignY === "bottom") {
            xy[1] = this.size[1];
            yOffset = lineHeight * (lines.length-1);
        }
        xy = v2_add(this.origin, xy);

        lines.forEach((line,i) => {
            const o = (i * lineHeight) - yOffset;
            this.cc.fillText(line, xy[0], xy[1] + o);
        });
    }

    pixelWidth() { // Returns the full width of the text in pixels given the current font.
        this.cc.font = this.style + " " + this.point + "px " + this.font;
        return this.cc.measureText(this.text).width;
    }

    findSelect(x) { // Given a point in local coordinates, finds the selection point in the text string.
        this.cc.font = this.style + " " + this.point + "px " + this.font;
        const c = [...this.text];
        let sum = 0;
        for (let i = 0; i < c.length; i++) {
            const w = this.cc.measureText(c[i]).width;
            if (x < sum + w/2) return i;
            sum += w;
        }
        return c.length;
    }

    findLetterOffset(n) { // Given a position in the text, finds the x offset in local coordinates.
        this.cc.font = this.style + " " + this.point + "px " + this.font;
        const c = [...this.text];
        let offset = 0;
        n = Math.min(n, c.length);
        for (let i = 0; i < n; i++) {
            offset += this.cc.measureText(c[i]).width;
        }
        return Math.max(0, Math.floor(offset));
    }

}

//------------------------------------------------------------------------------------------
//-- ControlWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Consumes pointer events, but lets you interact with its children.

export class PanelWidget extends  Widget {

    pointerDown(event) {
        if (!this.isVisible) return false;
        if (this.children) this.children.forEach(child => child.pointerDown(event));
        return true;
    }
}


//------------------------------------------------------------------------------------------
//-- ControlWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Base class for all widgets that can be interacted with.

// Control widgets have enabled/disabled states. The disabled state is implemented with a translucent overlay.
// If the widget has an irregular shape, you'll need to provide an overlay that matches the control shape.

export class ControlWidget extends Widget {

    get dim() {return this._dim;}
    get isDisabled() { return this._disabled;}
    get disabled() { return this._disabled;}

    set(options = {}) {
        const oldDim = this.dim;
        super.set(options);
        if (options.dim) { if (oldDim) oldDim.destroy(); options.dim.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
    }

    buildChildren() {
        super.buildChildren();
        if (!this.dim) this.set({ dim: new BoxWidget({color: [0.8,0.8,0.8], opacity: 0.6})});
        // this.setDim(new BoxWidget(this, {autoSize: [1,1], color: [0.8,0.8,0.8], opacity: 0.6, bubbleChanges: true}));
    }

    enable() { this.set({ disabled: false }); }
    disable() { this.set({ disabled: true }); }
    toggleDisabled() { this.set({ disabled: !this.disabled }); }

    pointerMove(event) {
        const inside = this.inside(event.xy);
        if (!this.isVisible || this.isDisabled || this.isHovered === inside) return;
        this.isHovered = inside;
        this.markChanged();
        this.isHovered ? this.onHover() : this.onUnhover();
    }

    pointerDrag(event) {
        const inside = this.inside(event.xy);
        this.onDrag(event.xy);
        if (this.isPressed === inside) return;
        this.isPressed = inside;
        this.markChanged();
    }

    pointerDown(event) {
        if (!this.isVisible || this.isDisabled || !this.inside(event.xy)) return false;
        pressedControls.set(event.id, this);
        this.isPressed = true;
        this.markChanged();
        this.onPress(event.xy);
        return true;
    }

    pointerUp(event) {
        pressedControls.delete(event.id);
        this.isPressed = false;
        this.markChanged();
        this.onRelease(event.xy);
        if (this.inside(event.xy)) this.doClick(event.xy);
    }

    onHover() {}
    onUnhover() {}
    onPress(xy) {}
    onRelease(xy) {}
    onDrag(xy) {}
    doClick(xy) {} // Release while pressed and pointer is inside

}

//------------------------------------------------------------------------------------------
//-- FocusWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Controls that can receive keyboard focus. Only one widget at a time can have focus.
// Focus widgets also can receive double and triple clicks.

// export class FocusWidget extends ControlWidget {

//     pointerDown(event) {
//         const result = super.pointerDown(event);
//         result ? this.focus() : this.blur();
//         return result;
//     }

//     doubleDown(event) {
//         if (!this.isVisible || this.isDisabled || !this.inside(event.xy)) return;
//         this.onDoubleDown(event.xy);
//     }

//     tripleDown(event) {
//         if (!this.isVisible || this.isDisabled || !this.inside(event.xy)) return;
//         this.onTripleDown(event.xy);
//     }

//     get isFocused() {return this === keyboardFocus};

//     focus() {
//         if (this.isFocused) return;
//         if (keyboardFocus) keyboardFocus.blur();
//         keyboardFocus = this;
//         this.onFocus();
//     }

//     blur() {
//         if (keyboardFocus !== this) return;
//         keyboardFocus = null;
//         this.onBlur();
//     }

//     onFocus() {}
//     onBlur() {}
//     onDoubleDown() {}
//     onTripleDown() {}
// }


//------------------------------------------------------------------------------------------
//-- ButtonWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a pressable button.
//
// The Normal/Hovered/Pressed Box widgets can be replaced by NineSlice widgets for prettier buttons.

export class ButtonWidget extends ControlWidget {

    get normal() {return this._normal;}
    get hilite() {return this._hilite;}
    get pressed() {return this._pressed;}
    get label() {return this._label;}
    get onClick() {return this._onClick || (()=>{})};

    set(options = {}) {
        const oldNormal = this.normal;
        const oldHilite = this.hilite;
        const oldPressed = this.pressed;
        const oldLabel = this.label;

        super.set(options);

        if (options.normal) { if (oldNormal) oldNormal.destroy(); options.normal.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.hilite) { if (oldHilite) oldHilite.destroy(); options.hilite.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.pressed) {if (oldPressed) oldPressed.destroy(); options.pressed.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.label) { if (oldLabel) oldLabel.destroy(); options.label.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
    }

    buildChildren() {
        super.buildChildren();
        if (!this.normal) this.set({ normal: new BoxWidget({color: [0.5,0.5,0.5]})});
        if (!this.hilite) this.set({ hilite: new BoxWidget({color: [0.65,0.65,0.65]})});
        if (!this.pressed) this.set({ pressed: new BoxWidget({color: [0.35,0.35,0.35]})});
        if (!this.label) this.set({ label: new TextWidget({text: "Button"})});
    }

    updateChildren() {
        let background = this.normal;
        if (this.isHovered) background = this.hilite;
        if (this.isPressed) background = this.pressed;
        if (background) background.update();
        if (this.label) this.label.update();
        if (this.isDisabled) this.dim.update();
    }

    doClick() { this.onClick(); }
}

//------------------------------------------------------------------------------------------
//-- ToggleWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a button that can be toggled between an on and off state.

export class ToggleWidget extends ControlWidget {

    constructor(...args) {
        super(...args);
        if (!this._state) this._state = false; // Prevent toggleOff when an undefined state is set to false.
    }

    get normalOn() {return this._normalOn;}
    get normalOff() {return this._normalOff;}
    get hiliteOn() {return this._hiliteOn;}
    get hiliteOff() {return this._hiliteOff;}
    get pressedOn() {return this._pressedOn;}
    get pressedOff() {return this._pressedOff;}
    get labelOn() {return this._labelOn;}
    get labelOff() {return this._labelOff;}
    get onToggleOn() {return this._onToggleOn || (()=>{})};
    get onToggleOff() {return this._onToggleOff || (()=>{})};

    destroy() {
        super.destroy();
        if (this.toggleSet) this.toggleSet.remove(this);
    }

    buildChildren() {
        super.buildChildren();

        if (!this.normalOn) this.set({normalOn: new BoxWidget({color: [0.5,0.5,0.7]})});
        if (!this.normalOff) this.set({normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]})});
        if (!this.hiliteOn) this.set({hiliteOn: new BoxWidget({color: [0.6, 0.6, 0.8]})});
        if (!this.hiliteOff) this.set({hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]})});
        if (!this.pressedOn) this.set({pressedOn: new BoxWidget({color: [0.4, 0.4, 0.6]})});
        if (!this.pressedOff) this.set({pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]})});
        if (!this.labelOn) this.set({labelOn: new TextWidget({text: "On"})});
        if (!this.labelOff) this.set({labelOff: new TextWidget({text: "Off"})});

    }

    get isOn() { return this._state; }
    get state() { return this._state; }
    get toggleSet() { return this._toggleSet; }

    set(options = {}) {
        const oldNormalOn = this.normalOn;
        const oldNormalOff = this.normalOff;
        const oldHiliteOn = this.hiliteOn;
        const oldHiliteOff = this.hiliteOff;
        const oldPressedOn = this.pressedOn;
        const oldPressedOff = this.pressedOff;
        const oldLabelOn = this.labelOn;
        const oldLabelOff = this.labelOff;
        const oldState = this.state;
        const oldToggleSet = this.toggleSet;

        super.set(options);

        if (options.normalOn) { if (oldNormalOn) oldNormalOn.destroy(); options.normalOn.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.normalOff) { if (oldNormalOff) oldNormalOff.destroy(); options.normalOff.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.hiliteOn) { if (oldHiliteOn) oldHiliteOn.destroy(); options.hiliteOn.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.hiliteOff) { if (oldHiliteOff) oldHiliteOff.destroy(); options.hiliteOff.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.pressedOn) {if (oldPressedOn) oldPressedOn.destroy(); options.pressedOn.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.pressedOff) {if (oldPressedOff) oldPressedOff.destroy(); options.pressedOff.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.labelOn) { if (oldLabelOn) oldLabelOn.destroy(); options.labelOn.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.labelOff) { if (oldLabelOff) oldLabelOff.destroy(); options.labelOff.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }

        if ('toggleSet' in options && oldToggleSet !== this.toggleSet) {
            if (oldToggleSet) oldToggleSet.remove(this);
            if (this.toggleSet) this.toggleSet.add(this);
        }
        if ('state' in options && oldState !== this.state) this.stateChanged();
    }

    updateChildren() {
        let background;
        let label;
        if (this.isOn) {
            background = this.normalOn;
            if (this.isHovered) background = this.hiliteOn;
            if (this.isPressed) background = this.pressedOn;
            label = this.labelOn;
        } else {
            background = this.normalOff;
            if (this.isHovered) background = this.hiliteOff;
            if (this.isPressed) background = this.pressedOff;
            label = this.labelOff;
        }
        if (background) background.update();
        if (label) label.update();
        if (this.isDisabled) this.dim.update();
    }

    doClick() {
        if (this.toggleSet) {
            this.toggleSet.pick(this);
        } else {
            this.set({state: !this.isOn});
        }
    }

    stateChanged() {
        if (this.state) {
            this.onToggleOn();
        } else {
            this.onToggleOff();
        }
    }

}

//------------------------------------------------------------------------------------------
//-- ToggleSet -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Helper class that manages a linked set of toggle widgets. You can pass a list of toggles
// into the constructor.

export class ToggleSet  {
    constructor(...args) {
        this.toggles = new Set();
        args.forEach(arg => arg.set({toggleSet: this}));
    }

    add(toggle) {
        if (this.toggles.has(toggle)) return;
        if (toggle.toggleSet !== this) toggle.set({toggleSet: this});
        this.toggles.add(toggle);
    }

    remove(toggle) {
        if (toggle.toggleSet === this) toggle.set({toggleSet: undefined});
        this.toggles.delete(toggle);
    }

    pick(on) {
        on.set({state: true});
        this.toggles.forEach(toggle => { if (toggle !== on) toggle.set({state: false}); });
    }

}


//------------------------------------------------------------------------------------------
//-- SliderWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Managages a slider.
//
// The Bar and Knob can be replaced by Image/NineSlice widgets for a prettier look.
// The Knob will always be square and matches the short dimension of the bar.
//
// Since drag updates can be very high-frequency, you can set a throttle to limit the
// update frequency to once per x milliseconds

export class SliderWidget extends ControlWidget {

    constructor(...args) {
        super(...args);
        this.lastChangeTime = this.time;
    }

    set(options = {}) {
        const oldBar = this.bar;
        const oldKnob = this.knob;

        super.set(options);

        if (options.bar) { if (oldBar) oldBar.destroy(); options.bar.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.knob) { if (oldKnob) oldKnob.destroy(); options.knob.set({parent: this, bubbleChanges: true}); this.setKnobSize(); }
    }

    get bar() { return this._bar }
    get knob() { return this._knob}
    get throttle() { return this._throttle || 0}; // MS between control updates
    get isHorizontal() { return this.size[0] > this.size[1]; }
    get step() { return this._step || 0; }        // The number of descrete steps the slider has. (0=continuous)
    get percent() {
        const p = this._percent || 0;
        if (!this.step) return p;
        return Math.round(p * (this.step-1)) / (this.step-1);
    }
    get onChange() {return this._onChange || ((p)=>{})};

    buildChildren() {
        super.buildChildren();
        if (!this.bar) this.set({bar: new BoxWidget({color: [0.5,0.5,0.5]})});
        if (!this.knob) this.set({knob: new BoxWidget({color: [0.8,0.8,0.8], border:[2,2,2,2]})});
    }

    setKnobSize() {
        if (this.isHorizontal) {
            this.knob.set({autoSize:[0,1], size:[this.size[1]/this.scale, this.size[1]/this.scale]});
        } else {
            this.knob.set({autoSize:[1,0], size:[this.size[0]/this.scale, this.size[0]/this.scale]});
        }
        this.refreshKnob();
    }

    updateChildren() {
        this.refreshKnob();
        if (this.bar) this.bar.update();
        if (this.knob) this.knob.update();
        if (this.isDisabled) this.dim.update();
    }

    refreshKnob() {
        const xy = this.knob.local;
        if (this.isHorizontal) {
            xy[0] = (this.size[0] - (this.knob.size[0] + this.knob.border[0] + this.knob.border[2])) * this.percent / this.scale;
        } else {
            xy[1] = (this.size[1] - (this.knob.size[1] + this.knob.border[1] + this.knob.border[3])) * this.percent / this.scale;
        }
        this.knob.set({local:xy});
    }

    onPress(xy) {
        this.moveKnob(xy);
        this.change(this.percent);
    }

    onRelease(xy) {
        this.moveKnob(xy);
        this.change(this.percent);
    }

    onDrag(xy) {
        this.moveKnob(xy);
        this.throttledChange(this.percent);
    }

    moveKnob(xy) {
        const local = v2_sub(xy, this.global);
        let p;
        if (this.isHorizontal) {
            p = Math.max(0,Math.min(1,local[0] / this.size[0]));
        } else {
            p = Math.max(0,Math.min(1,local[1] / this.size[1]));
        }
        this.set({percent: p});

    }

    change(p) {
        this.lastChangeTime = this.time;
        this.lastChangeCache = null;
        this.onChange(p);
    }

    throttledChange(p) {
        if (this.time < this.lastChangeTime + this.throttle) {
            this.lastChangeCache = p;
        } else {
            this.change(p);
        }
    }

    update() {
        super.update();
        if (this.lastChangeCache && this.time >= this.lastChangeTime + this.throttle) this.change(this.lastChangeCache);
    }


}

//------------------------------------------------------------------------------------------
//-- JoystickWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Managages a virtual joystick.
//
// The background and the knob can be set to image or nine-slice widgets to look prettier.
//
// Don't mess with the gate. It's a helper widget to limit the movement of the knob.
//
// The joystick outputs an xy vector. Each value can range from -1 to 1. The magnitude of the
// vector will never exceed 1.
//
// The deadRadius is the deadzone at the center of the joystick that always returns 0. It's % of
// the total radius of the control.
//
// Since drag updates can be very high-frequency, you can set a throttle to limit the
// update frequency to once per x milliseconds



export class JoystickWidget extends ControlWidget {

    constructor(...args) {
        super(...args);
        this.gate = new Widget({parent: this, anchor: [0.5, 0.5], pivot: [0.5, 0.5], autoSize: [1, 1], border: [10,10,10,10], bubbleChanges: true});
        this.knob.set({parent: this.gate});
        this.lastChangeTime = this.time;
        this.xy = [0,0];
    }

    set(options = {}) {
        const oldBackground = this.background;
        const oldKnob = this.knob;
        super.set(options);
        if (options.background) { if (oldBackground) oldBackground.destroy(); options.background.set({parent: this, autoSize: [1,1], bubbleChanges: true}); }
        if (options.knob) {
            if (oldKnob) oldKnob.destroy();
            options.knob.set({parent: this.gate, anchor: [0.5, 0.5], pivot: [0.5,0.5], bubbleChanges: true});
            const size = this.knob.rawSize;
            const x = size[0] / 2;
            const y = size[1] / 2;
            if (this.gate) this.gate.set({border: [x,y,x,y]});
        }
    }

    get throttle() { return this._throttle || 0} // MS between control updates
    get deadRadius() { return this._deadRadius || 0.1}
    get background() { return this._background }
    get knob() { return this._knob }
    get onChange() {return this._onChange || (xy=>{})};

    buildChildren() {
        super.buildChildren();
        if (!this.background) this.set({ background: new BoxWidget({color: [0.5,0.5,0.5]})});
        if (!this.knob) this.set({knob: new BoxWidget({color: [0.8,0.8,0.8], size: [20,20]})})
    }

    recenter() {
        this.knob.set({anchor: [0.5,0.5]});
        this.xy = [0,0];
    }

    onPress(xy) {
        this.moveKnob(xy);
        this.change(this.xy);
    }

    onRelease(xy) {
        this.recenter();
        this.change(this.xy);
    }

    onDrag(xy) {
        this.moveKnob(xy);
        this.throttledChange(this.xy);
    }

    moveKnob(xy) {
        const local = v2_sub(xy, this.gate.global);

        const x = 2 * local[0] / this.gate.size[0] - 1;
        const y = 2 * local[1] / this.gate.size[1] - 1;
        let v = [x,y];
        const m = v2_magnitude(v);

        if (m == 0) {
            this.recenter();
            return;
        }

        const n = v2_scale(v, 1/m);
        if (m > 1) v = n;

        this.knob.set({anchor: [(v[0]+1)/2,(v[1]+1)/2]});

        const clamp = Math.max(0, v2_magnitude(v)-this.deadRadius) / (1-this.deadRadius);
        this.xy = v2_scale(n,clamp);
    }

    change(xy) {
        this.lastChangeTime = this.time;
        this.lastChangeCache = null;
        this.onChange(xy);
    }

    throttledChange(xy) {
        if (this.time < this.lastChangeTime + this.throttle) {
            this.lastChangeCache = xy;
        } else {
            this.change(xy);
        }
    }

    update() {
        super.update();
        if (this.lastChangeCache && this.time >= this.lastChangeTime + this.throttle) this.change(this.lastChangeCache);
    }

}

//------------------------------------------------------------------------------------------
//-- TextFieldWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A single line of text that can be typed into.

// export class TextFieldWidget extends FocusWidget {

//     get leftSelect() { return this._leftSelect || 0; }
//     get rightSelect() { return this._rightSelect || 0; }
//     get hiliteSize() { return (this.rightOffset - this.leftOffset); }
//     get multipleSelected() { return this.leftSelect !== this.rightSelect; }

//     get leftOffset() { return this.text.findLetterOffset(this.leftSelect) / this.scale;}
//     get rightOffset() { return this.text.findLetterOffset(this.rightSelect) / this.scale;}

//     buildChildren() {
//         super.buildChildren();
//         this.background = new BoxWidget(this, {autoSize:[1,1], color: [1,1,1], bubbleChanges: true});
//         this.clip = new Widget(this.background, {autoSize:[1,1], border: [5,5,5,5], clip: true, bubbleChanges: true});
//         this.text = new TextWidget(this.clip, {autoSize:[0,1], local:[0,0], alignX:'left', wrap: false, text:""});
//         this.entry = new BoxWidget(this.text, {autoSize:[0,1], local:[this.leftOffset,0], size:[1,1], bubbleChanges: true, visible: this.isFocused && !this.multipleSelected});
//         this.hilite = new BoxWidget(this.text, {autoSize:[0,1], local:[this.leftOffset, 0], size:[this.hiliteSize,1], color: [1,0,0], opacity:0.2,
//             bubbleChanges: true, visible: this.isFocused && this.multipleSelected});

//         // Suppress redrawing the whole canvas when the entry cursor or the hilite is hidden.
//         this.entry.markCanvasChanged = () => {};
//         this.hilite.markCanvasChanged = () => {};
//     }

//     updateChildren() {
//         this.background.update();
//         if (this.isDisabled) this.dim.update();
//     }

//     onHover() {
//         this.setCursor("text");
//     }

//     onUnhover() {
//         this.setCursor("default");
//     }

//     onFocus() {
//         ui.requestVirtualKeyboard(this.global);
//         this.blink();
//     }

//     onBlur() {
//         ui.dismissVirtualKeyboard();
//         this.refreshHilite();
//     }

//     blink() {
//         if (!this.isFocused) return;
//         this.entryBlink = !this.entryBlink;
//         this.entry.set({local:[this.leftOffset,0], visible: this.entryBlink && !this.multipleSelected} );
//         this.future(530).blink();
//     }

//     onPress(xy) {
//         const local = v2_sub(xy, this.text.global);
//         const select = this.text.findSelect(local[0]);
//         this.selectStart = select;
//         this.set({leftSelect: select, rightSelect: select});
//         this.refreshHilite();
//     }

//     // Still need to support dragging past the end of the widget. This is where it should go.
//     onDrag(xy) {
//         const local = v2_sub(xy, this.text.global);
//         const select = this.text.findSelect(local[0]);
//         if (this.selectStart < select) {
//             this.set({leftSelect: this.selectStart, rightSelect: select});
//         } else if (this.selectStart > select) {
//             this.set({leftSelect: select, rightSelect: this.selectStart});
//         } else {
//             this.set({leftSelect: select, rightSelect: select});
//         }
//         this.refreshHilite();
//     }

//     keyInput(input) {
//         const key = input.key;
//         const ctrl = input.ctrl || input.meta;
//         if (ctrl) {

//             switch (key) {
//                 case 'x':
//                     this.cut();
//                     break;
//                 case 'c':
//                     this.copy();
//                     break;
//                 case 'v':
//                     this.paste();
//                     break;
//                     default:
//             }
//         } else {
//             switch (key) {
//                 case 'Enter':
//                     this.enter();
//                     break;
//                 case 'Backspace':
//                     this.backspace();
//                     break;
//                 case 'Delete':
//                     this.delete();
//                     break;
//                 case 'ArrowLeft':
//                     this.cursorLeft();
//                     break;
//                 case 'ArrowRight':
//                     this.cursorRight();
//                     break;
//                 default:
//                     if (key.length === 1) this.insert(key);
//             }
//         }
//     }

//     insert(s) {
//         if (this.multipleSelected) this.deleteRange();
//         s = this.filter(s);
//         const t = this.text.text.slice(0, this.leftSelect) + s + this.text.text.slice(this.leftSelect);
//         const select = this.leftSelect + s.length;
//         this.set({leftSelect: select, rightSelect: select});
//         this.text.set({text: t});
//         this.insertLeft += s.length;
//         this.insertRight = this.insertLeft;
//         this.refreshHilite();
//     }

//     filter(s) {
//         return s.replace(/\n/g, ' '); // Filter out carriage returns
//     }

//     delete() {
//         if (this.multipleSelected) {
//             this.deleteRange();
//         } else {
//             this.deleteOne();
//         }
//         this.refreshHilite();
//     }

//     backspace() {
//         if (this.multipleSelected) {
//             this.deleteRange();
//         } else {
//             this.backspaceOne();
//         }
//         this.refreshHilite();
//     }

//     deleteRange() {
//         const cut = Math.min(this.text.text.length, this.rightSelect);
//         const t = this.text.text.slice(0, this.leftSelect) + this.text.text.slice(cut);
//         this.set({rightSelect: this.leftSelect});
//         this.text.set({text: t});
//     }


//     deleteOne() {
//         const cut = Math.min(this.text.text.length, this.rightSelect + 1);
//         const t = this.text.text.slice(0, this.leftSelect) + this.text.text.slice(cut);
//         this.text.set({text: t});
//     }

//     backspaceOne() {
//         const cut = Math.max(0, this.leftSelect - 1);
//         const t = this.text.text.slice(0, cut) + this.text.text.slice(this.rightSelect);
//         this.set({leftSelect: cut, rightSelect: cut});
//         this.text.set({text: t});
//     }

//     cursorLeft() {
//         const c = Math.max(0, this.leftSelect - 1);
//         this.set({leftSelect: c, rightSelect: c});
//         this.refreshHilite();
//     }

//     cursorRight() {
//         const c = Math.min(this.text.text.length, this.leftSelect + 1);
//         this.set({leftSelect: c, rightSelect: c});
//         this.refreshHilite();
//     }

//     cut() {
//         if (!this.multipleSelected) return;
//         const t = this.text.text.slice(this.leftSelect, this.rightSelect);
//         this.deleteRange();
//         navigator.clipboard.writeText(t); // This is a promise, but we don't care if it finishes.
//     }

//     copy() {
//         if (!this.multipleSelected) return;
//         const t = this.text.text.slice(this.leftSelect, this.rightSelect);
//         navigator.clipboard.writeText(t); // This is a promise, but we don't care if it finishes.
//     }

//     paste() {
//         navigator.clipboard.readText().then(text => this.insert(text));
//     }

//     onDoubleDown(xy) {
//         const local = v2_sub(xy, this.text.global);
//         const select = this.text.findSelect(local[0]);
//         const t = this.text.text;

//         let left = select;
//         let right = select;
//         if (t.length > 0) {
//             const c = t[select];
//             if (isLetterOrDigit(c)) {
//                 while (left > 0 && isLetterOrDigit(t[left-1])) left--;
//                 while (right < t.length && isLetterOrDigit(t[right])) right++;
//             } else if (c === ' ') {
//                 while (left > 0 && t[left-1] === ' ') left--;
//                 while (right < t.length && t[right] === ' ') right++;
//             } else if (right < t.length) right++;
//         }
//         this.set({leftSelect: left, rightSelect: right});
//         this.refreshHilite();
//     }

//     onTripleDown(xy) {
//         this.selectAll();
//     }

//     selectAll() {
//         this.set({leftSelect: 0, rightSelect: this.text.text.length});
//         this.refreshHilite();
//     }

//     // Update the position of the entry cursor and the highlight.

//     refreshHilite() {
//         this.entry.set({local:[this.leftOffset,0], visible: this.isFocused && !this.multipleSelected} );
//         this.hilite.set({local:[this.leftOffset, 0], size:[this.hiliteSize,1], visible: this.isFocused && this.multipleSelected});

//         if (!this.multipleSelected) { // Make sure the cursor is always visible.

//             let textLeft = this.text.local[0] * this.scale;
//             const textWidth = this.text.pixelWidth();
//             const textRight = textLeft + textWidth;
//             const clipRight = this.clip.size[0];

//             if (textWidth < clipRight) {
//                 textLeft = 0;
//             } else if (textRight < clipRight) {
//                 textLeft = clipRight-textWidth;
//             }

//             const selectOffset = this.leftOffset * this.scale;
//             const globalOffset = textLeft + selectOffset;

//             if (globalOffset < 0) {
//                 textLeft = -selectOffset;
//             } else if (globalOffset > clipRight) {
//                 textLeft = clipRight - 1 - selectOffset;
//             }

//             textLeft /= this.scale;
//             this.text.set({local:[textLeft, 0]});

//         }
//     }

//     enter() {
//         this.onEnter();
//         this.blur();
//     }

//     onEnter() {
//     }

// }

// -----------------------------------------------------------------------------------------
//-- PaneWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Old experiments with a windowing system. Needs to be cleaned up and made a proper part of
// WC eventually. Also this sort of stuff will be basis for pop-up menus.

// let layer = 10;

// export class PaneControlWidget extends ControlWidget {

//     buildChildren() {
//         super.buildChildren();
//         this.head = new BoxWidget(this, {autoSize: [1,0], border:[5,5,5,0],size:[0,50], color:[0.5,0.7,0.7], visible: true});
//         this.frame = new BoxWidget(this, {autoSize: [1,1], border:[5,45,5,5], color:[0.9,0.7,0.7]});
//         this.test = new ButtonWidget(this.head, {size: [30,30], local: [10,10]});
//         this.test.label.setText("");
//         this.test.onClick = () => this.parent.destroy();
//     }

//     updateChildren() {
//         this.frame.update();
//         this.head.update();
//     }

//     get dragMargin() { return this._dragMargin || 20;}

//     mouseMove(xy) { // Propagates down the widget tree. Returns true if a child handles it.
//         super.mouseMove(xy);
//         // if (this.head.isVisible) {
//         //     this.head.set({visible: this.inside(xy)});
//         // } else {
//         //     this.head.set({visible: this.frame.inside(xy)});
//         // }

//         const local = this.localXY(xy);
//         const x = local[0];
//         const y = local[1];
//         const m = this.dragMargin;
//         const s = this.size;

//         let c = "default";
//         if (this.head.inside(xy)) this.dragType = "move";
//         if (x < m) {
//             if (y < m) {
//                 this.dragType = "topLeft";
//                 c = "nw-resize";
//             } else if (y > s[1]-m) {
//                 this.dragType = "bottomLeft";
//                 c = "sw-resize";
//             } else {
//                 this.dragType = "left";
//                 c = "ew-resize";
//             }
//         } else if (x > s[0]- m) {
//             if (y < m) {
//                 this.dragType = "topRight";
//                 c = "ne-resize";
//             } else if (y > s[1]-m) {
//                 this.dragType = "bottomRight";
//                 c = "se-resize";
//             } else {
//                 this.dragType = "right";
//                 c = "ew-resize";
//             }
//         } else if (y < m) {
//             this.dragType = "top";
//             c = "ns-resize";
//         } else if (y > s[1]-m) {
//             this.dragType = "bottom";
//             c = "ns-resize";
//         } else {
//             // this.dragType = "none";
//             // c = "default";
//         }
//         this.setCursor(c);
//     }

//     press(xy) {
//         if (this.!isVisible || this.isDisabled || !this.inside(xy)) return false;
//         this.parent.guard.show();
//         if (this.parent.zIndex < layer) {
//             layer += 10;
//             this.parent.set({zIndex: layer});
//             this.parent.contents.set({zIndex: layer+1});
//         }
//         this.parent.guard.set({zIndex: this.parent.zIndex+2});
//         this.dragSize = [...this.parent.rawSize];
//         this.dragLocal = [...this.parent.local];
//         this.dragStart = [...xy];
//         this.focus();
//         return true;
//     }

//     release(xy) {
//         console.log("release");
//         // this.parent.guard.set({zIndex: this.parent.zIndex -1 });
//         this.blur();
//     }

//     drag(xy) {
//         const diff = v2_sub(xy, this.dragStart);
//         const raw = [...this.parent.rawSize];
//         const s0 = v2_add(this.dragSize, diff);
//         const s1 = v2_sub(this.dragSize, diff);
//         const ul = v2_add(this.dragLocal, diff);
//         switch (this.dragType) {
//             case "move":
//                 this.parent.set({local: ul});
//                 break;
//             case "topLeft":
//                 this.parent.set({local: ul, size: s1});
//                 break;
//             case "top":
//                 this.parent.set({local: [this.dragLocal[0], ul[1]], size: [raw[0], s1[1]]});
//                 break;
//             case "left":
//                 this.parent.set({local: [ul[0], this.dragLocal[1]], size: [s1[0], raw[1]]});
//                 break;
//             case "topRight":
//                 this.parent.set({local: [this.dragLocal[0], ul[1]], size: [s0[0], s1[1]]});
//                 break;
//             case "bottomLeft":
//                 this.parent.set({local: [ul[0], this.dragLocal[1]], size: [s1[0], s0[1]]});
//                 break;
//             case "bottomRight":
//                 this.parent.set({size: s0});
//                 break;
//             case "right":
//                 this.parent.set({size: [s0[0], raw[1]]});
//                 break;
//             case "bottom":
//                 this.parent.set({size: [raw[0], s0[1]]});
//                 break;
//             default:
//         }
//     }

//     localXY(xy) {
//         return v2_sub(xy, this.global);
//     }

// }

// export class PaneWidget extends CanvasWidget {

//     buildChildren() {
//         super.buildChildren();
//         this.control = new PaneControlWidget(this, {autoSize:[1,1]});
//         this.contents = new IFrameWidget(this, {autoSize: [1,1], border:[10,50,10,10], zIndex: this.zIndex + 1});
//         this.guard = new CanvasWidget(this, {autoSize:[1,1], border:[10,50,10,10], zIndex: this.zIndex + 2, visible:true}); // Guard needs to be refreshed once to position it.
//         this.contents.set({source: "https://croquet.io/quub/#GUEST/1cry0ylrjmy"});
//     }

//     updateChildren() {
//         this.control.update();
//         this.contents.update();
//         this.guard.update();
//     }


//     // mouseMove(xy) { // Propagates down the widget tree. Returns true if a child handles it.
//     //     if (!this.isVisible || !this.inside(xy)) {
//     //         if (this.head.isVisible) this.head.hide();
//     //         return false;
//     //     }
//     //     this.head.show();
//     //     if (this.head.inside(xy)) this.setCursor("default");
//     //     if (this.frame.inside(xy)) this.setCursor("move");
//     //     return true;
//     // }


// }




