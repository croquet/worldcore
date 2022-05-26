// THREE.js widget system.

import { ViewService, GetViewService, THREE, m4_identity, q_identity, m4_scaleRotationTranslation, m4_multiply } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- WidgetManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetManager extends ViewService {
    constructor(name) {
        super(name || "WidgetManager");
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
        const wm = GetViewService("WidgetManager");
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
        const wm = GetViewService("WidgetManager");
        wm.add(this);
    }

    destroy() {
        new Set(this.children).forEach(child => child.destroy());
        this.parent = null;
        const wm = GetViewService("WidgetManager");
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
//-- VisibleThreeWidget --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class VisibleWidget3 extends Widget3  {

    constructor(options) {
        super(options);
        const render = GetViewService("ThreeRenderManager");

        this.geometry = new THREE.PlaneGeometry(...this.trueSize, 1);
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(...this.color)});
        this.material.polygonOffset = true;
        this.material.polygonOffsetFactor = -this.depth;
        this.material.polygonOffsetUnits = -this.depth;

        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.widget = this;
        this.mesh.matrixAutoUpdate = false;
        this.mesh.matrix.fromArray(this.global);

        render.scene.add(this.mesh);

    }

    // Need to handle resizing

    // get size() { return super.size}
    // set size(v) {super.size = v; this.buildGeometry()}

    // buildGeometry() {
    //     if (this.geometry) this.geometry.dispose();
    //     this.geometry = new THREE.PlaneGeometry(...this.trueSize, 1);
    // }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    get color() { return this._color || [0,0,0];}
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

    destroy() {
        super.destroy();
        if (this.material.map) this.material.map.dispose();
    }

    get url() { return this._url }
    set url(url) {
        this._url = url;
        if (this.image && this.url) this.image.src = this.url;
    }

}

//------------------------------------------------------------------------------------------
//-- ControlWidget -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ControlWidget3 extends VisibleWidget3 {

    get collider() { return this.mesh }

    onHover() { console.log(this.name + " hover");}
    onUnhover() { console.log(this.name + " unhover")}
}






