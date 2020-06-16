import { View } from "@croquet/croquet";
import { v2_sub, v2_multiply, v2_add, v2_scale } from "./Vector";
import { LoadFont, LoadImage} from "./ViewAssetCache";
import { NamedView } from "./NamedView";
import { Widget } from "./Widget";

let ui;             // The UI manager
let hover;          // The control widget that currently is hovered.
let focus;          // The control widget that currently has focus.
// let cc;             // The canvas context
// let opacity = 1;    // The global opacity

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

export class UIManager2 extends NamedView {

    constructor() {
        super('UIManager2');

        ui = this; // Global pointer for widgets to use.

        // this.canvas = document.createElement("canvas");
        // this.canvas.id = "UICanvas";
        // this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 1; height: 500; width: 700; background-color: coral; ";
        // document.body.insertBefore(this.canvas, null);
        // cc = this.canvas.getContext('2d');

        // this.xxx = new CanvasPane();
        // this.xxx.set({size: [50,50], local: [20,20]});


        this.scale = 1;

        // this.panes = new Set();
        this.size = [100,100];
        this.global = [0,0];
        this.resize();
        this.setRoot(new CanvasWidget(this, {autoSize: [1,1]}));
        // this.root = new CanvasWidget(this, {autoSize: [1,1]});

        this.subscribe("input", {event: "resize", handling: "immediate"}, this.resize);
        this.subscribe("input", {event: "mouseXY", handling: "immediate"}, this.mouseXY);
        this.subscribe("input", {event: "mouse0Down", handling: "immediate"}, this.mouseDown);
        this.subscribe("input", {event: "mouse0Up", handling: "immediate"}, this.mouseUp);

        // this.subscribe("input", {event: "mouse0Double", handling: "immediate"}, this.mouseDouble);
        // this.subscribe("input", {event: "mouse0Triple", handling: "immediate"}, this.mouseTriple);

        this.subscribe("input", {event: "touchXY", handling: "immediate"}, this.touchXY);
        this.subscribe("input", {event: "touchDown", handling: "immediate"}, this.touchDown);
        this.subscribe("input", {event: "touchUp", handling: "immediate"}, this.touchUp);

        // this.subscribe("input", {event: "keyDown", handling: "immediate"}, this.keyDown);
        // this.subscribe("input", {event: "keyRepeat", handling: "immediate"}, this.keyDown);
    }

    destroy() {
        super.destroy();
        if (hover) hover.unhover();
        if (focus) focus.blur();
        if (this.root) this.root.destroy();
        ui = null;
    }

    // Note that setting the root does not destroy the old root!
    setRoot(root) {
        if (this.root === root) return;
        if (this.root) this.root.setParent(null);
        this.root = root;
        this.root.setParent(this);
        if (hover) hover.unhover();
        if (focus) focus.blur();
        if (this.root) this.root.markChanged();
    }

    addChild(root) {
        this.setRoot(root);
    }

    removeChild(child) {
        if (this.root === child) this.root = null;
    }

    get isVisible() { return true; }
    // get origin() { return this.global; }

    resize() {
        if (hover) hover.unhover();
        if (focus) focus.blur();
        this.ratio = window.devicePixelRatio * this.scale;
        // this.root.cc.scale(this.ratio, this.ratio);
        console.log("UI Pixel Ratio: " + this.ratio);
        const width = window.innerWidth;
        const height = window.innerHeight;
        // const width = 700;
        // const height = 700;
        // this.canvas.style.width = width + "px";
        // this.canvas.style.height = height + "px";
        // this.canvas.width = width * this.ratio;
        // this.canvas.height = height * this.ratio;
        this.size = [width * this.ratio, height * this.ratio];
        // this.panes.forEach(pane => pane.markChanged());
        if (this.root) this.root.markChanged();
        // if (this.root) this.root.set({size: this.size});
    }

    setScale(scale) {
        this.scale = scale;
        this.resize();
    }

    // setOpacity(o) {
    //     opacity = o;
    //     if (this.root) this.root.markChanged();
    // }

    update() {
        if (!this.isChanged) return;
        this.isChanged = false;
        if (this.root) this.root.update();
    }

    markChanged() {
        this.isChanged = true;
    }

    mouseXY(xy) {
        xy = v2_scale(xy, this.ratio);
        let consumed = false;
        if (!consumed && focus) consumed = focus.drag(xy);
        if (!consumed && hover) consumed = hover.cursor(xy);
        if (!consumed && this.root) consumed = this.root.cursor(xy);
        // this.setCursor('default');
        this.publish("ui", "mouseXY", xy);
    }

