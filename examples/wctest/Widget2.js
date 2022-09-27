import { WorldcoreView, viewRoot, ViewService, v2_add, v3_add, v2_magnitude, v2_scale, v2_normalize} from "@croquet/worldcore-kernel";
// import { Widget } from "@croquet/worldcore-widget";

//------------------------------------------------------------------------------------------
//-- HelperFunctions -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function RelativeTranslation(t, anchor, pivot, size, parentSize) {
    const aX = -0.5*parentSize[0] + parentSize[0]*anchor[0];
    const aY = -0.5*parentSize[1] + parentSize[1]*anchor[1];
    const pX = 0.5*size[0] - size[0]*pivot[0];
    const pY = 0.5*size[1] - size[1]*pivot[1];
    return [t[0]+aX+pX, t[1]+aY+pY, t[2]];
}

function canvasColor(r, g, b) {
    return 'rgb(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) +')';
}

function vEquals(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const al = a.length;
    const bl = b.length;
    if (al !== bl) return false;
    for (let i = 0; i < al; i++) if (a[i] !== b[i]) return false;
    return true;
}

//------------------------------------------------------------------------------------------
//-- WidgetManager2 -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetManager2 extends ViewService {
    constructor(name) {
        super(name || "WidgetManager2");
        const x = window.innerWidth;
        const y = window.innerHeight;
        this.root = new Widget2({size: [x,y]});

        this.subscribe("input", "pointerDown", this.pointerDown);
        this.subscribe("input", "pointerUp", this.pointerUp);
        this.subscribe("input", "pointerMove", this.pointerMove);
        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyRepeat", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);

    }

    update(time,delta) {
        this.root.update(time,delta);
    }

    pointerDown(e) {
        this.root.pointerDown(e);
    }

    pointerUp(e) {
        this.root.pointerUp(e);
    }

    pointerMove(e) {
        this.root.pointerMove(e);
    }

    keyDown(e) {
    }

    keyUp(e) {
    }

}

//------------------------------------------------------------------------------------------
//-- Widget2 -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget2 extends WorldcoreView {

    constructor(options) {
        super(viewRoot.model);
        this.set(options);
    }

    destroy() {
        super.destroy();
        new Set(this.children).forEach(child => child.destroy());
        if (this.parent) this.parent.removeChild(this);
    }

    get name() { return this._name; }
    get parent() { return this._parent }
    get size() { return this._size || [0,0] }
    get autoSize() { return this._autoSize || [0,0]}
    get border() { return this._border || [0,0,0,0]}
    get height() { return this._height || 0}
    get width() { return this._width || 0}
    get translation() { return this._translation || [0,0] }
    get zIndex() { return this._zIndex || 0}
    get anchor() { return this._anchor || [0,0]}
    get pivot() { return this._pivot || [0,0]}
    get color() {return this._color || [0,1,1]}

    get visible() {
        const v = this._visible === undefined || this._visible;
        if (v && this.parent) return this.parent.visible;
        return v;
    }

    get local() {
        let parentSize = [0,0];
        if (this.parent) parentSize = this.parent.trueSize;
        const aX = parentSize[0]*this.anchor[0];
        const aY = parentSize[1]*this.anchor[1];
        const pX = this.trueSize[0]*this.pivot[0];
        const pY = this.trueSize[1]*this.pivot[1];

        const x = this.translation[0];
        const y = this.translation[1];

        const bx = this.border[0];
        const by = this.border[1];

        return [bx+x+aX-pX, by+y+aY-pY];
    }

    get global() {
        if (this.parent) {
            return v3_add(this.parent.global, this.local);
        }
        return this.local;
    }

    get trueSize() {
        const out = [...this.size]
        if (this.parent) {
            if (this.autoSize[0]) { out[0] = this.parent.trueSize[0] * this.autoSize[0]; }
            if (this.autoSize[1]) { out[1] = this.parent.trueSize[1] * this.autoSize[1]; }
        }

        out[0] -= (this.border[0] + this.border[2]);
        out[1] -= (this.border[1] + this.border[3]);
        return out;
    }

    get trueZIndex() {
        if (this.parent && this.parent.trueZIndex ) return this.parent.trueZIndex + 1;
        return this.zIndex;
    }

    set(options) {
        options = options || {};
        const sorted = Object.entries(options).sort((a,b) => { return b[0] < a[0] ? 1 : -1 } );
        for (const option of sorted) {
            const n = option[0];
            const v = option[1];
            if (this[n+'Set']) {
                this[n+'Set'](v)
            } else {
                this['_'+ n] = v;
            }
        }
    }

    parentSet(p) {
        if (this.parent === p) return;
        if (this.parent) this.parent.removeChild(this);
        this._parent = p;
        if (this.parent) this.parent.addChild(this);
    }

    colorSet(s) {
        if (vEquals(s, this.color)) return;
        this._color = s;
        this.redraw = true;
    }

    visibleSet(b) {
        if (this.visible === b) return;
        this._visible = b;
        this.redrawChildren();
    }

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
    }

    redrawChildren() {
        this.redraw  = true;
        if (this.children) this.children.forEach( child => child.redrawChildren());
    }

    inside(xy) {
        const x = xy[0];
        const y = xy[1];
        if (x < this.global[0] || x > (this.global[0] + this.trueSize[0])) return false;
        if (y < this.global[1] || y > (this.global[1] + this.trueSize[1])) return false;
        return true;
    }

    pointerDown(e) {
        if (!this.visible) return;
        if (this.children) this.children.forEach( child => child.pointerDown(e));
    }

    pointerUp(e) {
        if (!this.visible) return;
        if (this.children) this.children.forEach( child => child.pointerUp(e));
    }

    pointerMove(e) {
        if (!this.visible) return;
        if (this.children) this.children.forEach( child => child.pointerMove(e));
    }

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

}

