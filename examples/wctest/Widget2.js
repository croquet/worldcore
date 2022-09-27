import { WorldcoreView, viewRoot, ViewService, v2_add, v3_add } from "@croquet/worldcore-kernel";
import { Widget } from "@croquet/worldcore-widget";

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

//------------------------------------------------------------------------------------------
//-- WidgetManager2 -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetManager2 extends ViewService {
    constructor(name) {
        super(name || "WidgetManager2");
        this.root = new Widget2();

    }

    update(time,delta) {
        this.root.update(time,delta);
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

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
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
        this._translation = t;
        this.reposition = true;
    }

    sizeSet(s) {
        this._size = s;
        this.redraw = true;
    }

    zIndexSet(z) {
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
        if (!this.image) return;
        this.cc.drawImage(this.image, 0, 0, this.trueSize[0], this.trueSize[1]);
    }

}

//------------------------------------------------------------------------------------------
//-- TextWidget2 ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// xxx Needs clean-up

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
        if (this.alignX === "center") {
            x = this.trueSize[0] / 2;
        } else if (this.alignX === "right") {
            x = this.trueSize[0];
        }
        if (this.alignY === "middle") {
            y = this.trueSize[1] / 2;
        } else if (this.alignY === "bottom") {
            y = this.trueSize[1];
        }

        this.setStyle();

        const lineHeight = (this.point + this.lineSpacing);
        const lines = this.lines();
        console.log(lines);

        lines.forEach((line,i) => {
            const o = (i * lineHeight) - yOffset;
            this.cc.fillText(line, x, y + o);
        });

    }


}