    mouseDown(xy) {
        xy = v2_scale(xy, this.ratio);
        if (!hover) return;
        if (!hover.press(xy)) this.publish("ui", "mouse0Down", xy);
    }

    mouseUp(xy) {
        xy = v2_scale(xy, this.ratio);
        if (focus) focus.release(xy);
        this.publish("ui", "mouse0Up", xy);
    }

    touchXY(xy) {
        xy = v2_scale(xy, this.ratio);
        if (focus) focus.drag(xy);
        this.publish("ui", "touchXY", xy);
    }

    touchDown(xy) {
        xy = v2_scale(xy, this.ratio);
        if (!this.root) return;
        if (!this.root.press(xy)) this.publish("ui", "touchDown", xy);
    }

    touchUp(xy) {
        xy = v2_scale(xy, this.ratio);
        if (focus) focus.release(xy);
        this.publish("ui", "touchUp", xy);
    }

    // mouseDouble(xy) {
    //     if (!focus || !focus.doubleClick) return;
    //     focus.doubleClick(xy);
    // }

    // mouseTriple(xy) {
    //     if (!focus || !focus.tripleClick) return;
    //     focus.tripleClick(xy);
    // }


    // keyDown(key) {
    //     if (focus && focus.keyInput) focus.keyInput(key);
    // }

    // setCursor(c) {
    //     this.canvas.style.cursor = c;
    // }

    // This is a hack to trigger the virtual keyboard on mobile. There is an invisible text entry element that
    // gets drawn underneath the real text entry widget. Giving this fake text field focus pops up the
    // keyboard. When we have our own virtual keyboard as part of the widget system, this should go away.

    // requestVirtualKeyboard(xy) {
    //     this.fakeText.style.left = xy[0] + 'px';
    //     this.fakeText.style.top = xy[1] + 'px';
    //     this.fakeText.focus();
    // }

    // dismissVirtualKeyboard() {
    //     this.fakeText.blur();
    // }

    // fakeTextBlur() {
    //     this.value = "A"; // This prevents the virtual keyboard from defaults to caps
    //     if (focus) focus.blur();
    // }

}