//------------------------------------------------------------------------------------------
//-- CanvasWidget2 -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CanvasWidget2 extends Widget2 {

    constructor(options) {
        super(options);
        this.canvas = document.createElement("canvas");
        this.canvas.style.cssText = "position: absolute; left: 0; top: 0; border: 0, z-index: 0;";
        document.body.insertBefore(this.canvas, null);
        this.position();
        this.draw();
    }

    destroy() {
        super.destroy();
        this.element.remove();
    }

    get cc() {
        return this.canvas.getContext('2d');
    }

    translationSet(t) {
        if (vEquals(t, this.translation)) return;
        this._translation = t;
        this.reposition = true;
    }

    anchorSet(a) {
        if (vEquals(a, this.anchor)) return;
        this._anchor = a;
        this.reposition = true;
    }

    pivotSet(p) {
        if (vEquals(p, this.pivot)) return;
        this._pivot = p;
        this.reposition = true;
    }

    sizeSet(s) {
        if (vEquals(s, this.size)) return;
        this._size = s;
        this.redraw = true;
    }

    zIndexSet(z) {
        if (this.zIndex === z) return;
        this._zIndex = z;
        this.reposition = true;
    }

    parentSet(p) {
        super.parentSet(p)
        this.reposition = true;
        this.redraw = true;
    }

    position() {
        this.canvas.style.left = this.global[0] + "px";
        this.canvas.style.top = this.global[1] + "px";
        this.canvas.style.zIndex = this.trueZIndex;
    }

    draw() {
        if (this.visible) {
            this.canvas.style.display = 'inline';
        } else {
            this.canvas.style.display = 'none';
        }
        this.canvas.width = this.trueSize[0];
        this.canvas.height = this.trueSize[1];
        this.cc.fillStyle = canvasColor(...this.color);
        this.cc.fillRect(0, 0, this.trueSize[0], this.trueSize[1]);
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
        let offset = 0
        this.children.forEach(child => {
            let height = auto;
            if (child.height) height = child.height;
            child.set({autoSize: [1,0], size:[0, height], anchor: null, pivot: null, translation: [0,offset]});
            offset += height + this.margin;
        });
    }

}

