import { WorldcoreView, viewRoot, ViewService, v2_add, v2_magnitude, v2_scale, v2_normalize, v2_sub, Widget, v2_equals, v3_equals} from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
//-- HelperFunctions -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function canvasColor(r, g, b) {
    return 'rgb(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) +')';
}

//------------------------------------------------------------------------------------------
//-- HUD -----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class HUD extends ViewService {
    constructor() {
        super("HUD");

        const x = window.innerWidth;
        const y = window.innerHeight;
        this.topWindow = 0; // Eventually we should resort them
        this.root = new Widget2({size: [x,y]});
        this.subscribe("input", {event: "resize", handling: "immediate"}, this.resize);
        this.subscribe("input", { event: "pointerDown", handling: "immediate" }, this.pointerDown);
        this.subscribe("input", { event: "pointerUp", handling: "immediate" }, this.pointerUp);
        this.subscribe("input", { event: "pointerMove", handling: "immediate" }, this.pointerMove);
    }

    destroy() {
        super.destroy();
        if (this.root) this.root.destroy();
    }

    update(time,delta) {
        this.root.update(time,delta);
    }

    resize() {
        const x = window.innerWidth;
        const y = window.innerHeight;
        this.root.set({size: [x,y]});
    }

    pointerDown(e) {
        if (this.root.pointerDown(e)) return;
        this.publish("hud", "pointerDown", e);
    }

    pointerUp(e) {
        this.root.pointerUp(e);
        this.publish("hud", "pointerUp", e);
    }

    pointerMove(e) {
        this.root.pointerMove(e);
        this.publish("hud", "pointerMove", e);
    }

}

//------------------------------------------------------------------------------------------
//-- Widget2 -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget2 extends Widget {

    update(time,delta) {
        if (this.reposition) {
            this.position();
            this.reposition = false;
        }
        if (this.redraw) {
            this.draw();
            this.redraw = false;
        }
        if (this.children) this.children.forEach( child => child.update(time,delta));
    }

    position() {}
    draw() {}

    repositionChildren() {
        this.reposition  = true;
        if (this.children) this.children.forEach( child => child.repositionChildren());
    }

    redrawChildren() {
        this.redraw  = true;
        if (this.children) this.children.forEach( child => child.redrawChildren());
    }

    parentSet(value, old) {
        super.parentSet(value, old);
        this.repositionChildren();
    }

    sizeSet(value, old) {
        if (old && v2_equals(value, old)) return;
        this.repositionChildren();
        this.redrawChildren();
    }

    translationSet(value, old) {
        if (old && v2_equals(value, old)) return;
        this.repositionChildren();
    }

    anchorSet(value, old) {
        if (old && v2_equals(value, old)) return;
        this.repositionChildren();
    }

    pivotSet(value, old) {
        if (old && v2_equals(value, old)) return;
        this.repositionChildren();
    }

    colorSet(value, old) {
        if (old && v3_equals(value, old)) return;
        this.redraw = true;
    }

    visibleSet(value, old) {
        if (value === old) return;
        this.redrawChildren();
    }

    depthSet() { this.repositionChildren()}

    inside(xy) {
        const x = xy[0];
        const y = xy[1];
        if (x < this.global[0] || x > (this.global[0] + this.trueSize[0])) return false;
        if (y < this.global[1] || y > (this.global[1] + this.trueSize[1])) return false;
        return true;
    }

    pointerDown(e) {
        if (!this.isVisible) return false;
        let consumed = false;
        // const sss = this.sortedChildren;
        for (const child of this.sortedChildren) {
            consumed = child.pointerDown(e) || consumed;
        }
        // if (this.children) this.children.forEach( child => consumed = child.pointerDown(e) || consumed);
        return consumed;
    }

    pointerUp(e) {
        if (!this.visible) return;
        if (this.children) this.children.forEach( child => child.pointerUp(e));
    }

    pointerMove(e) {
        if (!this.visible) return;
        if (this.children) this.children.forEach( child => child.pointerMove(e));
    }

}

