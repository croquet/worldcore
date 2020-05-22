import { View } from "@croquet/croquet";
import { v2_sub, v2_multiply, v2_add } from "./Vector";
import { LoadFont, LoadImage} from "./ViewAssetCache";
import { NamedView, GetNamedView } from "./NamedView";
import { KeyDown } from "./WebInput";

let ui;
let focus;  // The control widget that currently has focus.
let cc;

//------------------------------------------------------------------------------------------
//-- UI ------------------------------------------------------------------------------------
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

            this.canvas = document.createElement("canvas");
            this.canvas.id = "UICanvas";
            this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 1";
            document.body.insertBefore(this.canvas, null);
            cc = this.canvas.getContext('2d');

            this.fakeText = document.createElement("input"); // This is a hack to trigger a virtual keyboard on a mobile device
            this.fakeText.setAttribute("type", "text");
            this.fakeText.style.position = "absolute";
            this.fakeText.value = "A"; // Fool keyboard into not automatically using caps
            this.fakeText.style.opacity = "0";
            this.fakeText.addEventListener("focusout", this.fakeTextBlur);
            document.body.insertBefore(this.fakeText, null);

            this.root = new RootWidget();
            this.resize();

            this.subscribe("input", {event: "resize", handling: "immediate"}, this.resize);
            this.subscribe("input", {event: "mouseXY", handling: "immediate"}, this.mouseXY);
            this.subscribe("input", {event: "mouse0Down", handling: "immediate"}, this.mouseDown);
            this.subscribe("input", {event: "mouse0Up", handling: "immediate"}, this.mouseUp);

            this.subscribe("input", {event: "mouse0Double", handling: "immediate"}, this.mouseDouble);
            this.subscribe("input", {event: "mouse0Triple", handling: "immediate"}, this.mouseTriple);
            this.subscribe("input", {event: "touchXY", handling: "immediate"}, this.touchXY);
            this.subscribe("input", {event: "touchDown", handling: "immediate"}, this.touchDown);
            this.subscribe("input", {event: "touchUp", handling: "immediate"}, this.touchUp);
            this.subscribe("input", {event: "keyDown", handling: "immediate"}, this.keyDown);
            this.subscribe("input", {event: "keyRepeat", handling: "immediate"}, this.keyDown);
        }

        destroy() {
            this.detach();
            console.log("destroying UI manager");
            if (this.root) this.root.destroy();
            this.canvas.remove();
            this.fakeText.remove();
            ui = null;
            focus = null;
            cc = null;
        }

        resize() {
            this.ratio = window.devicePixelRatio;
            console.log("UI Pixel Ratio: " + this.ratio);
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.canvas.style.width = width + "px";
            this.canvas.style.height = height + "px";
            this.canvas.width = width * this.ratio;
            this.canvas.height = height * this.ratio;
            this.size = [width, height];
            this.markChanged();
            if (this.root) this.root.setSize(this.size);
        }

        setRoot(root) {
            this.root = root;
            if (this.root) this.root.setSize(this.size);
        }

        update() {
            if (!this.isChanged) return;
            cc.setTransform(1, 0, 0, 1, 0, 0);
            cc.scale(this.ratio, this.ratio);
            if (this.root) this.root.update();
            this.isChanged = false;
        }

        markChanged() {
            this.isChanged = true;
        }

        mouseXY(xy) {
            if (focus) focus.drag(xy);
            this.setCursor('default');
            if (this.root) this.root.hover(xy);
            this.publish("ui", "mouseXY", xy);
        }

        mouseDown(xy) {
            if (!this.root) return;
            if (!this.root.press(xy)) this.publish("ui", "mouse0Down", xy);
        }

        mouseDouble(xy) {
            if (!focus || !focus.doubleClick) return;
            focus.doubleClick(xy);
        }

        mouseTriple(xy) {
            if (!focus || !focus.tripleClick) return;
            focus.tripleClick(xy);
        }

        mouseUp(xy) {
            if (focus) focus.release(xy);
            this.publish("ui", "mouse0Up", xy);
        }

        touchXY(xy) {
            if (focus) focus.drag(xy);
            this.publish("ui", "touchXY", xy);
        }

        touchDown(xy) {
            if (!this.root) return;
            if (!this.root.press(xy)) this.publish("ui", "touchDown", xy);
        }

        touchUp(xy) {
            if (focus) focus.release(xy);
            this.publish("ui", "touchUp", xy);
        }

        keyDown(key) {
            if (focus && focus.keyInput) focus.keyInput(key);
        }

        setCursor(c) {
            this.canvas.style.cursor = c;
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

// Base class for all widgets.

export class Widget extends View {

    constructor(parent) {
        super();
        this.children = new Set();
        this.anchor = [0,0];                // xy values from 0-1 specifying origin point in parent
        this.pivot = [0,0];                 // xy value from 0-1 specifying origin point in widget
        this.local = [0,0];                 // Position in pixels of pivot relative to parent's anchor
        this.desiredSize = [100, 100];      // Size in pixels (may be overruled by scale)
        this.autoSize = [0,0];              // Scale to match parent (use _size if 0);
        this.border = [0,0,0,0];            // Left/Top/Right/Bottom inset of content from widget edge
        this.localOpacity = 1;              // Default value
        this.inheritOpacity = true;         // Affected by parent's opacity
        this.changeParent = false;          // Changing this widget triggers a refresh of its parent
        this.clip = false;                  // Draw operations will be clipped to widget bounds
        this.isChanged = true;
        this.isVisible = true;
        if (parent) parent.addChild(this);
    }

    destroy() {
        this.children.forEach(child => child.destroy());
        if (this.parent) this.parent.removeChild(this);
        this.detach();
    }

    addChild(child) {
        if (child.parent) child.parent.removeChild(child);
        this.children.add(child);
        child.parent = this;
        this.markChanged();
    }

    removeChild(child) {
        this.children.delete(child);
        child.parent = null;
        this.markChanged();
    }

    destroyChild(child) {
        this.removeChild(child);
        child.destroy();
    }

    setAnchor(anchor) {
        this.anchor = anchor;
        this.markChanged();
    }

    setPivot(pivot) {
        this.pivot = pivot;
        this.markChanged();
    }

    setLocal(local) {
        this.local = local;
        this.markChanged();
    }

    setSize(size) {
        this.desiredSize = size;
        this.markChanged();
    }

    setAutoSize(autoSize) {
        this.autoSize = autoSize;
        this.markChanged();
    }

    setBorder(border) {
        this.border = border;
        this.markChanged();
    }

    setOpacity(opacity, inherit = true) {
        this.localOpacity = opacity;
        this.inheritOpacity = inherit;
        this.markChanged();
    }

    setClip(clip) {
        this.clip = clip;
        this.markChanged();
    }

    setVisibility(visible, local) {
        if (this.isVisible === visible) return;
        this.isVisible = visible;
        if (!this.isVisible) {
            if (!this.changeParent) {
            //     this.markParentChanged();
            // } else {
                this.markAllChanged();
            }
        }
        this.markChanged();
    }

    show(local) {
        this.setVisibility(true, local);
    }

    hide(local) {
        this.setVisibility(false, local);
    }

    toggleVisibility(local) {
        this.setVisibility(!this.isVisible, local);
    }


    markChanged() {
        ui.markChanged();
        this._size = null;
        this._global = null;
        this._opacity = 0;
        if (this.isChanged) return;
        this.isChanged = true;
        if (this.changeParent && this.parent) this.parent.markChanged();
        this.children.forEach(child => child.markChanged());
    }

    // markParentChanged() {
    //     if (this.parent) this.parent.markChanged();
    //     // this.markChanged();
    // }

    // Tell the UI to redraw the whole screen
    // This is used for hide events
    markAllChanged() {
        if (ui && ui.root) ui.root.markChanged();
    }

    // Returns the size of the drawable area
    get size() {
        if (this._size) return this._size;
        this._size = [...this.desiredSize];
        if (this.parent && (this.autoSize[0] || this.autoSize[1])) {
            const parentSize = this.parent.size;
            if (this.autoSize[0]) this._size[0] = parentSize[0] * this.autoSize[0];
            if (this.autoSize[1]) this._size[1] = parentSize[1] * this.autoSize[1];
        }
        this._size[0] -= (this.border[0] + this.border[2]);
        this._size[1] -= (this.border[1] + this.border[3]);
        return this._size;
    }

    // Returns the upper left corner in global coordinates
    get global() {
        if (this._global) return this._global;
        if (!this.parent) return this.local;
        const anchor = v2_add(this.parent.global, v2_multiply(this.parent.size, this.anchor));
        const ulBorder = [this.border[0], this.border[1]];
        this._global = v2_add(ulBorder, v2_add(this.local, v2_sub(anchor, v2_multiply(this.size, this.pivot))));
        return this._global;
    }

    get opacity() {
        if (this._opacity ) return this._opacity;
        if (!this.parent || !this.inheritOpacity) return this.localOpacity;
        this._opacity = this.localOpacity * this.parent.opacity;
        return this._opacity;
    }

    inRect(xy) {
        const x = xy[0];
        const y = xy[1];
        const global = this.global;
        const size = this.size;
        if (x < global[0] || x > (global[0] + size[0])) return false;
        if (y < global[1] || y > (global[1] + size[1])) return false;
        return true;
     }


    update() {
        cc.save();
        if (this.clip) {
            cc.rect(this.global[0], this.global[1], this.size[0], this.size[1]);
            cc.clip();
        }
        if (this.isChanged) {
            this.drawWithOpacity();
            this.isChanged = false;
        }
        this.updateChildren();
        cc.restore();
    }

    updateChildren() {
        this.children.forEach(child => child.update());
    }

    updateNoOpacity() {
        if (this.isChanged) {
            this.draw();
            this.isChanged = false;
        }
        if (this.isVisible) this.children.forEach(child => child.updateNoOpacity());
    }

    hover(xy) { // Propagates down the widget tree.
        if (!this.isVisible || !this.inRect(xy)) return;
        this.children.forEach(child => child.hover(xy));
    }

    drag(xy) {} // Only sent to the current focus.

    press(xy) { // Propagates down the widget tree. Returns true if a child handles it.
        if (!this.isVisible || !this.inRect(xy)) return false;
        let consumed = false;
        this.children.forEach(child => consumed = child.press(xy) || consumed);
        return consumed;
    }

    release(xy) {} // Only sent to the current focus.

    drawWithOpacity() {
        if (!this.isVisible) return;
        if (this.opacity < 1) {
            cc.globalCompositeOperation = 'destination-out';
            cc.globalAlpha = 1;
            this.draw();
        }
        cc.globalCompositeOperation = 'source-over';
        cc.globalAlpha = this.opacity;
        cc.lineWidth = 1;
        this.draw();
    }

    clear() {
        const xy = this.global;
        const size = this.size;
        cc.clearRect(xy[0], xy[1], size[0], size[1]);
    }

    draw() {}

    //Converts RGB to a canvas-friendly string
    static color(r, g, b) {
        return 'rgba(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) + ', ' + 1 +')';
    }
}

