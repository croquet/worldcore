import { WorldcoreView, viewRoot, ViewService, v2_add, v3_add, v2_magnitude, v2_scale, v2_normalize, v2_sub} from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
//-- Widget -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget extends WorldcoreView {

    constructor(options) {
        super(viewRoot.model);
        this.set(options);
    }

    destroy() {
        super.destroy();
        new Set(this.children).forEach(child => child.destroy());
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
    get color() {return this._color || [0,0,0]}

    get depth() { if (this.parent) return this.parent.depth+1; return 0 }


    get isVisible() {
        return this._visible;
    }

    // get visible() {
    //     console.log("vvv");
    //     const v = this._visible === undefined || this._visible;
    //     console.log(v);
    //     if (this.parent) return this.parent.visible && v;
    //     return v;
    // }

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
        if (!this._children) this._children = new Set();
        this._children.add(child);
    }

    removeChild(child) {
        this.children.delete(child);
    }

}

