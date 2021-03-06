import { View } from "@croquet/croquet";
import { v2_sub, v2_multiply, v2_add, v2_scale, v4_scale, v2_normalize, v2_magnitude } from "./Vector";
import { LoadFont, LoadImage} from "./ViewAssetCache";
import { NamedView } from "./NamedView";
import QRCode from "../lib/qr/qrcode";

let ui;             // The UI manager
let hover;          // The control widget that currently is hovered.
let focus;          // The control widget that currently has focus.

//------------------------------------------------------------------------------------------
//-- UIManager -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The UI is the top-level UI manager. It creates the canvas that the UI is drawn on, and catches events
// and passes them to the widget tree.
//
// It re-publishes cursorDown and touchDown events after it's given the UI widgets a chance to intercept
// them.
//
// Takes the device's pixel ratio into account. This can be over-ridden using SetScale.

export class UIManager extends NamedView {

    constructor() {
        super('UIManager');

        ui = this; // Global pointer for widgets to use.

        this.scale = 1;
        this.size = [100,100];
        this.global = [0,0];

        this.resize();
        this.root = new CanvasWidget(this, {autoSize: [1,1]});

        this.fakeText = document.createElement("input"); // This is a hack to trigger a virtual keyboard on a mobile device
        this.fakeText.setAttribute("type", "text");
        this.fakeText.style.position = "absolute";
        this.fakeText.value = "A"; // Fool keyboard into not automatically using caps
        this.fakeText.style.opacity = "0";
        this.fakeText.addEventListener("focusout", this.fakeTextBlur);
        document.body.insertBefore(this.fakeText, null);

        this.subscribe("input", {event: "resize", handling: "immediate"}, this.resize);
        this.subscribe("input", {event: "mouseXY", handling: "immediate"}, this.mouseXY);
        this.subscribe("input", {event: "mouse0Down", handling: "immediate"}, this.mouseDown);
        this.subscribe("input", {event: "mouse0Up", handling: "immediate"}, this.mouseUp);

        this.subscribe("input", {event: "mouse0Double", handling: "immediate"}, this.mouseDouble);
        this.subscribe("input", {event: "mouse0Triple", handling: "immediate"}, this.mouseTriple);

        this.subscribe("input", {event: "touchXY", handling: "immediate"}, this.touchXY);
        this.subscribe("input", {event: "touchDown", handling: "immediate"}, this.touchDown);
        this.subscribe("input", {event: "touchUp", handling: "immediate"}, this.touchUp);
        this.subscribe("input", {event: "touchTap", handling: "immediate"}, this.touchTap);

        this.subscribe("input", {event: "keyDown", handling: "immediate"}, this.keyDown);
        this.subscribe("input", {event: "keyRepeat", handling: "immediate"}, this.keyDown);
    }

    destroy() {
        super.destroy();
        if (focus) focus.blur();
        if (this.root) this.root.destroy();
        ui = null;
    }

    addChild(root) {
        root.setParent(this);
    }

    removeChild(child) {
        if (this.root === child) this.root = null;
    }

    get isVisible() { return true; }