//------------------------------------------------------------------------------------------
//-- RootWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The root of the widget tree. Clears the screen on redraw.

export class RootWidget extends Widget {

    draw() {
        const xy = this.global;
        const size = this.size;
        cc.clearRect(xy[0], xy[1], size[0], size[1]);
    }

}

//------------------------------------------------------------------------------------------
//-- BoxWidget -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws an area filled with a solid color.

export class BoxWidget extends Widget {
    constructor(parent) {
        super(parent);
        this.color = [0.5,0.5,0.5];
    }

    setColor(color) {
        this.color = color;
        this.markChanged();
    }

    draw() {
        const xy = this.global;
        const size = this.size;
        cc.fillStyle = Widget.color(...this.color);
        cc.fillRect(xy[0], xy[1], size[0], size[1]);
    }

}

//------------------------------------------------------------------------------------------
//-- GelWidget -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Normal translucent widgets completely erase what's behind them as part of their update,
// but gels leave it there on update. All children of the gel widget are drawn using its opacity.

export class GelWidget extends Widget {
    constructor(parent) {
        super(parent);
        this.setAutoSize([1,1]);
        this.changeParent = true;
    }

    update() {
        cc.globalCompositeOperation = 'source-over';
        cc.globalAlpha = this.opacity;
        this.updateNoOpacity();
    }

}