//------------------------------------------------------------------------------------------
//-- VerticalWidget2------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class VerticalWidget2 extends Widget2 {

    get margin() { return this._margin || 0}

    addChild(child) {
        super.addChild(child);
        this.resize();
    }

    resize() {
        if (!this.children) return;
        let sum = Math.max(0, (this.children.size - 1) * this.margin);
        let count = 0;

        this.children.forEach(child => {
            if (child.height) {
                sum += child.height;
            } else {
                count++;
            }
        });

        let auto = 0;
        if (count > 0) auto = Math.max(0, (this.trueSize[1] - sum) / count);
        let offset = 0;
        this.children.forEach(child => {
            let height = auto;
            if (child.height) height = child.height;
            child.set({autoSize: [1,0], size:[0, height], anchor: null, pivot: null, translation: [0,offset]});
            offset += height + this.margin;
        });
    }

}

//------------------------------------------------------------------------------------------
//-- HorizontalWidget2----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class HorizontalWidget2 extends Widget2 {

    get margin() { return this._margin || 0}

    addChild(child) {
        super.addChild(child);
        this.resize();
    }

    resize() {
        if (!this.children) return;
        let sum = Math.max(0, (this.children.size - 1) * this.margin);
        let count = 0;

        this.children.forEach(child => {
            if (child.width) {
                sum += child.width;
            } else {
                count++;
            }
        });

        let auto = 0;
        if (count > 0) auto = Math.max(0, (this.trueSize[0] - sum) / count);
        let offset = 0;
        this.children.forEach(child => {
            let width = auto;
            if (child.width) width = child.width;
            child.set({autoSize: [0,1], size:[width, 0], anchor: null, pivot: null, translation: [offset,0]});
            offset += width + this.margin;
        });
    }

}

//------------------------------------------------------------------------------------------
//-- CanvasWidget2 -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CanvasWidget2 extends Widget2 {

    constructor(options) {
        super(options);
        this.canvas = document.createElement("canvas");
        this.canvas.style.cssText = "position: fixed; left: 0; top: 0; border: 0;";
        document.body.insertBefore(this.canvas, null);
        this.position();
        this.draw();
    }

    destroy() {
        super.destroy();
        this.canvas.remove();
    }

    get cc() {
        return this.canvas.getContext('2d');
    }

    position() {
        this.canvas.style.left = this.global[0] + "px";
        this.canvas.style.top = this.global[1] + "px";
        this.canvas.style.zIndex = this.trueDepth;
    }

    draw() {
        if (this.isVisible) {
            this.canvas.style.display = 'inline';
        } else {
            this.canvas.style.display = 'none';
        }
        this.canvas.width = this.trueSize[0];
        this.canvas.height = this.trueSize[1];
        this.cc.globalAlpha = this.opacity;
        this.cc.fillStyle = canvasColor(...this.color);
        this.cc.fillRect(0, 0, this.trueSize[0], this.trueSize[1]);
    }
}

//------------------------------------------------------------------------------------------
//-- ImageWidget2 --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ImageWidget2 extends CanvasWidget2 {

    constructor(options) {
        super(options);

        this.image = new Image();
        this.image.onload = () => {
            this.draw();
            this.redraw = true;
        };
        this.image.src = this.url;
    }

    get url() { return this._url }

    urlSet(value, old) {
        if (value === old) return;
        if (this.image) this.image.src = this.url;
    }

    draw() {
        super.draw();
        if (!this.image) return;
        this.cc.drawImage(this.image, 0, 0, this.trueSize[0], this.trueSize[1]);
    }

}

