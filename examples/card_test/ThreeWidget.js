// THREE.js widget system.

import { ViewService, GetViewService, THREE, m4_identity, q_identity, m4_scaleRotationTranslation, m4_multiply } from "@croquet/worldcore";

let wm;

//------------------------------------------------------------------------------------------
//-- WidgetManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetManager extends ViewService {
    constructor(name) {
        super(name || "WidgetManager");
        wm = this;
        console.log("Widget Manager constructor")
        this.widgets = new Set();
    }

    add(widget) {
        this.widgets.add(widget);
        this._colliders = null;
    }

    delete(widget) {
        this.widgets.delete(widget);
        this._colliders = null;
    }

    update(time,delta) {
        this.widgets.forEach(widget => {
            { if (!widget.parent) widget.update(time, delta); };
        })
    }

    clearColliders() {
        this._colliders = null;
    }

    get colliders() {
        if(!this._colliders) {
            this._colliders = [];
            this.widgets.forEach(widget => {
                if(widget.collider) this._colliders.push(widget.collider);
            })
        }
        return this._colliders;
    }

}

//------------------------------------------------------------------------------------------
//-- PM_WidgetPointer ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_WidgetPointer = superclass => class extends superclass {

    constructor(...args) {
        super(...args)
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerMove", this.doPointerMove);
    }

    doPointerDown(e) {
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const hits = this.widgetRaycast(x,y);

        hits.forEach(hit => {
            console.log(hit.object.widget.name);
            console.log(hit.object.widget.depth);
        })
        if (hits.length === 0) console.log("no hit!");

    }

    doPointerMove(e) {
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const hits = this.widgetRaycast(x,y);
        let w = null;
        if (hits.length > 0) w = hits[0].object.widget;
        if (this.hovered !== w) {
            if (this.hovered) this.hovered.onUnhover();
            this.hovered = w;
            if (this.hovered) this.hovered.onHover();
        }

    }

    widgetRaycast(x,y) {
        const render = GetViewService("ThreeRenderManager");
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({x: x, y: y}, render.camera);

        let hits = raycaster.intersectObjects( wm.colliders );
        if (hits.length > 1) {
            const topRoot = hits[0].object.widget.root;
            hits = hits.filter(hit => hit.object.widget.root === topRoot).sort( (a,b) => {return b.object.widget.depth - a.object.widget.depth});
        }
        return hits;
    }



}

//------------------------------------------------------------------------------------------
//-- PM_Widget3 ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Widget3 = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.rootWidget = new Widget3({local: this.global});

        this.listen("viewGlobalChanged", this.moveRoot);
    }

    moveRoot() {
        this.rootWidget.local = this.global;
    }

}

//------------------------------------------------------------------------------------------
//-- HelperFunctions -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function RelativeTranslation(t, anchor, pivot, border, size, parentSize) {
    const aX = -0.5*parentSize[0] + parentSize[0] * anchor[0];
    const aY = -0.5*parentSize[1] + parentSize[1] * anchor[1];
    const pX = -0.5*size[0] + size[0] * pivot[0];
    const pY = -0.5*size[1] + size[1] * pivot[1];
    return [t[0]+aX-pX, t[1]+aY-pY, t[2]];
}