//------------------------------------------------------------------------------------------
//-- VerticalWidget2------------------------------------------------------------------------
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
        let offset = 0
        this.children.forEach(child => {
            let width = auto;
            if (child.width) width = child.width;
            child.set({autoSize: [0,1], size:[width, 0], anchor: null, pivot: null, translation: [offset,0]});
            offset += width + this.margin;
        });
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
            this.redraw= true;
        }
        this.image.src = this.url;
    }

    get url() { return this._url; }

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
    get offset() { return this._offset || [0,0] }
    get noWrap() { return this._noWrap }
    get textColor()  {return this._textColor || [0,0,0]}

    textSet(t) {
        if (t === this.text) return;
        this._text = t;
        this.redraw = true;
    }

    lines() {
        if (this.noWrap) return this.text.split('\n');
        const out = [];
        const spaceWidth = this.cc.measureText(' ').width;
        const words = this.text.split(' ');
        let sum = this.canvas.width+1;
        words.forEach( word => {
            const wordWidth = this.cc.measureText(word).width
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

        this.setStyle();

        lines.forEach((line,i) => {
            const o = (i * lineHeight) - yOffset;
            this.cc.fillText(line, x, y + o);
        });

    }


}

//------------------------------------------------------------------------------------------
//-- ControlWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export function ParentControl(w) {
    do {
        if (w instanceof ControlWidget3) return w;
        w = w.parent
    } while(w)
    return null;
}

export class ControlWidget2 extends CanvasWidget2 {

    constructor(options) {
        super(options);
    }

    pointerDown(e) {
        if(this.inside(e.xy)) {
            this.pressed = true;
            this.onPress();
        }

    }

    pointerUp(e) {
        if(this.pressed) {
            this.pressed = false;
            this.onNormal();
        }
    }