//------------------------------------------------------------------------------------------
//-- TextWidget2 ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TextWidget2 extends CanvasWidget2 {

    get text() { return this._text || ""}
    get font() { return this._font || "sans-serif"}
    get point() { return this._point || 24 }
    get lineSpacing() { return this._lineSpacing || 0}
    get style() { return this._style || "normal"}
    get alignX() { return this._alignX || "center"}
    get alignY() { return this._alignY || "middle"}
    get noWrap() { return this._noWrap }
    get offset() { return this._offset || [0,0] }
    get textColor()  {return this._textColor || [0,0,0]}

    textSet(value, old) { if (value !== old) this.redraw = true; }
    fontSet(value, old) { if (value !== old) this.redraw = true; }
    pointSet(value, old) { if (value !== old) this.redraw = true; }
    lineSpacingSet(value, old) { if (value !== old) this.redraw = true; }
    styleSet(value, old) { if (value !== old) this.redraw = true; }
    alignXSet(value, old) { if (value !== old) this.redraw = true; }
    alignYSet(value, old) { if (value !== old) this.redraw = true; }
    noWrapSet(value, old) { if (value !== old) this.redraw = true; }
    offetSet(value, old) { if (!old || !v2_equals(value, old)) this.redraw = true; }
    textColorSet(value, old) { if (!old || !v3_equals(value, old)) this.redraw = true; }

    lines() {
        if (this.noWrap) return this.text.split('\n');
        const out = [];
        const spaceWidth = this.cc.measureText(' ').width;
        const words = this.text.split(' ');
        let sum = this.canvas.width+1;
        words.forEach( word => {
            const wordWidth = this.cc.measureText(word).width;
            sum += spaceWidth + wordWidth;
            if (sum > this.canvas.width) {
                out.push(word);
                sum = wordWidth;
            } else {
                out[out.length-1] += ' ' + word;
            }
        });
        return out;
    }

    letterOffset(n) {
        this.setStyle();
        const c = [...this.text];
        let offset = 0;
        n = Math.min(n, c.length);
        for (let i = 0; i < n; i++) {
            offset += this.cc.measureText(c[i]).width;
        }
        return offset / this.resolution;
    }

    get textWidth() {
        this.setStyle();
        return this.cc.measureText(this.text).width;
    }

    // selectionIndex(x) {
    //     x = x * this.resolution;
    //     this.setStyle();

    //     const c = [...this.text];
    //     let sum = 0;
    //     for (let i = 0; i < c.length; i++) {
    //         const w = this.cc.measureText(c[i]).width;
    //         if (x < sum + w/2) return i;
    //         sum += w;
    //     }
    //     return c.length;
    // }

    setStyle() {
        this.cc.textAlign = this.alignX;
        this.cc.textBaseline = this.alignY;
        this.cc.font = this.style + " " + this.point + "px " + this.font;
        this.cc.fillStyle = canvasColor(...this.textColor);
    }

    draw() {
        super.draw();

        let x = 0;
        let y = 0;
        let yOffset = 0;
        this.setStyle();

        const lineHeight = (this.point + this.lineSpacing);
        const lines = this.lines();

        if (this.alignX === "center") {
            x = this.trueSize[0] / 2;
        } else if (this.alignX === "right") {
            x = this.trueSize[0];
        }
        if (this.alignY === "middle") {
            y = this.trueSize[1] / 2;
            yOffset = lineHeight * (lines.length-1) / 2;
        } else if (this.alignY === "bottom") {
            y = this.trueSize[1];
            yOffset = lineHeight * (lines.length-1);
        }

        lines.forEach((line,i) => {
            const o = (i * lineHeight) - yOffset;
            this.cc.fillText(line, x+ this.offset[0], y+ this.offset[1] + o);
        });

    }


}