    resize() {
        if (focus) focus.blur();
        this.ratio = window.devicePixelRatio;
        // console.log("UI Pixel Ratio: " + this.ratio);
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

    mouseXY(xy) {
        const oldHover = hover;
        this.root.setCursor('default');
        if (this.inMouseDown) {
            if (focus) focus.drag(xy);
        } else {
            if (hover) hover.mouseMove(xy);
            if (this.root) this.root.mouseMove(xy);
        }
        if (oldHover !== hover) {
            if (oldHover) {
                oldHover.onUnhover();
                oldHover.markChanged();
            }
            if (hover) {
                hover.onHover();
                hover.markChanged();
            }
        }
        if (!focus && !hover) this.publish("ui", "mouseXY", xy);
    }

    mouseDown(xy) {
        this.inMouseDown = true;
        if (focus && focus.press(xy)) return;
        if (hover && hover.press(xy)) return;
        this.publish("ui", "mouse0Down", xy);
    }

    mouseUp(xy) {
        this.inMouseDown = false;
        if (focus) focus.release(xy);
        this.publish("ui", "mouse0Up", xy);
    }

    touchXY(xy) {
        if (focus) focus.drag(xy);
        this.publish("ui", "touchXY", xy);
    }

    touchDown(xy) {
        if (this.root && this.root.press(xy)) return;
        this.canTap = true;
        this.publish("ui", "touchDown", xy);
    }

    touchUp(xy) {
        if (focus) focus.release(xy);
        this.canTap = false;
        this.publish("ui", "touchUp", xy);
    }

    touchTap(xy) {
        if (!this.canTap) return;
        this.publish("ui", "touchTap", xy);
    }

    mouseDouble(xy) {
        if (!focus || !focus.doubleClick) return;
        focus.doubleClick(xy);
    }

    mouseTriple(xy) {
        if (!focus || !focus.tripleClick) return;
        focus.tripleClick(xy);
    }


    keyDown(key) {
        if (focus && focus.keyInput) focus.keyInput(key);
    }


    // This is a hack to trigger the virtual keyboard on mobile. There is an invisible text entry element that
    // gets drawn underneath the real text entry widget. Giving this fake text field focus pops up the
    // keyboard. When we have our own virtual keyboard as part of the widget system, this should go away.

    requestVirtualKeyboard(xy) {
        this.fakeText.style.left = xy[0] + 'px';
        this.fakeText.style.top = xy[1] + 'px';
        this.fakeText.focus();
    }

    dismissVirtualKeyboard() {
        this.fakeText.blur();
    }

    fakeTextBlur() {
        this.value = "A"; // This prevents the virtual keyboard from defaults to caps
        if (focus) focus.blur();
    }

}

//------------------------------------------------------------------------------------------
//-- Widget --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The base widget class.

export class Widget extends View {
    constructor(parent, options) {
        super();
        this.set(options);
        if (parent) parent.addChild(this);

        this.buildChildren();

        this.subscribe(this.id, { event: "visible", handling: "immediate" }, visible => {if (!visible) this.markCanvasChanged(); this.visiblityChanged();} );
        this.subscribe(this.id, { event: "scale", handling: "immediate" }, () => { this.markCanvasChanged();} );
    }

    destroy() {
        if (this.children) this.children.forEach(child => child.destroy());
        if (this.parent) this.parent.removeChild(this);
        this.detach();
    }

    addChild(child) {
        if (!child || child.parent === this) return;
        if (!this.children) this.children = new Set();
        if (child.parent) child.parent.removeChild(child);
        this.children.add(child);
        child.setParent(this);
        child.setCanvasWidget(this.canvasWidget);
        this.markChanged();
    }

    removeChild(child) {
        if (!child) return;
        if (this.children) this.children.delete(child);
        child.setParent(null);
        this.markChanged();
    }

    destroyChild(child) {
        if (!child) return;
        this.removeChild(child);
        child.destroy();
    }