//------------------------------------------------------------------------------------------
//-- Widget --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget2 extends View {
    constructor(parent, options) {
        super();
        this.set(options);
        if (parent) parent.addChild(this);

        this.subscribe(this.id, { event: "visible", handling: "immediate" }, visible => {if (!visible) this.markCanvasChanged();} );
    }

    destroy() {
        if (this.children) this.children.forEach(child => child.destroy());
        if (this.parent) this.parent.removeChild(this);
        this.detach();
    }

    addChild(child) {
        if (child.parent === this) return;
        if (!this.children) this.children = new Set();
        if (child.parent) child.parent.removeChild(child);
        this.children.add(child);
        child.setParent(this);
        child.setCanvasWidget(this.canvasWidget);
        this.markChanged();
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
        child.setParent(null);
        this.markChanged();
    }

    destroyChild(child) {
        this.removeChild(child);
        child.destroy();
    }

    setParent(p) {  // This should only be called by addChild & removeChild
        this.parent = p;
    }

    setCanvasWidget(canvasWidget) {
        if (canvasWidget === this.canvasWidget) return;
        this.canvasWidget = canvasWidget;
        if (this.children) this.children.forEach(child => child.setCanvasWidget(this.canvasWidget));
    }

    get cc() {return this.canvasWidget.context;}

    markChanged() {
        ui.markChanged();
        if (this.isChanged) return;
        this.isChanged = true;
        this.$size = undefined;
        this.$global = undefined;
        this.$origin = undefined;
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
            if (this[n] !== option) {
                const v = options[option];
                this[n] = v;
                changed = true;
                this.publish(this.id, option, v);
            }
        }
        if (changed) this.markChanged();
    }

    show() { this.set({visible: true}); }
    hide() { this.set({visible: false}); }
    toggleVisible() { this.set({visible: !this.visible}); }

    get anchor() { return this._anchor || [0,0];}
    get pivot() { return this._pivot || [0,0];}
    get local() { return this._local || [0,0];}
    get border() { return this._border || [0,0,0,0];}
    get autoSize() { return this._autoSize || [0,0];}
    get isClipped() { return this._clip; }  // Default to false
    get isVisible() { return this._visible === undefined || this._visible;} // Default to true
    get bubbleChanges() { return this._bubbleChanges; } // Default to false

    // Returns the size of the drawable area
    get size() {
        if (this.$size) return this.$size;
        const size = this._size || [100,100];
        this.$size = [...size];
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
        if (this.parent) {
            const border = this.border;
            const size = [...this.size];
            size[0] += (border[0] + border[2]);
            size[1] += (border[1] + border[3]);
            const anchor = v2_multiply(this.parent.size, this.anchor);
            const pivot = v2_multiply(size, this.pivot);
            const offset = v2_sub(anchor, pivot);
            const ulBorder = [border[0], border[1]];
            this.$global = v2_add(this.parent.global, v2_add(ulBorder, v2_add(this.local, offset)));
        } else {
            this.$global = this.local;
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

    cursor(xy) { // Propagates down the widget tree. Returns true if a child handles it.
        if (!this.isVisible || !this.inside(xy)) return false;
        let consumed = false;
        if (this.children) this.children.forEach(child => consumed = child.cursor(xy) || consumed);
        return consumed;
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
        if (this.isClipped) this.clip();
        if (this.isChanged) this.draw();
        if (this.children) this.updateChildren();
        this.cc.restore();
        this.isChanged = false;
    }

    // Some elements may need more control over the order they update their children
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

export class ElementWidget extends Widget2 {

    destroy() {
        super.destroy();
        this.element.remove();
    }

    setParent(p) {
        super.setParent(p);
        this.subscribeToAncestors();
    }

    // We listen to see if any ancestor goes invisible so we can make the element vanish too.

    subscribeToAncestors() {
        this.unsubscribeAll();
        let p = this.parent;
        while (p) {
            this.subscribe(p.id, "visible", this.draw);
            p = p.parent;
        }
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
        const ratio = ui.ratio;
        if (this.ancestorsAreVisible) {
            this.element.style.display = 'inline';
        } else {
            this.element.style.display = 'none';
        }
        this.cc.scale(ratio, ratio);
        const left = Math.floor(this.global[0] / ratio);
        const top = Math.floor(this.global[1] / ratio);
        const width = Math.floor(this.size[0]+1);
        const height = Math.floor(this.size[1]+1);
        this.element.width = width;
        this.element.height = height;
        this.element.style.top = top + "px";
        this.element.style.left = left + "px";
        this.element.style.width = width / ratio + "px";
        this.element.style.height = height / ratio + "px";
        this.clear();
    }
}



//------------------------------------------------------------------------------------------
//-- CanvasWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CanvasWidget extends ElementWidget {
    constructor(...args) {
        super(...args);
        this.element = document.createElement("canvas");
        this.element.style.cssText = "position: absolute; left: 0; top: 0; height: 100; width 100; z-index: 1;";
        document.body.insertBefore(this.element, null);
        this.context = this.element.getContext('2d');
        this.canvasWidget = this;

        this.setElementOpacity();
        this.setElementBackground();

        this.subscribe(this.id, {event: "opacity"}, this.setElementOpacity );
        this.subscribe(this.id, {event: "color"}, this.setElementBackground );
    }

    get opacity() { return this._opacity || 1;}
    get color() { return this._color; }

    setElementOpacity() {
        this.element.style.opacity = "" + this.opacity;
    }

    setElementBackground() {
        if (this.color) {
            console.log(canvasColor(...this.color));
            this.element.style.background = canvasColor(...this.color);
        } else {
            this.element.style.background = 'transparent';
        }

    }

    setCanvasWidget() {
        this.canvasWidget = this;
        if (this.children) this.children.forEach(child => child.setCanvasWidget(this.canvasWidget));
    }

}

//------------------------------------------------------------------------------------------
//-- IFrameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class IFrameWidget extends ElementWidget {
    constructor(...args) {
        super(...args);
        this.element = document.createElement("iframe");
        this.element.setAttribute("src", "https://croquet.io/quub/#GUEST/1cry0ylrjmy");
        this.element.style.cssText = "position: absolute; left: 0; top: 0; width: 200px; height: 200px; border: 0; z-index: 10";
        document.body.insertBefore(this.element, null);

        this.setElementOpacity();
        this.subscribe(this.id, {event: "opacity"}, this.setElementOpacity );
    }

    setElementOpacity() {
        this.element.style.opacity = "" + this.opacity;
    }


    update() {
        if (this.isChanged) this.draw();
        this.isChanged = false;
    }

    draw() {
        const ratio = ui.ratio;
        if (this.ancestorsAreVisible) {
            this.element.style.display = 'inline';
        } else {
            this.element.style.display = 'none';
        }
        const left = Math.floor(this.global[0] / ratio);
        const top = Math.floor(this.global[1] / ratio);
        const width = Math.floor(this.size[0]+1);
        const height = Math.floor(this.size[1]+1);
        this.element.width = width;
        this.element.height = height;
        this.element.style.top = top + "px";
        this.element.style.left = left + "px";
        this.element.style.width = width / ratio + "px";
        this.element.style.height = height / ratio + "px";
        this.clear();
    }

    // draw() {
    //     const ratio = ui.ratio;
    //     if (this.ancestorsAreVisible) {
    //         this.iframe.style.display = 'inline';
    //     } else {
    //         this.iframe.style.display = 'none';
    //     }
    //     const left = this.global[0] / ratio;
    //     const top = this.global[1] / ratio;
    //     const width = this.size[0];
    //     const height = this.size[1];
    //     // this.iframe.width = width * ratio;
    //     // this.iframe.height = height * ratio;
    //     this.iframe.width = width;
    //     this.iframe.height = height;
    //     this.iframe.style.top = top + "px";
    //     this.iframe.style.left = left + "px";
    //     this.iframe.style.width = width / ratio + "px";
    //     this.iframe.style.height = height / ratio + "px";
    // }


}