//------------------------------------------------------------------------------------------
//-- ControlWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ControlWidget2 extends Widget2 {

    get disabled() { return this._disabled}

    disabledSet(visible) { // turn on the dim overlay
        if (this.dim) this.dim.set({visible});
    }

    pointerDown(e) {
        if (!this.isVisible) return false;
        if (this.disabled) return true;
        if (this.inside(e.xy)) {
            this.pressed = true;
            this.onPress();
            return true;
        }
        return false;
    }

    pointerUp() {
        if (!this.isVisible) return;
        if (this.disabled) return;
        if (this.pressed) {
            this.pressed = false;
            if (this.hovered) {
                this.onHover();
            } else {
                this.onNormal();
            }
        }
    }

    pointerMove(e) {
        if (!this.isVisible) return;
        if (this.disabled) return;
        if (this.inside(e.xy)) {
            if (!this.pressed && !this.hovered) this.onHover();
            this.hovered = true;
        } else if (this.hovered) {
            this.hovered = false;
            if (!this.pressed) this.onNormal();
        }
    }

    onHover() {}
    onPress() {}
    onNormal() {}

}

//------------------------------------------------------------------------------------------
//-- ButtonWidget2 -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ButtonWidget2 extends ControlWidget2 {

    build() {
        this.frame = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.5,0.7,0.83]});
        this.label = new TextWidget2({ parent: this.frame, autoSize: [1,1], border: [5, 5, 5, 5], color: [0.8,0.8,0.8], text:  "Button" });
        this.dim = new CanvasWidget2({parent: this.label, autoSize: [1,1], color: [0.8,0.8,0.8], opacity: 0.5, visible: this.disabled});
    }

    pointerUp(e) {
        if (!this.isVisible) return;
        if (!this.pressed) return;
        this.pressed = false;
        if (this.inside(e.xy) ) {
            this.hovered = true;
            this.onHover();
            this.onClick();
        } else {
            this.onNormal();
        }
    }

    onHover() {
        this.frame.set({color: [0.16,0.5,0.72]});
    }

    onPress() {
        this.frame.set({color: [0.94,0.77,0.06]});
    }

    onNormal() {
        this.frame.set({color: [0.5,0.7,0.83]});
    }

    onClick() {
        this.publish(this.id, "click");
    }
}


//------------------------------------------------------------------------------------------
//-- ToggleWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ToggleWidget2 extends ButtonWidget2 {

    constructor(options) {
        super(options);
        this.onToggle();
    }

    destroy() {
        super.destroy();
        if (this.toggleSet) this.toggleSet.set.delete(this);
    }

    get isOn() { return this._isOn || false}
    get toggleSet() { return this._toggleSet }

    toggleSetSet(ts) {
        if (ts) ts.set.add(this);
    }

    isOnSet(value, old) {
        if (value === old) return;
        this.onToggle();
    }

    onToggle() {
        this.label.set({
            text: this.isOn ? "On" : "Off",
            color: this.isOn ? [0.9,0.9,0.9] : [0.8,0.8,0.8]
        });
    }

    onClick() {
        if (this.toggleSet) {
            this.toggleSet.pick(this);
        } else {
            this.set({isOn: !this.isOn});
        }
    }

}

//------------------------------------------------------------------------------------------
//-- ToggleSet2 -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ToggleSet2 extends WorldcoreView  {
    constructor() {
        super(viewRoot.model);
        this.set = new Set();
    }

    pick(on) {
        on.set({isOn: true});
        this.set.forEach(w => {
            if (w !== on) w.set({isOn: false});
        });
        this.publish(this.id, "pick",on.name);
    }

}

//------------------------------------------------------------------------------------------
//-- ImageToggleWidget2 --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ImageToggleWidget2 extends ToggleWidget2 {

    build() {
        this.frame = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.5,0.7,0.83]});
        this.label = new ImageWidget2({parent: this.frame, autoSize: [1,1], border: [2.5, 2.5, 2.5, 2.5], color: [0.6,0.6,0.6], url: this.offURL});
        this.dim = new CanvasWidget2({parent: this.label, autoSize: [1,1], color: [0.8,0.8,0.8], opacity: 0.5, visible: false});
    }

    get offURL()  {return this._offURL }
    get onURL() { return this._onURL }

    onToggle() {
        this.label.set({
            url: this.isOn ? this.onURL : this.offURL
        });
    }
}