//------------------------------------------------------------------------------------------
//-- ImageWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Displays an image.

export class ImageWidget extends Widget {

    loadFromURL(url) {
        this.image = LoadImage(url, image => {
            this.image = image;
            this.markChanged();
        });
        this.markChanged();
    }

    loadFromCanvas(c) {
        this.image = c;
        this.markChanged();
    }

    draw() {
        if (!this.image) return;
        const xy = this.global;
        const size = this.size;
        cc.drawImage(this.image, xy[0], xy[1], size[0], size[1]);
    }

}

//------------------------------------------------------------------------------------------
//-- NineSliceWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Displays a nine-slice image that scales to preserve the proportions of its edges.

export class NineSliceWidget extends ImageWidget {
    constructor(parent) {
        super(parent);
        this.inset = [32, 32, 32, 32];      // Offset in pixels from edge of source to make slices
        this.insetScale = 1;                // Scaling factor to translate inset to screen pixels
    }

    setInset(inset) {
        this.inset = inset;
        this.markChanged();
    }

    setInsetScale(insetScale) {
        this.insetScale = insetScale;
        this.markChanged();
    }

    draw() {
        if (!this.image) return;
        const height = this.image.height;
        const width = this.image.width;
        const xy = this.global;
        const x = xy[0];
        const y = xy[1];
        const size = this.size;
        const xSize = size[0];
        const ySize = size[1];
        const left = this.inset[0];
        const top = this.inset[1];
        const right = this.inset[2];
        const bottom = this.inset[3];
        const scale = this.insetScale;

        // Left Column
        cc.drawImage(
            this.image,
            0, 0,
            left, top,
            x, y,
            left * scale, top * scale
        );
        cc.drawImage(
            this.image,
            0, top,
            left, height - top - bottom,
            x, y + top * scale,
            left * scale, ySize - (top + bottom) * scale
        );
        cc.drawImage(
            this.image,
            0, height - bottom,
            left, bottom,
            x, y + ySize- bottom * scale,
            left * scale, bottom * scale
        );

        //Middle Column
        cc.drawImage(
            this.image,
            left, 0,
            width - left - right, top,
            x + left * scale, y,
            xSize - (left + right) * scale, top * scale
        );
        cc.drawImage(
            this.image,
            left, top,
            width - left - right, height - top - bottom,
            x + left * scale, y + top * scale,
            xSize - (left + right) * scale, ySize - (top + bottom) * scale
        );
        cc.drawImage(
            this.image,
            left, height - bottom,
            width - left - right, bottom,
            x + left * scale, y + ySize - bottom * scale,
            xSize - (left + right) * scale, bottom * scale
        );

        // Right Column
        cc.drawImage(
            this.image,
            width-right, 0,
            right, top,
            x + xSize - right * scale, y,
            right * scale, top * scale
        );
        cc.drawImage(
            this.image,
            width-right, top,
            right, height - top - bottom,
            x + xSize - right * scale, y + top * scale,
            right * scale, ySize - (top + bottom) * scale
        );
        cc.drawImage(
            this.image,
            width-right, height - bottom,
            right, bottom,
            x + xSize - right * scale, y + ySize - bottom * scale,
            right * scale, bottom * scale
        );

    }

}

//------------------------------------------------------------------------------------------
//-- TextWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a piece of static text.
//
// Text should always be drawn over some background widget to refresh properly. When a text
// widget is updated, it triggers a refresh of its parent.
//
// Needs:
//
// * Word wrap
// * Selection methods for multiline text
// * Maybe single and multiline text get split into different widgets?

export class TextWidget extends Widget {

    constructor(parent) {
        super(parent);
        this.changeParent = true;
        this.text = "Text";
        this.font = "sans-serif";
        this.style = "normal";
        this.point = 24;
        this.lineHeight = 30;
        this.maxLength = 0;
        this.alignX = "center";
        this.alignY = "middle";
        this.color = [0, 0, 0];
    }

    // Redrawing text requires the background to be cleared, so we mark the parent changed.
    // markParentChanged() {
    //     if (this.parent) this.parent.markChanged();
    // }

    // markChanged() {
    //     // console.log("mark text changed");
    //     // if (this.isChanged) return;
    //     super.markChanged();
    //     this.markParentChanged();
    // }

    setText(text) {
        this.text = text;
        this.markChanged();
        // this.markParentChanged();
    }