//------------------------------------------------------------------------------------------
//-- Widget --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Base class for all widgets.

// export class Widget2 extends UIElement {

    // constructor(parent, options) {
    //     super();
    //     this.set(options);
    //     if (parent) parent.addChild(this);

    //     this.subscribe(this.id, { event: "invisible", handling: "immediate" }, this.invisibleChanged );
    // }

    // invisibleChanged(state) { // When a widget is hidden, redraw the whole screen.
    //     if (state) this.markAllChanged();
    // }

    // destroy() {
    //     if (this.children) this.children.forEach(child => child.destroy());
    //     if (this.parent) this.parent.removeChild(this);
    //     this.detach();
    // }

    // addChild(child) {
    //     if (child.parent === this) return;
    //     if (!this.children) this.children = new Set();
    //     if (child.parent) child.parent.removeChild(child);
    //     this.children.add(child);
    //     child.parent = this;
    //     this.markChanged();
    // }

    // removeChild(child) {
    //     if (this.children) this.children.delete(child);
    //     child.parent = null;
    //     this.markChanged();
    // }

    // destroyChild(child) {
    //     this.removeChild(child);
    //     child.destroy();
    // }

    // set(options) {
    //     let changed = false;
    //     for (const option in options) {
    //         const n = "_" + option;
    //         if (this[n] !== option) {
    //             const v = options[option];
    //             this[n] = v;
    //             changed = true;
    //             this.publish(this.id, option, v);
    //         }
    //     }
    //     if (changed) this.markChanged();
    // }

    // show() { this.set({invisible: false}); }
    // hide() { this.set({invisible: true}); }
    // toggleInvisible() { this.set({invisible: !this.invisible}); }

    // get anchor() { return this._anchor || [0,0];}
    // get pivot() { return this._pivot || [0,0];}
    // get local() { return this._local || [0,0];}
    // get border() { return this._border || [0,0,0,0];}
    // get autoSize() { return this._autoSize || [0,0];}
    // get clip() { return this._clip; }
    // get invisible() { return this._invisible; }
    // get opacity() { return this._opacity || 1;}
    // get bubbleChanges() { return this._bubbleChanges; }

    // Returns the size of the drawable area
    // get size() {
    //     if (this.$size) return this.$size;
    //     const size = this._size || [100,100];
    //     this.$size = [...size];
    //     if (this.parent) {
    //         const parentSize = this.parent.size;
    //         if (this.autoSize[0]) this.$size[0] = parentSize[0] * this.autoSize[0];
    //         if (this.autoSize[1]) this.$size[1] = parentSize[1] * this.autoSize[1];
    //     }
    //     const border = this.border;
    //     this.$size[0] -= (border[0] + border[2]);
    //     this.$size[1] -= (border[1] + border[3]);
    //     return this.$size;
    // }

    // // Returns the upper left corner in global coordinates
    // get global() {
    //     if (this.$global) return this.$global;
    //     if (this.parent) {
    //         const border = this.border;
    //         const size = [...this.size];
    //         size[0] += (border[0] + border[2]);
    //         size[1] += (border[1] + border[3]);
    //         const anchor = v2_multiply(this.parent.size, this.anchor);
    //         const pivot = v2_multiply(size, this.pivot);
    //         const offset = v2_sub(anchor, pivot);
    //         const ulBorder = [border[0], border[1]];
    //         this.$global = v2_add(this.parent.global, v2_add(ulBorder, v2_add(this.local, offset)));
    //     } else {
    //         this.$global = this.local;
    //     }
    //     return this.$global;
    // }

    // Returns true if the global point is inside the widget
    // inside(xy) {
    //     const x = xy[0];
    //     const y = xy[1];
    //     const global = this.global;
    //     const size = this.size;
    //     if (x < global[0] || x > (global[0] + size[0])) return false;
    //     if (y < global[1] || y > (global[1] + size[1])) return false;
    //     return true;
    // }

    // markChanged() {
    //     ui.markChanged();
    //     if (this.isChanged) return;
    //     this.$size = undefined;
    //     this.$global = undefined;
    //     this.isChanged = true;
    //     if (this.bubbleChanges && this.parent) this.parent.markChanged();
    //     if (this.children) this.children.forEach(child => child.markChanged());
    // }

    // Tell the UI to redraw the whole screen
    // This is used for hide events
    // markAllChanged() {
    //     if (ui && ui.root) ui.root.markChanged();
    // }

    // update() {
    //     if (this.invisible) return;
    //     cc.save();
    //     const oldOpacity = opacity;
    //     opacity *= this.opacity;
    //     if (this.clip) {
    //         cc.rect(this.global[0], this.global[1], this.size[0], this.size[1]);
    //         cc.clip();
    //     }
    //     if (this.isChanged) {
    //         if (opacity < 1) { // Erase behind the draw area.
    //             cc.globalCompositeOperation = 'destination-out';
    //             cc.globalAlpha = 1;
    //             this.draw();
    //             cc.globalCompositeOperation = 'source-over';
    //             cc.globalAlpha = opacity;
    //         }
    //         this.draw();
    //     }
    //     if (this.children) this.updateChildren();
    //     this.isChanged = false;
    //     opacity = oldOpacity;
    //     cc.restore();
    // }

    // Some widgets may need more control over the order they update their children
    // updateChildren() {
    //     this.children.forEach(child => child.update());
    // }

    // cursor(xy) { // Propagates down the widget tree. Returns true if a child handles it.
    //     if (this.invisible || !this.inside(xy)) return false;
    //     let consumed = false;
    //     if (this.children) this.children.forEach(child => consumed = child.cursor(xy) || consumed);
    //     return consumed;
    // }

    // press(xy) { // Propagates down the widget tree. Returns true if a child handles it.
    //     if (this.invisible || !this.inside(xy)) return false;
    //     let consumed = false;
    //     if (this.children) this.children.forEach(child => consumed = child.press(xy) || consumed);
    //     return consumed;
    // }

    // clear() {
    //     const xy = this.global;
    //     const size = this.size;
    //     cc.clearRect(xy[0], xy[1], size[0], size[1]);
    // }

    // draw() {}

    // updateNoOpacity() {
    //     if (this.isChanged) {
    //         this.draw();
    //         this.isChanged = false;
    //     }
    //     if (this.isVisible) this.children.forEach(child => child.updateNoOpacity());
    // }

    // hover(xy) { // Propagates down the widget tree.
    //     if (!this.isVisible) return;
    //     this.children.forEach(child => child.hover(xy));
    // }

    // drag(xy) {} // Only sent to the current focus.

    // press(xy) { // Propagates down the widget tree. Returns true if a child handles it.
    //     if (!this.isVisible || !this.inRect(xy)) return false;
    //     let consumed = false;
    //     this.children.forEach(child => consumed = child.press(xy) || consumed);
    //     return consumed;
    // }

    // release(xy) {} // Only sent to the current focus.

    // drawWithOpacity() {
    //     if (!this.isVisible) return;
    //     if (this.opacity < 1) {
    //         cc.globalCompositeOperation = 'destination-out';
    //         cc.globalAlpha = 1;
    //         this.draw();
    //     }
    //     cc.globalCompositeOperation = 'source-over';
    //     cc.globalAlpha = this.opacity;
    //     cc.lineWidth = 1;
    //     this.draw();
    // }