//------------------------------------------------------------------------------------------
//-- SliderWidget2 -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SliderWidget2 extends ControlWidget2 {

    build() {
        this.bar = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.92,0.96,0.98]});
        this.knob = new CanvasWidget2({parent: this.bar, translation: this.knobTranslation, size: this.knobSize, color: [0.5,0.7,0.83] });
        this.dim = new CanvasWidget2({parent: this.bar, autoSize: [1,1], color: [0.8,0.8,0.8], opacity: 0.5, visible: this.disabled});
    }

    get isHorizontal() { return this.trueSize[0] > this.trueSize[1]}
    get knobSize() {  return this.isHorizontal ? [this.trueSize[1], this.trueSize[1]] : [this.trueSize[0], this.trueSize[0]] }
    get percent() {  return this._percent || 0}
    get step() { return this._step || 0}

    get knobTranslation() {
        const t = [0,0];
        if (this.isHorizontal) {
            t[0] = this.percent * (this.trueSize[0]-this.knobSize[0]);
        } else {
            t[1] = this.percent * (this.trueSize[1]-this.knobSize[1]);
        }
        return t;
    }

    percentSet(p) {
        p = Math.min(1,p);
        p = Math.max(0,p);
        if (this.step) p = Math.round(p * this.step) / this.step;
        this._percent = p;
        if (this.knob) this.knob.set({translation: this.knobTranslation});
        this.onPercent(this.percent);
    }

    onPress() {
        this.knob.set({color: [0.94,0.77,0.06]});
    }

    onNormal() {
        this.knob.set({color: [0.5,0.7,0.83]});
    }

    onHover() {
        this.knob.set({color: [0.16,0.5,0.72]});
    }

    pointerDown(e) {
        if (!this.isVisible) return false;
        if (this.disabled) return true;
        if (this.inside(e.xy)) {
            this.pressed = true;
            let percent = 0;
            if (this.isHorizontal) {
                percent = (e.xy[0] - this.global[0]- this.knobSize[0]/2) / (this.trueSize[0]-this.knobSize[0]);
            } else {
                percent = (e.xy[1] - this.global[1]- this.knobSize[1]/2) / (this.trueSize[1]-this.knobSize[1]);
            }
            this.set({percent});
            this.onPress();
            return true;
        }
        return false;
    }

    pointerMove(e) {
        if (!this.isVisible) return;
        if (this.disabled) return;
        if (this.pressed) {
            let percent = 0;
            if (this.isHorizontal) {
                percent = (e.xy[0] - this.global[0]- this.knobSize[0]/2) / (this.trueSize[0]-this.knobSize[0]);
            } else {
                percent = (e.xy[1] - this.global[1]- this.knobSize[1]/2) / (this.trueSize[1]-this.knobSize[1]);
            }
            this.set({percent});
        }

        if (this.inside(e.xy)) {
            if (!this.pressed && !this.hovered) {
                this.hovered = true;
                this.onHover();
            }
        } else if (this.hovered) {
            this.hovered = false;
            if (!this.pressed) this.onNormal();
        }
    }

    onPercent(p) {
        this.publish(this.id, "percent", p);
    }

}