    pointerMove(e) {
        if(this.inside(e.xy)) {
            this.hovered = true;
            if (this.pressed) {
                this.onPress();
            } else {
                this.onHover();
            }
        } else {
            this.hovered = false;
            this.onNormal();
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

    constructor(options) {
        super(options);
        this.frame = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0,0,1]});
        this.label = new TextWidget2({ parent: this.frame, autoSize: [1,1], border: [5, 5, 5, 5], color: [0.8,0.8,0.8], text:  "Button" });
    }

    pointerUp(e) {
        if(this.pressed && this.inside(e.xy) ) {
            this.onClick();
        }
       super.pointerUp();
    }

    onHover() {
        this.frame.set({color: [0,1,1]});
    }

    onPress() {
        this.frame.set({color: [1,0,0]});
    }

    onNormal() {
        this.frame.set({color: [0,0,1]});
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
        this._toggleSet = ts;
        if (ts) ts.set.add(this);
    }

    isOnSet(b) {
        this._isOn = b;
        this.onToggle();
    }

    onToggle() {
        this.isOn ? this.label.set({text: "On"}) : this.label.set({text: "Off"});
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

export class ToggleSet2  {
    constructor() {
        this.set = new Set();
    }

    pick(on) {
        on.set({isOn: true});
        this.set.forEach(w => {
            if (w !== on) w.set({isOn: false});
        });
    }

}

//------------------------------------------------------------------------------------------
//-- SliderWidget2 -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SliderWidget2 extends ControlWidget2 {

    constructor(options) {
        super(options);

        this.bar = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.8,0.8,0.8]});
        this.knob = new CanvasWidget2({parent: this.bar, translation: this.knobTranslation, size: this.knobSize, color: [0.6,0.6,0.6] });
    }

    get isHorizontal() { return this.trueSize[0] > this.trueSize[1]; }
    get knobSize() {  return this.isHorizontal ? [this.trueSize[1], this.trueSize[1]] : [this.trueSize[0], this.trueSize[0]] }
    get percent() {  return this._percent || 0; }
    get step() { return this._step || 0; }

    get knobTranslation() {
        const t = [0,0]
        if (this.isHorizontal) {
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
        this.knob.set({color: [0.4, 0.4, 0.4]});
    }

    onNormal() {
        this.knob.set({color: [0.6,0.6,0.6]});
    }

    onHover() {
        this.knob.set({color: [0.5, 0.5, 0.5]});
    }

    pointerDown(e) {
        super.pointerDown(e);
        if(this.inside(e.xy)) {
            let p = 0;
            if (this.isHorizontal) {
                p = (e.xy[0] - this.global[0]- this.knobSize[0]/2) / (this.trueSize[0]-this.knobSize[0]);
            } else {
                p = (e.xy[1] - this.global[1]- this.knobSize[1]/2) / (this.trueSize[1]-this.knobSize[1]);
            }
            this.set({percent: p});
        }
    }

    pointerMove(e) {
        super.pointerMove(e);
        if(this.pressed) {
            let p = 0;
            if (this.isHorizontal) {
                p = (e.xy[0] - this.global[0]- this.knobSize[0]/2) / (this.trueSize[0]-this.knobSize[0]);
            } else {
                p = (e.xy[1] - this.global[1]- this.knobSize[1]/2) / (this.trueSize[1]-this.knobSize[1]);
            }
            this.set({percent: p});
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

    constructor(options) {
        super(options);

        this.gate = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.8,0.8,0.8]});
        this.knob = new CanvasWidget2({parent: this.gate, anchor:[0.5, 0.5], pivot: [0.5,0.5], size: [20,20], color: [0.6,0.6,0.6] });
    }

    get deadRadius() { return this._deadRadius || 0.1}

    onPress() {
        this.knob.set({color: [0.4, 0.4, 0.4]});
    }

    onNormal() {
        this.knob.set({color: [0.6,0.6,0.6]});
    }

    onHover() {
        this.knob.set({color: [0.5, 0.5, 0.5]});
    }

    pointerDown(e) {
        super.pointerDown(e);
        if(this.inside(e.xy)) {
            const x = (e.xy[0] - this.global[0]) / this.trueSize[0];
            const y = (e.xy[1] - this.global[1]) / this.trueSize[1];
            const xy = [x,y]
            this.knob.set({anchor: xy });
        }
    }

    pointerMove(e) {
        super.pointerMove(e);
        if(this.pressed) {
            const x = 0.5 + (e.xy[0] - this.global[0]) / this.trueSize[0];
            const y = 0.5 + (e.xy[1] - this.global[1]) / this.trueSize[1];
            let xy = [x,y]

            const n = v2_normalize(xy);
            const clamp = Math.max(0, v2_magnitude(xy)-this.deadRadius) / (1-this.deadRadius);
            xy = v2_scale(n,clamp);
            this.knob.set({anchor: n });
        }
    }

    pointerUp(e) {
        super.pointerUp(e);
        this.knob.set({anchor: [0.5,0.5] });
    }

}

    // get knobTranslation() {
    //     return t;
    // }

    // percentSet(p) {
    //     p = Math.min(1,p);
    //     p = Math.max(0,p);
    //     if (this.step) p = Math.round(p * this.step) / this.step;
    //     this._percent = p;
    //     if (this.knob) this.knob.set({translation: this.knobTranslation});
    //     this.onPercent(this.percent);
    // }

    // onPress() {
    //     this.knob.set({color: [0.4, 0.4, 0.4]});
    // }

    // onNormal() {
    //     this.knob.set({color: [0.6,0.6,0.6]});
    // }

    // onHover() {
    //     this.knob.set({color: [0.5, 0.5, 0.5]});
    // }

    // pointerDown(e) {
    //     super.pointerDown(e);
    //     if(this.inside(e.xy)) {
    //         let p = 0;
    //         if (this.isHorizontal) {
    //             p = (e.xy[0] - this.global[0]- this.knobSize[0]/2) / (this.trueSize[0]-this.knobSize[0]);
    //         } else {
    //             p = (e.xy[1] - this.global[1]- this.knobSize[1]/2) / (this.trueSize[1]-this.knobSize[1]);
    //         }
    //         this.set({percent: p});
    //     }
    // }

    // pointerMove(e) {
    //     super.pointerMove(e);
    //     if(this.pressed) {
    //         let p = 0;
    //         if (this.isHorizontal) {
    //             p = (e.xy[0] - this.global[0]- this.knobSize[0]/2) / (this.trueSize[0]-this.knobSize[0]);
    //         } else {
    //             p = (e.xy[1] - this.global[1]- this.knobSize[1]/2) / (this.trueSize[1]-this.knobSize[1]);
    //         }
    //         this.set({percent: p});
    //     }
    // }

    // onPercent(p) {
    //     this.publish(this.id, "percent", p);
    // }