// }

//------------------------------------------------------------------------------------------
//-- RootWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The root of the widget tree. Clears the screen on redraw.

// export class RootWidget2 extends Widget2 {

//     draw() { this.clear(); }

// }

//------------------------------------------------------------------------------------------
//-- BoxWidget -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws an area filled with a solid color.

export class BoxWidget2 extends Widget2 {

    get color() { return this._color || [0.5,0.5,0.5];}

    draw() {
        const xy = this.origin;
        const size = this.size;
        this.cc.fillStyle = canvasColor(...this.color);
        this.cc.fillRect(xy[0], xy[1], size[0], size[1]);
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
// * Selection methods for multiline text
// * Maybe single and multiline text get split into different widgets?

export class TextWidget2 extends Widget2 {

    setText(t) {this.set({text: t});}

    get bubbleChanges() { return this._bubbleChanges === undefined || this._bubbleChanges;} // Default to true
    get text() { return this._text || "Text";}
    get font() { return this._font || "sans-serif";}
    get style() { return this._style || "normal";}
    get point() { return this._point || 24;}
    get lineSpacing() { return this._lineSpacing || 0;}
    get alignX() { return this._alignX || "center";}
    get alignY() { return this._alignY || "middle";}
    get wrap() { return this._wrap === undefined || this._wrap;} // Default to true
    get color() { return this._color || [0,0,0];}

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
        const lineHeight = this.point + this.lineSpacing;

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

    width() { // Returns the full width of the text in pixels given the current font.
        this.cc.font = this.style + " " + this.point + "px " + this.font;
        return this.cc.measureText(this.text).width;
    }

    findInsert(x) { // Given a point in local coordinates, finds the insert point in the text string.
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

// Control widgets have enabled/disabled states. The disabled state is implemented with a gel
// widget containing an autosized colored box. If the widget has an irregular shape (like a
// button that uses a 9 slice widget) you'll need to provide a different gel that matches the
// control shape.

// Each control types should handle updating its own disabledGel overlay and testing for
// isEnabled to block interactions.

export class ControlWidget2 extends Widget2 {
    // constructor(parent) {
    //     super(parent);

    //     this.setDisableGel(new GelWidget());
    //     this.disabledGel.setOpacity(0.6);

    //     const gel = new BoxWidget(this.disabledGel);
    //     gel.setAutoSize([1,1]);
    //     gel.setColor([0.8,0.8,0.8]);

    // }

    enable() { this.set({ disabled: false }); }
    disable() { this.set({ disabled: true }); }
    toggleDisabled() { this.set({ disabled: !this.disabled }); }

    get isDisabled() { return this._disabled;}
    get isHovered() { return this === hover; }
    get isFocused() { return this === focus; }

    hover() {
        if (this.isDisabled || this.isHovered) return;
        if (hover) hover.unhover();
        hover = this;
        this.markChanged();
        this.onHover();
     }

    unhover() {
        if (!this.isHovered) return;
        hover = null;
        this.markChanged();
        this.onUnhover();
    }

    focus() {
        if (this.isDisabled || this.isFocused) return;
        if (focus) hover.blur();
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

    onHover() {}
    onUnhover() {}
    onFocus() {}
    onBlur() {}

    cursor(xy) {
        if (!this.invisible && !this.isDisabled && this.inside(xy)) {
            this.hover();
        } else {
            this.unhover();
        }
        return true;
    }

    drag(xy) { return false; }
    press(xy) { return false; }
    release(xy) {}

    // setDisableGel(widget) {
    //     if (this.disabledGel) this.destroyChild(this.disabledGel);
    //     this.disabledGel = widget;
    //     this.disabledGel.setAutoSize([1,1]);
    //     this.addChild(widget);
    // }


}

//------------------------------------------------------------------------------------------
//-- ButtonWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Draws a pressable button.
//
// The Normal/Hovered/Pressed Box widgets can be replaced by NineSlice widgets for prettier buttons.

export class ButtonWidget2 extends ControlWidget2 {

    constructor(...args) {
        super(...args);

        this.setNormal(new BoxWidget2(this, {autoSize: [1,1], color: [0.5,0.5,0.5]}));
        this.setHilite(new BoxWidget2(this, {autoSize: [1,1], color: [0.65,0.9,0.65]}));
        this.setPressed(new BoxWidget2(this, {autoSize: [1,1], color: [0.9,0.35,0.35]}));
        this.setLabel(new TextWidget2(this, {autoSize: [1,1]}));

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
        // if (!this.isEnabled) this.disabledGel.update();
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
        if (this.inside(xy)) this.onClick();
    }

    // Called when the user presses and releases the button.

    onClick() {
        console.log("click!");
    }

}

//------------------------------------------------------------------------------------------
//-- Helper Functions ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function canvasColor(r, g, b) {
    return 'rgb(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) +')';
}