//------------------------------------------------------------------------------------------
//-- Widget3 -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget3 {

    constructor(options) {
        this.set(options);
        wm.add(this);
    }

    destroy() {
        new Set(this.children).forEach(child => child.destroy());
        this.parent = null;
        wm.delete(this);
    }

    get name() {return this._name; }
    set name(n) { this._name = n}

    get parent() { return this._parent; }
    set parent(p) {
        if (this.parent) this.parent.removeChild(this);
        this._parent = p;
        if (this.parent) this.parent.addChild(this);
        this.onParentChanged();
        this.globalChanged();
    }
    onParentChanged() {}

    get depth(){ if (this.parent) {return this.parent.depth+1} else {return 0} }
    get root() { if (this.parent) {return this.parent.root} else {return this} }

    get scale() { return this._scale || [1,1,1] }
    set scale(v) { this._scale = v; this.localChanged() }
    get rotation() { return this._rotation || q_identity() }
    set rotation(q) { this._rotation = q; this.localChanged() }
    get translation() { return this._translation || [0,0,0] }
    set translation(v) { this._translation = v; this.localChanged() }

    localChanged() { this.local = null; this.globalChanged(); }
    globalChanged() {
        this._global = null;
        if (this.children) this.children.forEach(child => child.globalChanged());
    }

    get local() {
        if (this._local) return this._local;
        let parentSize = [0,0];
        if (this.parent) parentSize = this.parent.trueSize;
        const relativeTranslation = RelativeTranslation(this.translation, this.anchor, this.pivot, this.border, this.trueSize, parentSize);
        this._local = m4_scaleRotationTranslation(this.scale, this.rotation, relativeTranslation);
        return this._local;
    }

    set local(m) {
        this._local = m;
        this.globalChanged();
    }

    get global() {
        if (this._global) return this._global;
        if (this.parent) {
            this._global = m4_multiply(this.local, this.parent.global);
        } else {
            this._global = this.local;
        }
        return this._global;
    }
    get visible() {
        const v = this._visible === undefined || this._visible;
        if (v && this.parent) return this.parent.visible;
        return v;
    }
    set visible(b) {this._visible = b; this.refreshVisibility()}

    refreshVisibility() {
        wm.clearColliders();
        if (this.children) this.children.forEach(child => child.refreshVisibility());
    }

    get size() { return this._size || [1,1];}
    set size(v) { this._size = v; }
    get anchor() { return this._anchor || [0.5,0.5];}
    set anchor(v) { this._anchor = v; }
    get pivot() { return this._pivot || [0.5,0.5];}
    set pivot(v) { this._pivot = v; }
    get border() { return this._border || [0,0,0,0]; }
    set border(v) { this._border = v; }
    get autoSize() { return this._autoSize || [0,0];}
    set autoSize(v) { this._autoSize = v; }

    get trueSize() {
        const out = [...this.size]
        if (this.parent) {
            if (this.autoSize[0]) { out[0] = this.parent.trueSize[0] * this.autoSize[0]; }
            if (this.autoSize[1]) { out[1] = this.parent.size[1] * this.autoSize[1]; }
        }
        out[0] -= (this.border[0] + this.border[2]);
        out[1] -= (this.border[1] + this.border[3]);
        return out;
    }


    set(options) {
        options = options || {};
        const sorted = Object.entries(options).sort((a,b) => { return b[0] < a[0] ? 1 : -1 } );
        for (const option of sorted) {
            const n = option[0]
            const v = option[1];
            this[n] = v;
        }
    }

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
    }

    update(time,delta) {
        if (this.children) this.children.forEach(child => child.update(time,delta));
    }

}

//------------------------------------------------------------------------------------------
//-- VisibleWidget --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class VisibleWidget3 extends Widget3  {

    constructor(options) {
        super(options);
        const render = GetViewService("ThreeRenderManager");

        this.buildGeometry();
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(...this.color)});
        this.material.polygonOffset = true;
        this.material.polygonOffsetFactor = -this.depth;
        this.material.polygonOffsetUnits = -this.depth;

        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.visible = this.visible;
        this.mesh.widget = this;
        this.mesh.matrixAutoUpdate = false;
        this.mesh.matrix.fromArray(this.global);

        render.scene.add(this.mesh);

    }

    refreshVisibility() {
        super.refreshVisibility();
        if (this.mesh) this.mesh.visible = this.visible;
    }


    //  Anything that affect true size needs to rebuild geometry.  Also some things need to invalidate local

    get size() { return super.size}
    set size(v) {super.size = v; this.buildGeometry()}

    buildGeometry() {
        if (this.geometry) this.geometry.dispose();
        this.geometry = new THREE.PlaneGeometry(...this.trueSize, 1);
        if (this.mesh) this.mesh.geometry = this.geometry;
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
        if (this.material.map) this.material.map.dispose();
    }

    get color() { return this._color || [1,1,1];}
    set color(v) { this._color = v; if (this.material) this.material.color = new THREE.Color(...this.color); }

    onParentChanged() {
        if (!this.material) return;
        this.material.polygonOffsetFactor = -this.depth;
        this.material.polygonOffsetUnits = -this.depth;
    }

    globalChanged() {
        super.globalChanged();
        this.isDirty = true;
    }

    update(time,delta) {
        super.update(time,delta)
        if (this.isDirty) {
            this.mesh.matrix.fromArray(this.global);
            this.isDirty = false;
        }

    }

}

//------------------------------------------------------------------------------------------
//-- ImageWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ImageWidget3 extends VisibleWidget3 {

    constructor(options) {
        super(options);

        this.image = new Image();
        this.image.onload = () => {
            if (this.material.map) this.material.map.dispose();
            this.material.map = new THREE.CanvasTexture(this.image);
            this.material.needsUpdate = true;
        }
        this.image.src = this.url;
    }

    get url() { return this._url }
    set url(url) {
        this._url = url;
        if (this.image && this.url) this.image.src = this.url;
    }

}