    setFontByURL(url) {
        // this.font = LoadFont(url, () => this.markParentChanged());
        this.font = LoadFont(url, () => this.markChanged());
        this.markChanged();
        // this.markParentChanged();
    }

    setPoint(point) {
        this.point = point;
        this.markChanged();
        // this.markParentChanged();
    }

    setStyle(style) {
        this.style = style;
        this.markChanged();
        // this.markParentChanged();
    }

    setAlignX(align) {
        this.alignX = align;
        this.markChanged();
        // this.markParentChanged();
    }

    setAlignY(align) {
        this.alignY = align;
        this.markChanged();
        // this.markParentChanged();
    }

    setLineHeight(lineHeight) {
        this.lineHeight = lineHeight;
        this.markChanged();
        // this.markParentChanged();
    }

    setMaxLength(maxLength) {
        this.maxLength = maxLength;
        this.markChanged();
        // this.markParentChanged();
    }

    setColor(color) {
        this.color = color;
        this.markChanged();
        // this.markParentChanged();
    }

    get alignnmentOffset() {
        const offset = [0,0];
        const size = this.size;
        switch (this.alignX) {
            case "center":
                offset[0] += size[0] / 2;
                break;
            case "right":
                offset[0] += size[0];
                break;
            default:
        }
        let newlineCount = 0;
        const newlines = this.text.match(/\n/g);
        if (newlines) newlineCount = newlines.length;
        switch (this.alignY) {
            case "middle":
                offset[1] += (size[1] - newlineCount * this.lineHeight) / 2;
                break;
            case "bottom":
                offset[1] += size[1] - newlineCount * this.lineHeight;
                break;
            default:
        }
        return offset;
    }

    breakLines(text) {
        if (!this.maxLength) return text;
        const words = text.split(' ');
        if (words.length < 2) return text;

        let out = words[0];
        let current = words[0].length;
        for (let i = 1; i < words.length; i++) {
            current += words[i].length + 1;
            let space = ' ';
            if (current > this.maxLength) {
                current = words[i].length;
                space = '\n';
            }
            out += space + words[i];
        }
        return out;
    }

    draw() {
        // const words = this.text.split(' ');
        // console.log(words);
        const lines = this.breakLines(this.text).split('\n');
        const xy = v2_add(this.global, this.alignnmentOffset);

        cc.textAlign = this.alignX;
        cc.textBaseline = this.alignY;
        cc.font = this.style + " " + this.point + "px " + this.font;
        cc.fillStyle = Widget.color(...this.color);


        let yOffset = 0;
        if (this.alignY === 'middle') {
            yOffset = this.lineHeight * (lines.length - 1) / 2;
        } else if (this.alignY === 'bottom') {
            yOffset = this.lineHeight * (lines.length - 1);
        }

        for (let i = 0; i<lines.length; i++) {
            cc.fillText(lines[i], xy[0], xy[1] + (i * this.lineHeight) - yOffset);
        }
    }

    width() { // Returns the full width of the text in pixels given the current font.
        cc.font = this.style + " " + this.point + "px " + this.font;
        return cc.measureText(this.text).width;
    }

    findInsert(x) { // Given a point in local coordinates, finds the insert point in the text string.
        cc.font = this.style + " " + this.point + "px " + this.font;
        const c = [...this.text];
        let sum = 0;
        for (let i = 0; i < c.length; i++) {
            const w = cc.measureText(c[i]).width;
            if (x < sum + w/2) return i;
            sum += w;
        }
        return c.length;
    }

    findLetterOffset(n) { // Given a position in the text, finds the x offset in local coordinates.
        cc.font = this.style + " " + this.point + "px " + this.font;
        const c = [...this.text];
        let offset = 0;
        n = Math.min(n, c.length);
        for (let i = 0; i < n; i++) {
            offset += cc.measureText(c[i]).width;
        }
        return Math.max(0, Math.floor(offset));
    }

}

//------------------------------------------------------------------------------------------
//-- ControlWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Base class for all widgets that can be interacted with.
//
// Only control widgets can have focus. The current focus receives key, drag and release events.
//
// Control widgets have enabled/disabled states. The disabled state is implemented with a gel
// widget containing an autosized colored box. If the widget has an irregular shape (like a
// button that uses a 9 slice widget) you'll need to provide a different gel that matches the
// control shape.
//
// Each control types should handle updating its own disabledGel overlay and testing for
// isEnabled to block interactions.

export class ControlWidget extends Widget {
    constructor(parent) {
        super(parent);

        this.setDisableGel(new GelWidget());
        this.disabledGel.setOpacity(0.6);

        const gel = new BoxWidget(this.disabledGel);
        gel.setAutoSize([1,1]);
        gel.setColor([0.8,0.8,0.8]);

        this.isEnabled = true;
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) this.blur();
        this.markChanged();
    }

    toggleEnabled() {
        this.setEnabled(!this.isEnabled);
    }

    enable() {
        this.setEnabled(true);
    }

    disable() {
        this.setEnabled(false);
    }

    setDisableGel(widget) {
        if (this.disabledGel) this.destroyChild(this.disabledGel);
        this.disabledGel = widget;
        this.disabledGel.setAutoSize([1,1]);
        this.addChild(widget);
    }

    get isFocused() {
        return this === focus;
    }

    clearFocus() {
        if (focus) focus.blur();
    }

    focus() {
        if (this.isFocused) return;
        this.clearFocus();
        focus = this;
        this.onFocus();
    }

    onFocus() {}

    blur() {
        if (!this.isFocused) return;
        focus = null;
        this.onBlur();
    }

    onBlur() {}

}