//------------------------------------------------------------------------------------------
//-- JoyStickWidget2 -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class JoyStickWidget2 extends ControlWidget2 {

    build() {
        this.background = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.92,0.96,0.98]});
        this.gate = new Widget2({parent: this.background, autoSize: [1,1], border:[this.knobSize/2, this.knobSize/2, this.knobSize/2,this.knobSize/2]});
        this.knob = new CanvasWidget2({parent: this.gate, anchor:[0.5, 0.5], pivot: [0.5,0.5], size: [this.knobSize,this.knobSize], color: [0.5,0.7,0.83] });
        this.dim = new CanvasWidget2({parent: this.gate, autoSize: [1,1], color: [0.8,0.8,0.8], opacity: 0.5, visible: this.disabled});
    }

    get deadRadius() { return this._deadRadius || 0.1}
    get knobSize() { return this._knobSize || 20}

    onPress() {
        this.knob.set({color: [0.94,0.77,0.06]});
    }

    onNormal() {
        this.knob.set({color: [0.5,0.7,0.83]});
    }

    onHover() {
        this.knob.set({color: [0.16,0.5,0.72]});
    }

    pointerDown(e) {
        if (!this.isVisible) return false;
        if (this.disabled) return true;
        if (this.inside(e.xy)) {
            this.pressed = true;
            const x = Math.min(1, Math.max(0,(0.5 + e.xy[0] - this.global[0]) / this.trueSize[0]));
            const y = Math.min(1, Math.max(0,(0.5 + e.xy[1] - this.global[1]) / this.trueSize[1]));
            let xy = [x,y];

            const v = v2_sub(xy,[0.5,0.5]);
            const m = v2_magnitude(v);

            if (m > 0.5) {
                const n = v2_normalize(v);
                const s = v2_scale(n, 0.5);
                xy = v2_add(s,[0.5,0.5]);
            }

            this.knob.set({anchor: xy });
            this.change(xy);
            this.onPress();
            return true;
        }
        return false;
    }

    pointerMove(e) {
        if (this.pressed) {
            const x = Math.min(1, Math.max(0,(0.5 + e.xy[0] - this.global[0]) / this.trueSize[0]));
            const y = Math.min(1, Math.max(0,(0.5 + e.xy[1] - this.global[1]) / this.trueSize[1]));
            let xy = [x,y];

            const v = v2_sub(xy,[0.5,0.5]);
            const m = v2_magnitude(v);

            if (m > 0.5) {
                const n = v2_normalize(v);
                const s = v2_scale(n, 0.5);
                xy = v2_add(s,[0.5,0.5]);
            }

            this.knob.set({anchor: xy });
            this.change(xy);
        }

        if (this.inside(e.xy)) {
            if (!this.pressed && !this.hovered) {
                this.hovered = true;
                this.onHover();
            }
        } else if (this.hovered) {
            this.hovered = false;
            if (!this.pressed) this.onNormal();
        }

    }

    pointerUp() {
        if (this.pressed) {
            this.pressed = false;
            this.knob.set({anchor: [0.5,0.5]});
            this.change([0.5,0.5]);
        }

    }

    change(xy) {
        let v = v2_scale(v2_sub(xy,[0.5,0.5]),2);
        const m = v2_magnitude(v);
        if ( m < this.deadRadius) v = [0,0];
        this.publish(this.id, "xy", v);
        this.onChange(v);
    }

    onChange(xy) {
        this.publish(this.id, "xy", xy);
    }

}

//------------------------------------------------------------------------------------------
//-- CloseBoxWidget2 -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class CloseBoxWidget2 extends ControlWidget2 {

    build() {
            this.box = new CanvasWidget2({ parent: this, autoSize: [1,1], color: [1,1,1]});
    }

    pointerUp(e) {
        if (!this.isVisible) return;
        if (!this.pressed) return;
        this.pressed = false;
        if (this.inside(e.xy) ) {
            this.onNormal();
            this.onClick();
        }
    }

    pointerMove(e) {
        if (!this.isVisible) return;
        if (this.disabled) return;
        if (this.inside(e.xy)) {
            if (!this.pressed && !this.hovered) this.onHover();
            this.hovered = true;
        } else if (this.pressed || this.hovered)  {
            this.hovered = false;
            this.pressed = false;
            this.onNormal();
        }
    }

    onHover() {
        this.box.set({color: [1,0.5,0.5]});
    }

    onPress() {
        this.box.set({color: [1,0,0]});
    }

    onNormal() {
        this.box.set({color: [1,1,1]});
    }

    onClick() {
        console.log("close");
    }
}


