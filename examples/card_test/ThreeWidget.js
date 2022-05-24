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
    }

    delete(widget) {
        this.widgets.delete(widget);
    }

}

//------------------------------------------------------------------------------------------
//-- PM_Widget3 ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Widget3 = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        console.log("PM_Widget3 constructor");
        console.log(this.global);
        this.rootWidget = new Widget3({local: this.global});

        this.listen("viewGlobalChanged", this.moveRoot);
    }

    moveRoot() {
        this.rootWidget.local = this.global;
    }

    update(time, delta) {
        super.update(time, delta);
        this.rootWidget.update(time, delta);
    }

}

//------------------------------------------------------------------------------------------
//-- Widget3 -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget3 {

    constructor(options) {
        this.set(options);
        const wm = GetViewService("WidgetManager");
        wm.add(this);
        console.log(wm.widgets);
    }

    destroy() {
        new Set(this.children).forEach(child => child.destroy());
        this.parent = null;
        const wm = GetViewService("WidgetManager");
        wm.delete(this);
    }

    get parent() { return this._parent; }
    set parent(p) {
        if (this.parent) this.parent.removeChild(this);
        this._parent = p;
        if (this.parent) this.parent.addChild(this);
        this.globalChanged();
    }

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
        if (!this._local) this._local = m4_scaleRotationTranslation(this.scale, this.rotation, this.translation);
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
    get anchor() { return this._anchor || [0,0];}
    get pivot() { return this._pivot || [0,0];}
    get border() { return this._border || [0,0,0,0]; }

    get color() { return this._color || [0,0,0];}
    set color(v) { this._color = v; }

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
        console.log("visible widget constructor!");
        const render = GetViewService("ThreeRenderManager");


        this.geometry = new THREE.BoxGeometry(1,1,1);
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(...this.color)});

        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.matrixAutoUpdate = false;
        this.mesh.matrix.fromArray(this.global);

        render.scene.add(this.mesh);
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