//------------------------------------------------------------------------------------------
//-- ButtonWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a pressable button.
//
// The Normal/Hovered/Pressed  Box widgets can be replaced by NineSlice widgets for prettier buttons.

export class ButtonWidget extends ControlWidget {

    constructor(parent) {
        super(parent);

        this.isHovered = false;
        this.isPressed = false;

        this.setNormal(new BoxWidget());
        this.normal.setColor([0.5,0.5,0.5]);

        this.setHovered(new BoxWidget());
        this.hovered.setColor([0.65,0.65,0.65]);

        this.setPressed(new BoxWidget());
        this.pressed.setColor([0.35,0.35,0.35]);

        this.setLabel(new TextWidget());

    }

    setNormal(widget) {
        if (this.normal) this.destroyChild(this.normal);
        this.normal = widget;
        this.normal.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setHovered(widget) {
        if (this.hovered) this.destroyChild(this.hovered);
        this.hovered = widget;
        this.hovered.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setPressed(widget) {
        if (this.pressed) this.destroyChild(this.pressed);
        this.pressed = widget;
        this.pressed.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setLabel(widget) {
        if (this.label) this.destroyChild(this.label);
        this.label = widget;
        this.label.setAutoSize([1,1]);
        this.addChild(widget);
    }

    // update() {
    //     this.isChanged = false;
    //     let background = this.normal;
    //     if (this.isHovered && this.isEnabled) background = this.hovered;
    //     if (this.isPressed && this.isEnabled) background = this.pressed;
    //     if (!this.isVisible) return;
    //     if (background) background.update();
    //     if (this.label) this.label.update();
    //     if (!this.isEnabled) this.disabledGel.update();
    // }

    updateChildren() {
        let background = this.normal;
        if (this.isHovered && this.isEnabled) background = this.hovered;
        if (this.isPressed && this.isEnabled) background = this.pressed;
        if (background) background.update();
        if (this.label) this.label.update();
        if (!this.isEnabled) this.disabledGel.update();
    }

    hover(xy) {
        const state = this.isVisible && this.isEnabled && this.inRect(xy);
        if (this.isHovered !== state) {
            this.isHovered = state;
            this.markChanged();
        }
    }

    drag(xy) {
        if (!this.isVisible || !this.isEnabled) return;
        const inside = this.inRect(xy);
        if (this.isPressed === inside) return;
        this.isPressed = inside;
        this.markChanged();
    }

    touch(xy) {
        if (!this.isVisible || !this.isEnabled) return;
        if (!this.isPressed || this.inRect(xy)) return;
        this.isPressed = false;
        this.markChanged();
    }

    press(xy) {
        if (!this.isVisible || !this.isEnabled) return false;
        if (!this.inRect(xy)) return false;
        this.focus();
        this.isPressed = true;
        this.markChanged();
        return true;
    }

    release(xy) {
        this.blur();
        if (!this.isPressed) return;
        this.isPressed = false;
        this.markChanged();
        // if (!this.inRect(xy)) return;
        this.onClick();
    }

    // Called when the user presses and releases the button.

    onClick() {
    }

}

//------------------------------------------------------------------------------------------
//-- ToggleWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a button that can be toggled between an on and off state.

export class ToggleWidget extends ControlWidget {

    constructor(parent) {
        super(parent);

        this.isOn = false;
        this.isHovered = false;
        this.isPressed = false;

        this.setNormalOff(new BoxWidget());
        this.normalOff.setColor([0.5, 0.5, 0.5]);

        this.setNormalOn(new BoxWidget());
        this.normalOn.setColor([0.5, 0.5, 0.7]);

        this.setHoveredOff(new BoxWidget());
        this.hoveredOff.setColor([0.6, 0.6, 0.6]);

        this.setHoveredOn(new BoxWidget());
        this.hoveredOn.setColor([0.6, 0.6, 0.8]);

        this.setPressedOff(new BoxWidget());
        this.pressedOff.setColor([0.4, 0.4, 0.4]);

        this.setPressedOn(new BoxWidget());
        this.pressedOn.setColor([0.4, 0.4, 0.6]);

        this.setLabelOff(new TextWidget());
        this.labelOff.setText("Off");

        this.setLabelOn(new TextWidget());
        this.labelOn.setText("On");

    }

    setNormalOn(widget) {
        if (this.normalOn) this.destroyChild(this.normalOn);
        this.normalOn = widget;
        this.normalOn.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setNormalOff(widget) {
        if (this.normalOff) this.destroyChild(this.normalOff);
        this.normalOff = widget;
        this.normalOff.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setHoveredOn(widget) {
        if (this.hoveredOn) this.destroyChild(this.hoveredOn);
        this.hoveredOn = widget;
        this.hoveredOn.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setHoveredOff(widget) {
        if (this.hoveredOff) this.destroyChild(this.hoveredOff);
        this.hoveredOff = widget;
        this.hoveredOff.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setPressedOn(widget) {
        if (this.pressedOn) this.destroyChild(this.pressedOn);
        this.pressedOn = widget;
        this.pressedOn.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setPressedOff(widget) {
        if (this.pressedOff) this.destroyChild(this.pressedOff);
        this.pressedOff = widget;
        this.pressedOff.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setLabelOn(widget) {
        if (this.labelOn) this.destroyChild(this.labelOn);
        this.labelOn = widget;
        this.labelOn.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setLabelOff(widget) {
        if (this.labelOff) this.destroyChild(this.labelOff);
        this.labelOff = widget;
        this.labelOff.setAutoSize([1,1]);
        this.addChild(widget);
    }

    setState(flag) {
        if (this.isOn === flag) return;
        this.isOn = flag;
        this.markChanged();
    }

    updateChildren() {
        let background;
        let label;
        if (this.isOn) {
            background = this.normalOn;
            if (this.isHovered) background = this.hoveredOn;
            if (this.isPressed) background = this.pressedOn;
            label = this.labelOn;
        } else {
            background = this.normalOff;
            if (this.isHovered) background = this.hoveredOff;
            if (this.isPressed) background = this.pressedOff;
            label = this.labelOff;
        }
        if (background) background.update();
        if (label) label.update();
        if (!this.isEnabled) this.disabledGel.update();
    }

    // update() {
    //     let background;
    //     let label;
    //     if (this.isOn) {
    //         background = this.normalOn;
    //         if (this.isHovered) background = this.hoveredOn;
    //         if (this.isPressed) background = this.pressedOn;
    //         label = this.labelOn;
    //     } else {
    //         background = this.normalOff;
    //         if (this.isHovered) background = this.hoveredOff;
    //         if (this.isPressed) background = this.pressedOff;
    //         label = this.labelOff;
    //     }
    //     if (!this.isVisible) return;
    //     if (background) background.update();
    //     if (label) label.update();
    //     if (!this.isEnabled) this.disabledGel.update();
    // }

    hover(xy) {
        const state = this.isVisible && this.isEnabled && this.inRect(xy);
        if (this.isHovered !== state) {
            this.isHovered = state;
            this.markChanged();
        }
    }

    drag(xy) {
        if (!this.isVisible || !this.isEnabled) return;
        const inside = this.inRect(xy);
        if (this.isHovered === inside) return;
        this.isHovered = inside;
        this.isPressed = inside;
        this.markChanged();
    }

    touch(xy) {
        if (!this.isVisible || !this.isEnabled) return;
        if (!this.isPressed || this.inRect(xy)) return;
        this.isPressed = false;
        this.markChanged();
    }

    press(xy) {
        if (!this.isVisible || !this.isEnabled) return false;
        if (!this.inRect(xy)) return false;
        this.isPressed = true;
        this.focus();
        this.markChanged();
        return true;
    }

    release(xy) {
        this.blur();
        if (!this.isPressed) return;
        this.isPressed = false;
        if (this.set) {
            this.set.pick(this);
        } else {
            this.changeState(!this.isOn);
        }
        this.markChanged();
    }

    changeState(flag) {
        if (this.isOn === flag) return;
        this.isOn = flag;
        if (flag) {
            this.onToggleOn();
        } else {
            this.onToggleOff();
        }
        this.markChanged();
    }

    // Called when the user changes the toggle state, either directly or indirectly through a ToggleSet.

    onToggleOn() {
    }

    onToggleOff() {
    }

}

//------------------------------------------------------------------------------------------
//-- ToggleSet -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Helper class that manages a linked set of toggle widgets.

export class ToggleSet  {
    constructor() {
        this.toggles = new Set();
    }

    add(toggle) {
        this.toggles.add(toggle);
        toggle.set = this;
    }

    remove(toggle) {
        this.toggles.remove(toggle);
        toggle.set = null;
    }

    pick(on) {
        if (on.isOn) return; // Can't turn off a toggle in a set directly
        on.changeState(true);
        this.toggles.forEach(toggle => { if (toggle !== on) toggle.changeState(false); });
    }

}

//------------------------------------------------------------------------------------------
//-- SliderWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Managages a slider.
//
// The Bar and Knob can be replaced by Image/NineSlice widgets for a prettier look.
// The Knob will always be square and match the short dimension of the bar.

export class SliderWidget extends ControlWidget {

    constructor(parent) {
        super(parent);

        this.setBar(new BoxWidget());
        this.bar.setColor([0.5, 0.5, 0.5]);

        this.setKnob(new BoxWidget());
        this.knob.setColor([0.8, 0.8, 0.8]);
        this.knob.setBorder([2,2,2,2]);

        this.percent = 0;   // The current value of the slider.
        this.steps = 0;     // The number of descrete steps the slider has. (0=continuous)

        this.setPercent(1);

    }

    setSize(size) {
        // console.log("Slider set size: " + size);
        super.setSize(size);
        // console.log(this.size);
        this.setKnobSize();
        // this.markChanged();
    }

    setBar(widget) {
        if (this.bar) this.destroyChild(this.bar);
        this.bar = widget;
        this.bar.setAutoSize([1,1]);
        this.addChild(widget);
        this.markChanged();
    }

    setKnob(widget) {
        if (this.knob) this.destroyChild(this.knob);
        this.knob = widget;
        this.setKnobSize();
        this.addChild(widget);
        this.markChanged();
    }

    setKnobSize() {
        // console.log("Setting knob size!");
        if (this.isHorizontal) {
            this.knob.setSize([this.size[1], this.size[1]]);
        } else {
            this.knob.setSize([this.size[0], this.size[0]]);
        }
        // console.log(this);
        // console.log(this.size);
        // console.log(this.knob.size);
        // if (!this.isVisible) return;
        this.refreshKnob();
    }

    setSteps(steps) {
        this.steps = steps;
        this.setPercent(this.percent);
        this.markChanged();
    }

    setPercent(percent) {
        if (this.steps) {
            this.percent = Math.round(percent * (this.steps-1)) / (this.steps-1);
        } else {
            this.percent = percent;
        }
        if (!this.isVisible) return;
        this.refreshKnob();
        this.markChanged();
    }

    refreshKnob() {
        if (!this.knob) return;
        const xy = this.knob.local;
        if (this.isHorizontal) {
            xy[0] = (this.size[0] - (this.knob.size[0] + this.knob.border[0] + this.knob.border[2])) * this.percent;
        } else {
            xy[1] = (this.size[1] - (this.knob.size[1] + this.knob.border[1] + this.knob.border[3])) * this.percent;
        }
        this.knob.setLocal(xy);
        this.markChanged();
    }

    get isHorizontal() {
        return this.size[0] > this.size[1];
    }

    // update() {
    //     if (!this.isVisible) return;
    //     if (this.bar) this.bar.update();
    //     if (this.knob) this.knob.update();
    //     if (!this.isEnabled) this.disabledGel.update();
    // }

    updateChildren() {
        // console.log("update scroll children");
        // if (!this.isVisible) return;
        if (this.bar) this.bar.update();
        if (this.knob) this.knob.update();
        if (!this.isEnabled) this.disabledGel.update();
    }

    moveKnob(xy) {
        if (!this.isPressed || !this.isEnabled) return;
        const old = this.percent;
        const local = v2_sub(xy, this.global);
        if (this.isHorizontal) {
            this.setPercent(Math.max(0,Math.min(1,local[0] / this.size[0])));
        } else {
            this.setPercent(Math.max(0,Math.min(1,local[1] / this.size[1])));
        }
        if (this.percent === old) return;
        this.onChange(this.percent);
    }

    press(xy) {
        if (!this.isVisible || !this.isEnabled) return false;
        if (!this.inRect(xy)) return false;
        this.isPressed = true;
        this.focus();
        this.moveKnob(xy);
        return true;
    }

    release(xy) {
        this.blur();
        this.moveKnob(xy);
        this.isPressed = false;
    }

    drag(xy) {
        if (!this.isVisible || !this.isEnabled) return;
        this.moveKnob(xy);
        this.markChanged();
    }

    touch(xy) {
        this.moveKnob(xy);
    }

    // Called when the user changes the slider.
    onChange(percent) {
    }

}

//------------------------------------------------------------------------------------------
//-- TextFieldWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A single line of text that can be typed into.

export class TextFieldWidget extends ControlWidget {
    constructor(parent) {
        super(parent);

        this.insertLeft = 0;
        this.insertRight = 0;
        this.textLeft = 0;

        this.background = new BoxWidget(this);
        this.background.setAutoSize([1,1]);
        this.background.setColor([1,1,1]);

        this.clip = new Widget(this.background);
        this.clip.setBorder([5,5,5,5]);
        this.clip.setAutoSize([1,1]);
        this.clip.changeParent = true;
        this.clip.setClip(true);

        this.text = new TextWidget(this.clip);
        this.text.setAutoSize([0,1]);
        this.text.setLocal([this.textLeft, 0]);
        this.text.setAlignX('left');
        this.text.setSize([this.text.width(),0]);

        this.cursor = new BoxWidget(this.text);
        this.cursor.setAutoSize([0,1]);
        this.cursor.setSize([1,1]);
        this.cursor.changeParent = true;
        this.cursor.hide(true);

        this.gel = new GelWidget(this.text);
        this.gel.setAutoSize([0,1]);
        this.gel.setSize([1,1]);
        this.gel.setOpacity(0.2);
        this.gel.hide(true);

        this.highlight = new BoxWidget(this.gel);
        this.highlight.setAutoSize([1,1]);
        this.highlight.setColor([1,0,0]);

    }

    get isHighlit() {
        return (this.insertLeft !== this.insertRight);
    }

    destroy() {
        super.destroy();
        this.blur();
    }

    cursorBlink() {
        if (!this.isFocused) return;
        if (!this.isHighlit) {
            this.cursor.toggleVisibility(true);
            this.markChanged();
        }
        this.future(530).cursorBlink();
    }

    hover(xy) {
        if (!this.isVisible || !this.inRect(xy)) return;
        ui.setCursor("text");
    }

    drag(xy) {
        if (!this.isPressed) return;

        // Still need to support dragging past the end of the widget. These is where it should go.

        // if (xy[0] < this.clip.global[0]) {
        //     // console.log("Left!");
        //     return;
        // }
        // if (xy[0] > this.clip.global[0] + this.clip.size[0]) {
        //     // console.log("Right!");
        //     return;
        // }

        const x = xy[0] - this.text.global[0];
        const insert = this.text.findInsert(x);
        if (this.dragStart < insert) {
            this.insertLeft = this.dragStart;
            this.insertRight = insert;
        } else if (this.dragStart > insert) {
            this.insertLeft = insert;
            this.insertRight = this.dragStart;
        } else {
            this.insertLeft = this.dragStart;
            this.insertRight = this.dragStart;
        }
        this.refresh();
        // this.markChanged();
    }

    press(xy) {
        if (!this.isVisible || !this.isEnabled) return false;
        if (!this.inRect(xy)) return false;
        this.focus();
        this.isPressed = true;
        const x = xy[0] - this.text.global[0];
        const insert = this.text.findInsert(x);
        this.insertLeft = insert;
        this.insertRight = insert;
        this.dragStart = insert;
        this.refresh();
        return true;
    }

    release(xy) {
        this.isPressed = false;
    }

    doubleClick(xy) {
        if (!this.inRect(xy)) return;
        const x = xy[0] - this.text.global[0];
        const t = this.text.text;
        const insert = Math.min(t.length-1, this.text.findInsert(x));

        this.insertLeft = insert;
        this.insertRight = insert;
        if (t.length > 0) {
            const c = t[insert];
            if (isLetterOrDigit(c)) {
                while (this.insertLeft > 0 && isLetterOrDigit(t[this.insertLeft-1])) this.insertLeft--;
                while (this.insertRight < t.length && isLetterOrDigit(t[this.insertRight])) this.insertRight++;
            } else if (c === ' ') {
                while (this.insertLeft > 0 && t[this.insertLeft-1] === ' ') this.insertLeft--;
                while (this.insertRight < t.length && t[this.insertRight] === ' ') this.insertRight++;
            } else if (this.insertRight < t.length) this.insertRight++;
        }
        this.refresh();
    }

    tripleClick(xy) {
        if (!this.inRect(xy)) return;
        this.selectAll();
    }

    selectAll() {
        this.insertLeft = 0;
        this.insertRight = this.text.text.length;
        this.refresh();
    }

    keyInput(input) {
        switch (input) {
            case 'Enter':
                this.blur();
                this.onEnter();
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
            case 'Cut':
                this.cut();
                break;
            case 'Copy':
                this.copy();
                break;
            case 'Paste':
                this.paste();
                break;
            default:
               if (input.length === 1) this.insert(input);
        }
    }

    insert(s) {
        if (this.isHighlit) this.deleteRange();
        s = this.filter(s);
        const t = this.text.text.slice(0, this.insertLeft) + s + this.text.text.slice(this.insertLeft);
        this.text.setText(t);
        this.insertLeft += s.length;
        this.insertRight = this.insertLeft;
        this.refresh();
    }

    filter(s) {
        return s.replace(/\n/g, ' '); // Filter out carriage returns
    }

    delete() {
        if (this.isHighlit) {
            this.deleteRange();
        } else {
            this.deleteOne();
        }
        this.insertRight = this.insertLeft;
        this.refresh();
    }

    backspace() {
        if (this.isHighlit) {
            this.deleteRange();
        } else {
            this.backspaceOne();
        }
        this.insertRight = this.insertLeft;
        this.refresh();
    }

    deleteRange() {
        const cut = Math.min(this.text.text.length, this.insertRight);
        const t = this.text.text.slice(0, this.insertLeft) + this.text.text.slice(cut);
        this.text.setText(t);
    }


    deleteOne() {
        const cut = Math.min(this.text.text.length, this.insertRight + 1);
        const t = this.text.text.slice(0, this.insertLeft) + this.text.text.slice(cut);
        this.text.setText(t);
    }

    backspaceOne() {
        const cut = Math.max(0, this.insertLeft - 1);
        const t = this.text.text.slice(0, cut) + this.text.text.slice(this.insertRight);
        this.insertLeft = cut;
        this.text.setText(t);
    }

    cursorLeft() {
        this.insertLeft = Math.max(0, this.insertLeft - 1);
        this.insertRight = this.insertLeft;
        this.refresh();
    }

    cursorRight() {
        this.insertLeft = Math.min(this.text.text.length, this.insertLeft + 1);
        this.insertRight = this.insertLeft;
        this.refresh();
    }

    cut() {
        if (!this.isHighlit) return;
        const t = this.text.text.slice(this.insertLeft, this.insertRight);
        this.delete();
        navigator.clipboard.writeText(t); // This is a promise, but we don't care if it finishes.
    }

    copy() {
        if (!this.isHighlit) return;
        const t = this.text.text.slice(this.insertLeft, this.insertRight);
        navigator.clipboard.writeText(t); // This is a promise, but we don't care if it finishes.
    }

    paste() {
        navigator.clipboard.readText().then(text => this.insert(text));
    }

    onFocus() {
        ui.requestVirtualKeyboard(this.global);
        this.insertLeft = this.text.text.length;
        this.insertRight = this.text.text.length;
        this.refresh();
        this.markChanged();
        this.future(530).cursorBlink();
    }

    onBlur() {
        // console.log("blur!");
        ui.dismissVirtualKeyboard();
        this.cursor.hide(true);
        this.gel.hide(true);
        this.markChanged();
    }

    // update() {
    //     // if (!this.isVisible) return;
    //     this.background.update();
    //     if (!this.isEnabled) this.disabledGel.update();
    // }

    updateChildren() {
        this.background.update();
        if (!this.isEnabled) this.disabledGel.update();
    }

    refresh() {
        if (this.isHighlit) {
            this.refreshHighlight();
        } else {
            this.refreshCursor();
        }
        this.markChanged();
    }

    refreshHighlight() {
        const leftOffset = this.text.findLetterOffset(this.insertLeft);
        const rightOffset = this.text.findLetterOffset(this.insertRight);

        this.gel.setLocal([leftOffset, 0]);
        this.gel.setSize([rightOffset - leftOffset, 0]);

        this.cursor.hide(true);
        this.gel.show(true);
    }

    refreshCursor() {
        const clipRight = this.clip.size[0];
        const textWidth = this.text.width();
        const textRight = this.textLeft + textWidth;

        if (textWidth < clipRight) {
            this.textLeft = 0;
        } else if (textRight < clipRight) {
            this.textLeft = clipRight-textWidth;
        }

        const offset = this.text.findLetterOffset(this.insertLeft);
        const globalOffset = this.textLeft + offset;

        if (globalOffset < 0) {
            this.textLeft = -offset;
        } else if (globalOffset > clipRight) {
            this.textLeft = clipRight-1-offset;
        }

        this.text.setLocal([this.textLeft, 0]);
        this.cursor.setLocal([offset, 0]);
        this.gel.hide(true);
        this.cursor.show(true);
    }

    onEnter() {
    }
}

//------------------------------------------------------------------------------------------
//-- Helper Functions ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function isLetter(c) { // Returns true if the character is an alphabetic letter.
    return c.toLowerCase() !== c.toUpperCase();
}

function isDigit(c) { // Returns true if the character is a digit.
    return c.match(/[0-9]/i);
}

function isLetterOrDigit(c) {
    return isLetter(c) || isDigit(c);
}