//------------------------------------------------------------------------------------------
//-- CanvasWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function canvasColor(r, g, b) {
    return 'rgb(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) +')';
}

export class CanvasWidget3 extends VisibleWidget3 {

    constructor(options) {
        super(options);
        this.buildCanvas();
    }

    get size() { return super.size}
    set size(v) {super.size = v; this.buildCanvas()}
    get resolution() { return this._resolution || 300;}
    set resolution(v) { this._resolution = v; this.buildCanvas(); }

    buildCanvas() {
        if(!this.material) return;
        if (this.material.map) this.material.map.dispose();
        const canvas = document.createElement("canvas");
        canvas.width = this.size[0] * this.resolution;
        canvas.height = this.size[1] * this.resolution;
        this.material.map = new THREE.CanvasTexture(canvas);
        this.draw(canvas)
    }

    update(time,delta) {
        super.update(time,delta)
        if (this.needsRedraw) {
            this.buildCanvas();
            this.needsRedraw = false;
        } ;
    }

    redraw() {this.needsRedraw = true;}

    draw(canvas) {};

}

//------------------------------------------------------------------------------------------
//-- TextWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TextWidget3 extends CanvasWidget3 {

    constructor(options) {
        super(options);
    }

    get text() { return this._text || "Text"}
    set text(s) { this._text = s; this.redraw() }
    get font() { return this._font || "sans-serif"}
    set font(s) { this._font = s; this.redraw() }
    get point() { return this._point || 24 }
    set point(n) { this._point = n; this.redraw() }
    get lineSpacing() { return this._lineSpacing || 0}
    set lineSpacing(n) { this._lineSpacing = n }
    get style() { return this._style || "normal"}
    set style(s) { this._style = s; this.redraw() }
    get alignX() { return this._alignX || "center"}
    set alignX(s) { this._alignX = s }
    get alignY() { return this._alignY || "middle"}
    set alignY(s) { this._alignY = s; this.redraw() }
    get noWrap() { return this._noWrap }
    set noWrap(b) { this._noWrap = b; this.redraw() }

    get bgColor()  {return this._bgColor || [1,1,1]}
    set bgColor(v)  { this._bgColor = v; this.redraw() }
    get fgColor()  {return this._fgColor || [0,0,0]}
    set fgColor(v)  { this._fgColor = v; this.redraw() }

    lines(canvas) {
        if (this.noWrap) return this.text.split('\n');
        const cc = canvas.getContext('2d');
        const out = [];
        const spaceWidth = cc.measureText(' ').width;
        const words = this.text.split(' ');
        let sum = canvas.width+1;
        words.forEach( word => {
            const wordWidth = cc.measureText(word).width
            sum += spaceWidth + wordWidth;
            if (sum > canvas.width) {
                out.push(word);
                sum = wordWidth;
            } else {
                out[out.length-1] += ' ' + word;
            }
        });
        return out;
    }

    draw(canvas) {
        const cc = canvas.getContext('2d');
        cc.textAlign = this.alignX;
        cc.textBaseline = this.alignY;
        cc.font = this.style + " " + this.point + "px " + this.font;

        const lineHeight = (this.point + this.lineSpacing);

        cc.fillStyle = canvasColor(...this.bgColor);
        cc.fillRect(0, 0, canvas.width, canvas.height);
        cc.fillStyle = canvasColor(...this.fgColor);

        const lines = this.lines(canvas);

        let xy = [0,0];
        let yOffset = 0;
        if (this.alignX === "center") {
            xy[0] = canvas.width / 2;
        } else if (this.alignX === "right") {
            xy[0] = canvas.width;
        }
        if (this.alignY === "middle") {
            xy[1] = canvas.height / 2;
            yOffset = lineHeight * (lines.length-1) / 2;
        } else if (this.alignY === "bottom") {
            xy[1] = canvas.height;
            yOffset = lineHeight * (lines.length-1);
        }

        lines.forEach((line,i) => {
            const o = (i * lineHeight) - yOffset;
            cc.fillText(line, xy[0], xy[1] + o);
        });
    }

}

//------------------------------------------------------------------------------------------
//-- ControlWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Visibility changes change colliders

export class ControlWidget3 extends VisibleWidget3 {

    get collider() { if (this.visible) return this.mesh }
    // get collider() { return this.mesh }

    onHover() { console.log(this.name + " hover");}
    onUnhover() { console.log(this.name + " unhover")}
}