    setParent(p) {  // This should only be called by addChild & removeChild
        this.parent = p;
        // this.markChanged();
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

    set(options) {
        let changed = false;
        for (const option in options) {
            const n = "_" + option;
            const v = options[option];
            if (!deepEquals(this[n], v)) {
                this[n] = v;
                changed = true;
                this.publish(this.id, option, v);
            }
        }
        if (changed) this.markChanged();
    }

    show() { this.set({visible: true}); }
    hide() { this.set({visible: false}); }
    toggleVisible() { this.set({visible: !this.isVisible}); }

    visiblityChanged() {
        if (this.children) this.children.forEach(child => child.visiblityChanged());
    }

    get anchor() { return this._anchor || [0,0];}
    get pivot() { return this._pivot || [0,0];}
    get local() { return this._local || [0,0];}
    get autoSize() { return this._autoSize || [0,0];}
    get isClipped() { return this._clip; }  // Default to false
    get isVisible() { return this._visible === undefined || this._visible;} // Default to true
    get color() { return this._color || [0,0,0];}
    get bubbleChanges() { return this._bubbleChanges; } // Default to false
    get rawSize() { return this._size || [100,100];}

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
        // this.$size = size;
        // this.$size = [...size];
        if (this.parent) {
            const parentSize = this.parent.size;
            if (this.autoSize[0]) this.$size[0] = parentSize[0] * this.autoSize[0];
            if (this.autoSize[1]) this.$size[1] = parentSize[1] * this.autoSize[1];
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

    mouseMove(xy) { // Propagates down the widget tree.
        if (!this.isVisible || !this.inside(xy)) return;
        if (this.children) this.children.forEach(child => child.mouseMove(xy));
    }

    press(xy) { // Propagates down the widget tree. Returns true if a child handles it.
        if (!this.isVisible || !this.inside(xy)) return false;
        let consumed = false;
        if (this.children) this.children.forEach(child => consumed = child.press(xy) || consumed);
        return consumed;
    }

    release(xy) {} // Only sent to the current focus.

    drag(xy) {} // Only sent to the current focus.

    update() {
        if (!this.isVisible) return;
        this.cc.save();
        // this.cc.scale(this.scale, this.scale);
        this.cc.globalAlpha = this.opacity;
        if (this.isClipped) this.clip();
        if (this.isChanged) this.draw();
        if (this.children) this.updateChildren();
        this.cc.restore();
        this.isChanged = false;
    }

    // Some elements may need more control over the order they update their children
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

export class IFrameWidget extends ElementWidget {
    constructor(...args) {
        super(...args);
        this.element = document.createElement("iframe");
        this.element.style.cssText = "position: absolute; left: 0; top: 0; border: 0;";
        document.body.insertBefore(this.element, null);
    }

    get source() { return this._source || ""; }

    update() {
        if (this.isChanged) this.draw();
        this.isChanged = false;
    }

    draw() {
        super.draw();
        this.element.src = this.source;
    }

}

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
        this.addChild(w);
        w.set({bubbleChanges: true});
        this.slots.splice(n,0,w);
        this.markChanged();
    }

    removeSlot(n) {
        if (this.slots[n]) this.removeChild(this.slots[n]);
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
        // if (!('width' in w)) Object.defineProperty(w, 'width', { get: () => { return w._width || 0; }});
        // Object.defineProperty(w, 'width', { get: () => { return w._width || 0; }});
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
        //if (!('height' in w)) Object.defineProperty(w, 'height', { get: () => { return w._height || 0; }});
        // Object.defineProperty(w, 'height', { get: () => { return w._height || 0; }});
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
    constructor(...args) {
        super(...args);
        if (this.url) this.loadFromURL(this.url);
        this.subscribe(this.id, { event: "url", handling: "immediate" }, this.loadFromURL);
    }

    get image() { return this._image; }     // A canvas
    get url() { return this._url; }

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

export class QRWidget extends ImageWidget {
    constructor(...args) {
        super(...args);
        this._element = document.createElement('div');
        if (this.text) this.makeFromText(this.text);
        this.subscribe(this.id, { event: "text", handling: "immediate" }, this.makeFromText);
    }

    get text() { return this._text; }

    destroy() {
        super.destroy();
        this._element.remove();
    }

    makeFromText(t) {
        this._text = t;
        this.markChanged();
        const code = new QRCode(this._element, {
            text: t,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L   // L, M, Q, H
        });
        if (code) this.loadFromCanvas(code.getCanvas());
    }

}

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

    constructor(...args) {
        super(...args);
        if (this.url) this.setFontByURL(this.url);
        this.subscribe(this.id, { event: "url", handling: "immediate" }, this.setFontByURL);
    }

    setText(t) {this.set({text: t});}

    setFontByURL(url) {
        this._font = LoadFont(url, () => this.markChanged());
        this.markChanged();
    }

    get url() { return this._url; }
    get bubbleChanges() { return this._bubbleChanges === undefined || this._bubbleChanges;} // Override to default to true
    get text() { if (this._text !== undefined) return this._text; return "Text";}
    get font() { return this._font || "sans-serif";}
    get point() { return (this._point || 24) * this.scale;}
    get lineSpacing() { return (this._lineSpacing || 0) * this.scale;}
    get style() { return this._style || "normal";}
    get alignX() { return this._alignX || "center";}
    get alignY() { return this._alignY || "middle";}
    get wrap() { return this._wrap === undefined || this._wrap;} // Default to true

    // Breaks lines by word wrap or new line.

    get lines() {
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

    draw() {
        const lineHeight = (this.point + this.lineSpacing);

        this.cc.textAlign = this.alignX;
        this.cc.textBaseline = this.alignY;
        this.cc.font = this.style + " " + this.point + "px " + this.font;
        this.cc.fillStyle = canvasColor(...this.color);

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

        lines.forEach((line,i) => this.cc.fillText(line, xy[0], xy[1] + (i * lineHeight) - yOffset));
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

// Base class for all widgets that can be interacted with.

// Only control widgets can have focus. The current focus receives key, drag and release events.

// Control widgets have enabled/disabled states. The disabled state is implemented with a translucent overlay.
// If the widget has an irregular shape, you'll need to provide an overlaythat matches the
// control shape.

export class ControlWidget extends Widget {

    buildChildren() {
        super.buildChildren();
        this.setDim(new BoxWidget(this, {autoSize: [1,1], color: [0.8,0.8,0.8], opacity: 0.6, bubbleChanges: true}));
    }

    enable() { this.set({ disabled: false }); }
    disable() { this.set({ disabled: true }); }
    toggleDisabled() { this.set({ disabled: !this.disabled }); }

    get isDisabled() { return this._disabled;}
    get isHovered() { return this === hover; }
    get isFocused() { return this === focus; }

    setDim(w) {
        if (this.dim && this.dim !== w) this.destroyChild(this.dim);
        this.dim = w;
        this.addChild(w);
    }

    focus() {
        if (this.isDisabled || this.isFocused) return;
        if (focus) focus.blur();
        focus = this;
        this.onFocus();
        this.markChanged();
    }

    blur() {
        if (!this.isFocused) return;
        focus = null;
        this.onBlur();
        this.markChanged();
    }

    onFocus() {}
    onBlur() {}

    mouseMove(xy) {
        if (!this.isVisible || this.isDisabled || !this.inside(xy)) { // Unhover
            if (this.isHovered) hover = null;
            return;
        }
        hover = this;
        super.mouseMove(xy);

    }

    onHover() {}
    onUnhover() {}

}

//------------------------------------------------------------------------------------------
//-- ButtonWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a pressable button.
//
// The Normal/Hovered/Pressed Box widgets can be replaced by NineSlice widgets for prettier buttons.

export class ButtonWidget extends ControlWidget {

    buildChildren() {
        super.buildChildren();
        this.setNormal(new BoxWidget(this, {autoSize: [1,1], color: [0.5,0.5,0.5], bubbleChanges: true}));
        this.setHilite(new BoxWidget(this, {autoSize: [1,1], color: [0.65,0.65,0.65], bubbleChanges: true}));
        this.setPressed(new BoxWidget(this, {autoSize: [1,1], color: [0.35,0.35,0.35], bubbleChanges: true}));
        this.setLabel(new TextWidget(this, {autoSize: [1,1]}));
    }

    setNormal(w) {
        if (this.normal && this.normal !== w) this.destroyChild(this.normal);
        this.normal = w;
        this.addChild(w);
    }

    setHilite(w) {
        if (this.hilite && this.hilite !== w) this.destroyChild(this.hilite);
        this.hilite = w;
        this.addChild(w);
    }

    setPressed(w) {
        if (this.pressed && this.presed !== w) this.destroyChild(this.pressed);
        this.pressed = w;
        this.addChild(w);
    }

    setLabel(w) {
        if (this.label && this.label !== w) this.destroyChild(this.label);
        this.label = w;
        this.addChild(w);
    }

    updateChildren() {
        let background = this.normal;
        if (this.isHovered) background = this.hilite;
        if (this.isPressed) background = this.pressed;
        if (background) background.update();
        if (this.label) this.label.update();
        if (this.isDisabled) this.dim.update();
    }

    drag(xy) {
        const inside = this.inside(xy);
        if (this.isPressed === inside) return;
        this.isPressed = inside;
        this.markChanged();
    }

    press(xy) {
        if (this.invisible || this.isDisabled || !this.inside(xy)) return false;
        this.isPressed = true;
        this.focus();
        this.onPress();
        return true;
    }

    release(xy) {
        this.isPressed = false;
        this.blur();
        this.onRelease();
        if (this.inside(xy)) this.onClick();
    }

    // Called when the user presses and releases the button.

    onClick() {}
    onPress() {}
    onRelease() {}

}

//------------------------------------------------------------------------------------------
//-- ToggleWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a button that can be toggled between an on and off state.

export class ToggleWidget extends ControlWidget {

    constructor(...args) {
        super(...args);

        if (!this._state) this._state = false; // Prevent toggle change events when an undefined state is set to false.

        // Handle state changes triggered by another widget in the set.
        this.setChanged();
        this.subscribe(this.id, { event: "state", handling: "immediate" }, this.stateChanged);
        this.subscribe(this.id, { event: "toggleSet", handling: "immediate" }, this.setChanged);
    }

    destroy() {
        super.destroy();
        if (this.toggleSet) this.toggleSet.remove(this);
    }

    buildChildren() {
        super.buildChildren();
        this.setNormalOn(new BoxWidget(this, {autoSize: [1,1], color: [0.5,0.5,0.7], bubbleChanges: true}));
        this.setNormalOff(new BoxWidget(this, {autoSize: [1,1], color: [0.5, 0.5, 0.5], bubbleChanges: true}));
        this.setHiliteOn(new BoxWidget(this, {autoSize: [1,1], color: [0.6, 0.6, 0.8], bubbleChanges: true}));
        this.setHiliteOff(new BoxWidget(this, {autoSize: [1,1], color: [0.6, 0.6, 0.6], bubbleChanges: true}));
        this.setPressedOn(new BoxWidget(this, {autoSize: [1,1], color: [0.4, 0.4, 0.6], bubbleChanges: true}));
        this.setPressedOff(new BoxWidget(this, {autoSize: [1,1], color: [0.4, 0.4, 0.4], bubbleChanges: true}));
        this.setLabelOn(new TextWidget(this, {autoSize: [1,1], text: "On", bubbleChanges: true}));
        this.setLabelOff(new TextWidget(this, {autoSize: [1,1], text: "Off", bubbleChanges: true}));
    }

    get isOn() { return this._state; }
    get toggleSet() { return this._toggleSet; }

    setNormalOn(w) {
        if (this.normalOn && this.normalOn !== w) this.destroyChild(this.normalOn);
        this.normalOn = w;
        this.addChild(w);
    }

    setNormalOff(w) {
        if (this.normalOff && this.normalOff !== w) this.destroyChild(this.normalOff);
        this.normalOff = w;
        this.addChild(w);
    }

    setHiliteOn(w) {
        if (this.hiliteOn && this.hiliteOn !== w) this.destroyChild(this.hiliteOn);
        this.hiliteOn = w;
        this.addChild(w);
    }

    setHiliteOff(w) {
        if (this.hiliteOff && this.hiliteOff !== w) this.destroyChild(this.hiliteOff);
        this.hiliteOff = w;
        this.addChild(w);
    }

    setPressedOn(w) {
        if (this.pressedOn && this.presedOn !== w) this.destroyChild(this.pressedOn);
        this.pressedOn = w;
        this.addChild(w);
    }

    setPressedOff(w) {
        if (this.pressedOff && this.presedOff !== w) this.destroyChild(this.pressedOff);
        this.pressedOff = w;
        this.addChild(w);
    }

    setLabelOn(w) {
        if (this.labelOn && this.labelOn !== w) this.destroyChild(this.labelOn);
        this.labelOn = w;
        this.addChild(w);
    }

    setLabelOff(w) {
        if (this.labelOff && this.labelOff !== w) this.destroyChild(this.labelOff);
        this.labelOff = w;
        this.addChild(w);
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

    drag(xy) {
        const inside = this.inside(xy);
        if (this.isPressed === inside) return;
        this.isPressed = inside;
        this.markChanged();
    }

    press(xy) {
        if (this.invisible || this.isDisabled || !this.inside(xy)) return false;
        this.isPressed = true;
        this.focus();
        return true;
    }

    release(xy) {
        this.isPressed = false;
        this.blur();
        if (!this.inside(xy)) return;
        if (this.toggleSet) {
            this.toggleSet.pick(this);
        } else {
            this.set({state: !this.isOn});
        }
    }

    setChanged() {
        if (this.oldSet) this.oldSet.remove(this);
        if (this.toggleSet) this.toggleSet.add(this);
        this.oldSet = this.toggleSet;
    }

    stateChanged(state) {
        if (state) {
            this.onToggleOn();
        } else {
            this.onToggleOff();
        }
    }

    // Called when the toggle changes state either directly or indirectly.

    onToggleOn() {}
    onToggleOff() {}

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

export class SliderWidget extends ControlWidget {

    get isHorizontal() { return this.size[0] > this.size[1]; }
    get step() { return this._step || 0; }        // The number of descrete steps the slider has. (0=continuous)

    get percent() {
        const p = this._percent || 0;
        if (!this.step) return p;
        return Math.round(p * (this.step-1)) / (this.step-1);
    }

    buildChildren() {
        super.buildChildren();
        this.setBar(new BoxWidget(this, {autoSize:[1,1], color: [0.5,0.5,0.5], bubbleChanges: true}));
        this.setKnob(new BoxWidget(this, {color: [0.8,0.8,0.8], border:[2,2,2,2], bubbleChanges: true}));
    }

    setBar(w) {
        if (this.bar && this.bar !== w) this.destroyChild(this.bar);
        this.bar = w;
        this.addChild(w);
    }

    setKnob(w) {
        if (this.knob && this.knob !== w) this.destroyChild(this.knob);
        this.knob = w;
        this.setKnobSize();
        this.addChild(w);
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

    press(xy) {
        if (this.invisible || this.isDisabled || !this.inside(xy)) return false;
        this.isPressed = true;
        this.focus();
        this.moveKnob(xy);
        return true;
    }

    release(xy) {
        this.isPressed = false;
        this.blur();
        this.moveKnob(xy);
    }

    drag(xy) {
        this.moveKnob(xy);
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
        this.onChange(this.percent);
    }

    onChange(percent) {
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


export class JoystickWidget extends ControlWidget {

    buildChildren() {
        super.buildChildren();

        this.setBackground(new BoxWidget(this, {color: [0.5,0.5,0.5]}));
        this.gate = new Widget(this.bg, {anchor: [0.5, 0.5], pivot: [0.5, 0.5], autoSize: [1, 1], border: [10,10,10,10], bubbleChanges: true})
        this.setKnob(new BoxWidget(this.gate, {color: [0.8,0.8,0.8], size: [20,20]}));
        this.deadRadius = 0.1;
        this.xy = [0,0];
    }

    setBackground(w) {
        if (this.bg && this.bg !== w) {
            this.bg.removeChild(this.gate);
            this.destroyChild(this.bg);
        }
        this.bg = w;
        this.bg.set({autoSize: [1,1], bubbleChanges: true})
        this.addChild(w);
        this.bg.addChild(this.gate);
    }

    setKnob(w) {
        if (this.knob && this.knob !== w) {
            this.gate.destroyChild(this.knob);
        }
        this.knob = w;
        this.knob.set({anchor: [0.5, 0.5], pivot: [0.5, 0.5], bubbleChanges: true})
        const size = this.knob.size;
        const x = size[0] / 2;
        const y = size[1] / 2;
        this.gate.set({border: [x,y,x,y]});
        this.gate.addChild(this.knob);
    }

    recenter() {
        this.knob.set({anchor: [0.5,0.5]});
        this.xy = [0,0];
        this.onChange([0,0]);
    }

    press(xy) {
        if (this.invisible || this.isDisabled || !this.inside(xy)) return false;
        this.isPressed = true;
        this.focus();
        this.moveKnob(xy);
        return true;
    }

    release(xy) {
        this.isPressed = false;
        this.blur();
        this.recenter();
    }

    drag(xy) {
        this.moveKnob(xy);
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
        this.onChange(this.xy);
    }

    onChange(xy) {
    }
}


//------------------------------------------------------------------------------------------
//-- TextFieldWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A single line of text that can be typed into.

export class TextFieldWidget extends ControlWidget {

    get leftSelect() { return this._leftSelect || 0; }
    get rightSelect() { return this._rightSelect || 0; }
    get hiliteSize() { return (this.rightOffset - this.leftOffset); }
    get multipleSelected() { return this.leftSelect !== this.rightSelect; }

    get leftOffset() { return this.text.findLetterOffset(this.leftSelect) / this.scale;}
    get rightOffset() { return this.text.findLetterOffset(this.rightSelect) / this.scale;}

    buildChildren() {
        super.buildChildren();
        this.background = new BoxWidget(this, {autoSize:[1,1], color: [1,1,1], bubbleChanges: true});
        this.clip = new Widget(this.background, {autoSize:[1,1], border: [5,5,5,5], clip: true, bubbleChanges: true});
        this.text = new TextWidget(this.clip, {autoSize:[0,1], local:[0,0], alignX:'left', wrap: false, text:""});
        this.entry = new BoxWidget(this.text, {autoSize:[0,1], local:[this.leftOffset,0], size:[1,1], bubbleChanges: true, visible: this.isFocused && !this.multipleSelected});
        this.hilite = new BoxWidget(this.text, {autoSize:[0,1], local:[this.leftOffset, 0], size:[this.hiliteSize,1], color: [1,0,0], opacity:0.2,
            bubbleChanges: true , visible: this.isFocused && this.multipleSelected});

        // Suppress redrawing the whole canvas when the entry cursor or the hilite is hidden.
        this.entry.markCanvasChanged = () => {};
        this.hilite.markCanvasChanged = () => {};
    }

    updateChildren() {
        this.refresh();
        this.background.update();
        if (this.isDisabled) this.dim.update();
    }

    onFocus() {
        ui.requestVirtualKeyboard(this.global);
        this.blink();
    }

    onBlur() {
        ui.dismissVirtualKeyboard();
        this.refresh();
    }

    // onFocus() {
    //     ui.requestVirtualKeyboard(this.global);
    //     this.refresh();
    //     this.future(530).cursorBlink();
    // }

    // onBlur() {
    //     ui.dismissVirtualKeyboard();
    //     this.cursor.hide(true);
    //     this.gel.hide(true);
    //     this.markChanged();
    // }

    blink() {
        if (!this.isFocused) return;
        this.entryBlink = !this.entryBlink;
        this.entry.set({local:[this.leftOffset,0], visible: this.entryBlink && !this.multipleSelected} );
        this.future(530).blink();
    }

    mouseMove(xy) {
        if (!this.isVisible || !this.inside(xy)) return;
        this.setCursor("text");
        super.mouseMove(xy);
    }

    press(xy) {
        if (this.invisible || this.isDisabled || !this.inside(xy)) {
            this.blur();
            return false;
        }
        this.focus();
        this.isPressed = true;
        const local = v2_sub(xy, this.text.global);
        const select = this.text.findSelect(local[0]);
        this.selectStart = select;
        this.set({leftSelect: select, rightSelect: select});
        this.refresh();
        return true;
    }

    release(xy) {
        this.isPressed = false;
    }

    // Still need to support dragging past the end of the widget. This is where it should go.
    drag(xy) {
        if (!this.isPressed) return;
        const local = v2_sub(xy, this.text.global);
        const select = this.text.findSelect(local[0]);
        if (this.selectStart < select) {
            this.set({leftSelect: this.selectStart, rightSelect: select});
        } else if (this.selectStart > select) {
            this.set({leftSelect: select, rightSelect: this.selectStart});
        } else {
            this.set({leftSelect: select, rightSelect: select});
        }
        this.refresh();
    }

    keyInput(input) {
        const key = input.key;
        const ctrl = input.ctrl || input.meta;
        console.log(ctrl);
        if (ctrl) {

            switch (key) {
                case 'x':
                    this.cut();
                    break;
                case 'c':
                    this.copy();
                    break;
                case 'v':
                    this.paste();
                    break;
                    default:
            }
        } else {
            switch (key) {
                case 'Enter':
                    this.enter();
                    break;
                case 'Backspace':
                    this.backspace();
                    break;
                case 'Delete':
                    this.delete();
                    break;
                case 'ArrowLeft':
                    this.cursorLeft();
                    break;
                case 'ArrowRight':
                    this.cursorRight();
                    break;
                default:
                    if (key.length === 1) this.insert(key);
            }
        }


        // switch (input) {
        //     case 'Enter':
        //         this.enter();
        //         break;
        //     case 'Backspace':
        //         this.backspace();
        //         break;
        //     case 'Delete':
        //         this.delete();
        //         break;
        //     case 'ArrowLeft':
        //         this.cursorLeft();
        //         break;
        //     case 'ArrowRight':
        //         this.cursorRight();
        //         break;
        //     case 'Cut':
        //         this.cut();
        //         break;
        //     case 'Copy':
        //         this.copy();
        //         break;
        //     case 'Paste':
        //         this.paste();
        //         break;
        //     default:
        //        if (input.length === 1) this.insert(input);
        // }
    }

    insert(s) {
        if (this.multipleSelected) this.deleteRange();
        s = this.filter(s);
        const t = this.text.text.slice(0, this.leftSelect) + s + this.text.text.slice(this.leftSelect);
        const select = this.leftSelect + s.length;
        this.set({leftSelect: select, rightSelect: select});
        this.text.set({text: t});

        this.text.setText(t);
        this.insertLeft += s.length;
        this.insertRight = this.insertLeft;
        this.refresh();
    }

    filter(s) {
        return s.replace(/\n/g, ' '); // Filter out carriage returns
    }

    delete() {
        if (this.multipleSelected) {
            this.deleteRange();
        } else {
            this.deleteOne();
        }
        this.refresh();
    }

    backspace() {
        if (this.multipleSelected) {
            this.deleteRange();
        } else {
            this.backspaceOne();
        }
        this.refresh();
    }

    deleteRange() {
        const cut = Math.min(this.text.text.length, this.rightSelect);
        const t = this.text.text.slice(0, this.leftSelect) + this.text.text.slice(cut);
        this.set({rightSelect: this.leftSelect});
        this.text.set({text: t});
    }


    deleteOne() {
        const cut = Math.min(this.text.text.length, this.rightSelect + 1);
        const t = this.text.text.slice(0, this.leftSelect) + this.text.text.slice(cut);
        this.text.set({text: t});
    }

    backspaceOne() {
        const cut = Math.max(0, this.leftSelect - 1);
        const t = this.text.text.slice(0, cut) + this.text.text.slice(this.rightSelect);
        this.set({leftSelect: cut, rightSelect: cut});
        this.text.set({text: t});
    }

    cursorLeft() {
        const c = Math.max(0, this.leftSelect - 1);
        this.set({leftSelect: c, rightSelect: c});
        this.refresh();
    }

    cursorRight() {
        const c = Math.min(this.text.text.length, this.leftSelect + 1);
        this.set({leftSelect: c, rightSelect: c});
        this.refresh();
    }

    cut() {
        if (!this.multipleSelected) return;
        const t = this.text.text.slice(this.leftSelect, this.rightSelect);
        this.deleteRange();
        navigator.clipboard.writeText(t); // This is a promise, but we don't care if it finishes.
    }

    copy() {
        if (!this.multipleSelected) return;
        const t = this.text.text.slice(this.leftSelect, this.rightSelect);
        navigator.clipboard.writeText(t); // This is a promise, but we don't care if it finishes.
    }

    paste() {
        navigator.clipboard.readText().then(text => this.insert(text));
    }

    doubleClick(xy) {
        if (!this.inside(xy)) return;

        const local = v2_sub(xy, this.text.global);
        const select = this.text.findSelect(local[0]);
        const t = this.text.text;

        let left = select;
        let right = select;
        if (t.length > 0) {
            const c = t[select];
            if (isLetterOrDigit(c)) {
                while (left > 0 && isLetterOrDigit(t[left-1])) left--;
                while (right < t.length && isLetterOrDigit(t[right])) right++;
            } else if (c === ' ') {
                while (left > 0 && t[left-1] === ' ') left--;
                while (right < t.length && t[right] === ' ') right++;
            } else if (right < t.length) right++;
        }
        this.set({leftSelect: left, rightSelect: right});
        this.refresh();
    }

    tripleClick(xy) {
        if (!this.inside(xy)) return;
        this.selectAll();
    }

    selectAll() {
        this.set({leftSelect: 0, rightSelect: this.text.text.length});
        this.refresh();
    }

    // Update the position of the cursor and the highlight.

    refresh() {
        this.entry.set({local:[this.leftOffset,0], visible: this.isFocused && !this.multipleSelected} );
        this.hilite.set({local:[this.leftOffset, 0], size:[this.hiliteSize,1], visible: this.isFocused && this.multipleSelected});

        if (!this.multipleSelected) { // Make sure the cursor is always visible.

            let textLeft = this.text.local[0] * this.scale;
            const textWidth = this.text.pixelWidth();
            const textRight = textLeft + textWidth;
            const clipRight = this.clip.size[0];

            if (textWidth < clipRight) {
                textLeft = 0;
            } else if (textRight < clipRight) {
                textLeft = clipRight-textWidth;
            }

            const selectOffset = this.leftOffset * this.scale;
            const globalOffset = textLeft + selectOffset;

            if (globalOffset < 0) {
                textLeft = -selectOffset;
            } else if (globalOffset > clipRight) {
                textLeft = clipRight - 1 - selectOffset;
            }

            textLeft /= this.scale;
            this.text.set({local:[textLeft, 0]});

        }
    }

    enter() {
        this.blur();
        this.onEnter();
        this.refresh();
    }

    onEnter() {
    }

}

//------------------------------------------------------------------------------------------
//-- Helper Functions ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Widget attributes can be either values or arrays ... this compares arbitrary things.

function deepEquals(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const al = a.length;
    const bl = b.length;
    if (!al || !bl) return false;
    if (al !== bl) return false;
    for (let i = 0; i < al; i++) if (a[i] !== b[i]) return false;
    return true;
}

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
//         if (this.invisible || this.isDisabled || !this.inside(xy)) return false;
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
