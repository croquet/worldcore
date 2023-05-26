import { WorldcoreView, viewRoot} from "./Root";
import { v2_add } from "./Vector";

//------------------------------------------------------------------------------------------
//-- Widget -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget extends WorldcoreView {

    constructor(options) {
        super(viewRoot.model);
        this._opacity = 1;
        this.set(options);
        this.build();
    }

    build() {} // Use for created child widgets

    destroy() {
        super.destroy();
        this.destroyChildren();
        if (this.parent) this.parent.removeChild(this);
    }

    get name() { return this._name }
    get parent() { return this._parent }
    get size() { return this._size || [0,0] }
    get autoSize() { return this._autoSize || [0,0]}
    get border() { return this._border || [0,0,0,0]}
    get height() { return this._height || 0}
    get width() { return this._width || 0}
    get translation() { return this._translation || [0,0] }
    get anchor() { return this._anchor || [0,0]}
    get pivot() { return this._pivot || [0,0]}
    get color() { return this._color || [0,0,0]}
    get opacity() {return this._opacity}
    get visible() { return this._visible === undefined || this._visible }
    get depth() {return this._depth || 0}
    get isVisible() { // includes parent visibility
        if (this.parent) return this.parent.isVisible && this.visible;
        return this.visible;
    }

    show() { this.set({visible: true})}
    hide() { this.set({visible: false})}

    get trueDepth() {
        if (this.parent) return this.parent.trueDepth + this.depth;
        return this.depth;
    }

    get trueSize() {
        const out = [...this.size];
        if (this.parent) {
            if (this.autoSize[0]) { out[0] = this.parent.trueSize[0] * this.autoSize[0] }
            if (this.autoSize[1]) { out[1] = this.parent.trueSize[1] * this.autoSize[1] }
        }

        out[0] -= (this.border[0] + this.border[2]);
        out[1] -= (this.border[1] + this.border[3]);
        return out;
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
            return v2_add(this.parent.global, this.local);
        }
        return this.local;
    }

    set(options) {
        options = options || {};
        const sorted = Object.entries(options).sort((a,b) => { return b[0] < a[0] ? 1 : -1 } );
        for (const option of sorted) {
            const name = option[0];
            const value = option[1];
            const ul = "_" + name;
            const nameSet = name+'Set';
            const old = this[ul];
            this[ul] = value;
            if (this[nameSet]) this[nameSet](value,old);
        }
    }

    parentSet(value, old) {
        if (old) old.removeChild(this);
        if (value) value.addChild(this);
    }

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
    }

    destroyChildren() {
        new Set(this.children).forEach(child => child.destroy());
    }

    get sortedChildren() {
        if (!this.children) return [];
        const out = Array.from(this.children);
        out.sort((a,b) => b.depth-a.depth);
        return out;
    }

}