//------------------------------------------------------------------------------------------
//-- DragWidget2 -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class DragWidget2 extends ControlWidget2 {

    get target() { return this._target }

    build() {
        this.handle = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.5,0.7,0.83]});
        this.close = new CloseBoxWidget2({parent: this.handle, size:[8,8], anchor: [1,0.5], pivot: [1,0.5], translation: [-5, 0]});
        this.close.onClick = () => this.target.destroy();
    }

    pointerDown(e) {
        if (this.close.pointerDown(e)) return true;
        if (this.inside(e.xy)) {
            this.pressed = true;
            if (this.target) this.grab = v2_sub(this.target.translation, e.xy);
            return true;
        }
        return false;
    }

    pointerUp(e) {
        if (this.pressed) {
            this.pressed = false;
            if (this.target) this.target.set({translation: v2_add(e.xy, this.grab)});
        }
        this.close.pointerUp(e);
    }

    pointerMove(e) {
        if (this.pressed && !this.close.pressed) {
            if (this.target) this.target.set({translation: v2_add(e.xy, this.grab)});
        }
        this.close.pointerMove(e);
    }
}

//------------------------------------------------------------------------------------------
//-- WindowWidget2 -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WindowWidget2 extends Widget2 {

    build() {
        const hud = this.service("HUD");

        const depth = hud.topWindow+10;
        this.set({depth});
        hud.topWindow = depth;
        this.layout = new VerticalWidget2({parent: this, autoSize: [1,1]});
        this.drag = new DragWidget2({parent: this.layout, target: this,height:15, color: [0.5,0.5,0.5]});
        this.content = new CanvasWidget2({parent: this.layout, color:[0,1,0], opacity: 0.5});
    }

}

//------------------------------------------------------------------------------------------
//-- MenuWidget2 ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MenuWidget2 extends ControlWidget2 {

    buildDefault() {
        this.background = new CanvasWidget2({parent: this, autoSize: [1,0], color: [1,1,1],});
        this.layout = new VerticalWidget2({parent: this.background, autoSize: [1,1]});
        this.buildEntries();
    }

    get list() { return this._list || []; }

    listSet(list) {
        this._list = list;
        this.buildEntries();
    }

    // buildDefault() {
    //     this.background = new CanvasWidget2({parent: this, autoSize: [1,0], color: [1,1,1],});
    //     this.layout = new VerticalWidget2({parent: this.background, autoSize: [1,1]});
    //     this.buildEntries();
    // }

    buildEntries() {
        if (!this.background) return;
        this.layout.destroyChildren();
        const y = this.list.length * 20;
        this.background.set({size: [0,y]});
        this.list.forEach(entry =>{
            new TextWidget2({parent: this.layout, text: entry, color: [1,1,1], noWrap: true, offset: [10,0], alignX: "left", point: 12, font: "sans-serif"})
        });
    }

    pointerDown(e) {
        if(this.background.inside(e.xy)) {
            this.pressed = true;
            const w = this.findEntry(e.xy);
            this.unhiliteAll();
            this.hiliteEntry(w);
            return true;
        }
    }

    pointerMove(e) {
        if (this.pressed) {
            this.unhiliteAll();
            const w = this.findEntry(e.xy);
            if (w) this.hiliteEntry(w);
        }
    }

    pointerUp(e) {
        if (this.pressed) {
            this.pressed = false;
            this.unhiliteAll();
            const w = this.findEntry(e.xy);
            if (w) this.pick(w);
        }
    }

    findEntry(xy) {
        let out = null;
        this.layout.children.forEach( child => {
            if (child.inside(xy)){
                out = child;
                return;
            }
        } )
        return out;
    }

    hiliteEntry(entry) {
        entry.set({color:[0.4,0.4,0.4]});
    }

    unhiliteAll() {
        this.layout.children.forEach( child => child.set({color:[1,1,1]}));
    }

    pick(w) {
        this.publish(this.id, "pick", w.text);
        this.onPick(w)
    }

    onPick(w) {}
}




