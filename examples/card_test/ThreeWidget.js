// THREE.js widget system.

import { ViewService, GetViewService, THREE, m4_identity, q_identity, m4_scaleRotationTranslation, m4_multiply, View, viewRoot, v3_add, TAU, toDeg, q_axisAngle, q_multiply, q_lookAt, v3_normalize, v3_sub, m4_getTranslation, v3_transform, v3_rotate, m4_getRotation } from "@croquet/worldcore";

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
        this.subscribe("input", "pointerDown", this.widgetPointerDown);
        this.subscribe("input", "pointerUp", this.widgetPointerUp);
        this.subscribe("input", "pointerMove", this.widgetPointerMove);
        this.subscribe("input", "keyDown", this.widgetKeyDown);
        this.subscribe("input", "keyUp", this.widgetKeyUp);
    }

    widgetPointerDown(e) {
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const hit = this.controlRaycast(x,y);

        if (this.pressed !== hit.control) {
            this.pressed = hit.control;
            if(this.pressed) this.pressed.onPress(hit);
        }

        if (this.focused !== hit.control) {
            if(this.focused) this.focused.onBlur();
            this.focused = null;
        }
        if (hit.control instanceof FocusWidget3) {
            this.focused = hit.control;
            this.focused.onFocus();
        }

    }

    widgetPointerUp(e) {
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const hit = this.controlRaycast(x,y);

        if (hit.control) {
            if (this.pressed === hit.control) hit.control.onClick(hit);
            if (this.pressed) this.pressed.onNormal()
        }

        this.pressed = null;
        this.hovered = null;
    }

    widgetPointerMove(e) {
        if (this.service("InputManager").inPointerLock) return;
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const hit = this.controlRaycast(x,y);

        if (this.pressed) {
            if (this.pressed == hit.control)
                this.pressed.onPress(hit)
            else {
                this.pressed.onNormal()
            }
        } else if (this.hovered !== hit.control) {
            if (this.hovered) this.hovered.onNormal();
            this.hovered = hit.control;
            if (this.hovered) this.hovered.onHilite();
        }

    }

    widgetKeyDown(e) {
        if(this.focused) this.focused.keyDown(e);
    }

    widgetKeyUp(e) {
        if(this.focused) this.focused.keyUp(e);
    }


    controlRaycast(x,y) {
        const render = GetViewService("ThreeRenderManager");
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({x: x, y: y}, render.camera);

        let hits = raycaster.intersectObjects( wm.colliders );
        if (hits.length > 1) {
            const topRoot = hits[0].object.widget.root;
            hits = hits.filter(hit => hit.object.widget.root === topRoot).sort( (a,b) => {return b.object.widget.depth - a.object.widget.depth});
        }

        const out = {};
        if(hits.length > 0) {
            const hit = hits[0];
            const widget = hit.object.widget;
            const control = ParentControl(hit.object.widget)
            const xy = [hit.uv.x, hit.uv.y];
            out.widget = widget;
            out.control = control;
            out.xy = xy;
        }
        return out;

    }


}



//------------------------------------------------------------------------------------------
//-- PM_Widget3 ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Widget3 = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.rootWidget = new Widget3({local: this.global, pawn: this});

        this.listen("viewGlobalChanged", this.moveRoot);
    }

    destroy() {
        super.destroy();
        if (this.rootWidget) this.rootWidget.destroy();
    }

    moveRoot() {
        this.rootWidget.local = this.global;
    }

}

//------------------------------------------------------------------------------------------
//-- HelperFunctions -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function RelativeTranslation(t, anchor, pivot, border, size, parentSize) {
    const aX = -0.5*parentSize[0] + parentSize[0]*anchor[0];
    const aY = -0.5*parentSize[1] + parentSize[1]*anchor[1];
    const pX = 0.5*size[0] - size[0]*pivot[0];
    const pY = 0.5*size[1] - size[1]*pivot[1];
    return [t[0]+aX+pX, t[1]+aY+pY, t[2]];
}

//------------------------------------------------------------------------------------------
//-- Widget3 -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget3 extends View {

    constructor(options) {
        super(viewRoot.model);
        this.set(options);
        wm.add(this);
    }
    destroy() {
        this.detach();
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

    get pawn() {
        if (this._pawn) return this._pawn;
        if (this.parent) return this.parent.pawn;
        return null;
    }
    set pawn(p) { this._pawn = p }

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
        if (this.mesh) this.mesh.visible = this.visible;
        if (this.children) this.children.forEach(child => child.refreshVisibility());
    }

    show() { this.visible = true; }
    hide() { this.visible = false; }

    get size() { return this._size || [0,0];}
    set size(v) { this._size = v; }
    get anchor() { return this._anchor || [0.5,0.5];}
    set anchor(v) { this._anchor = v; }
    get pivot() { return this._pivot || [0.5,0.5];}
    set pivot(v) { this._pivot = v; }
    get border() { return this._border || [0,0,0,0]; }
    set border(v) { this._border = v; }
    get autoSize() { return this._autoSize || [0,0];}
    set autoSize(v) { this._autoSize = v; }
    get collidable() { return this._collidable }
    set collidable(b) { this._collidable = b; wm.clearColliders();}
    get collider() { if (this.collidable && ParentControl(this).visible) return this.mesh }
    get billboard() { return this._billboard }
    set billboard(b) { this._billboard = b; }

    get width() { return this._width|| 0;}  // Overrides for the automatic resize in layout widgets.
    set width(n) { this._width = n; }
    get height() { return this._height|| 0;}
    set height(n) { this._height = n; }

    get lit() { return this._lit }
    set lit(b) { this._lit = b; }

    get opacity() {
        if (this._opacity) return this._opacity;
        if (this.parent) return this.parent.opacity;
        return 1;
    }
    set opacity(n) { this._opacity = n; }

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
        if (this.billboard) {
            const render = GetViewService("ThreeRenderManager");
            const cameraMatrix = render.camera.matrix;
            let v = new THREE.Vector3().setFromMatrixPosition(cameraMatrix);
            const cameraXZ = [v.x, 0, v.z];
            let forward = [0,0,1];
            if (this.parent) forward = v3_rotate([0,0,1], m4_getRotation(this.parent.global));
            const up = [0,1,0];
            const widgetXZ = m4_getTranslation(this.global);
            widgetXZ[1] = 0;
            const target = v3_normalize(v3_sub(cameraXZ, widgetXZ));
            const q = q_lookAt(forward, up, target);
            this.rotation = q;
        }
        if (this.children) this.children.forEach(child => child.update(time,delta));
    }

}



//------------------------------------------------------------------------------------------
//-- LayoutWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class LayoutWidget3 extends Widget3 {
    constructor(options) {
        super(options);
        this.slots = [];
    }

    get size() { return super.size }
    set size(v) { super.size = v; this.needsResize = true}
    get margin() { return this._margin || 0 }
    set margin(n) { this._margin = n; this.needsResize = true}

    addChild(child) {
        super.addChild(child);
        this.needsResize = true;
    }

    resize() {}

    update(time, delta) {
        super.update(time, delta);
        if (this.needsResize) this.resize();
        this.needsResize = false;
    }

}

//------------------------------------------------------------------------------------------
//-- HorizontalWidget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class HorizontalWidget3 extends LayoutWidget3 {

    resize() {
        if (!this.children) return;
        let widthSum = Math.max(0, (this.children.size - 1) * this.margin);
        let autoCount = 0;
        this.children.forEach(child => {
            if (child.width) {
                widthSum += child.width;
            } else {
                autoCount++;
            }
        });

        let autoWidth = 0;
        if (autoCount > 0) autoWidth = Math.max(0, (this.trueSize[0] - widthSum) / autoCount);
        let offset = -this.trueSize[0]/2;
        this.children.forEach(child => {
            let width = autoWidth;
            if (child.width) width = child.width;
            child.set({autoSize: [0,1], size:[width, 0], translation:[offset+width/2,0,0]});
            offset += width + this.margin;
        });
    }

}

//------------------------------------------------------------------------------------------
//-- VerticalWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class VerticalWidget3 extends LayoutWidget3 {

    resize() {
        if (!this.children) return;
        let heightSum = Math.max(0, (this.slots.length - 1) * this.margin);
        let autoCount = 0;

        this.children.forEach(child => {
            if (child.height) {
                heightSum += child.height;
            } else {
                autoCount++;
            }
        });

        let autoHeight = 0;
        if (autoCount > 0) autoHeight = Math.max(0, (this.trueSize[1] - heightSum) / autoCount);
        let offset = this.trueSize[1]/2;

        this.children.forEach(child => {
            let height = autoHeight;
            if (child.height) height = child.height;
            child.set({autoSize: [1,0], size:[0, height], translation: [0, offset-height/2,0]});
            offset -= height + this.margin;
        });
    }

}

//------------------------------------------------------------------------------------------
//-- RenderWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RenderWidget3 extends Widget3 {

    constructor(options) {
        super(options);
        this.buildGeometry();
        this.buildMaterial();
        this.buildMesh();
    }

    get parent() { return super.parent; }
    set parent(p) { super.parent = p; this.buildMaterial()} // May change sorting order of coplanar widgets.

    get color() { return this._color || [1,1,1];}
    set color(v) { this._color = v; this.buildMaterial(); }

    buildGeometry() {
        if (this.geometry) this.geometry.dispose();
        this.geometry = null;
     }

    buildMaterial() {
        if (this.material && this.material.map) this.material.map.dispose();
        if (this.material && this.material.alphaMap) this.material.alphaMap.dispose();
        if (this.material) this.material.dispose();

        this.material = this.lit ? new THREE.MeshStandardMaterial({color: new THREE.Color(...this.color), transparent: true, opacity: this.opacity})
        : new THREE.MeshBasicMaterial({color: new THREE.Color(...this.color), transparent: true, opacity: this.opacity});
         this.material.polygonOffset = true;
         this.material.polygonOffsetFactor = -this.depth;
         this.material.polygonOffsetUnits = -this.depth;
         if (this.mesh) this.mesh.material = this.material;
    }

    buildMesh() {
        const render = GetViewService("ThreeRenderManager");
        if (this.mesh) render.scene.remove(this.mesh);

        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.visible = this.visible;
        this.mesh.widget = this;
        this.mesh.matrixAutoUpdate = false;
        this.mesh.matrix.fromArray(this.global);
        render.scene.add(this.mesh);
    }

    destroy() {
        super.destroy();
        wm.clearColliders();
        const render = GetViewService("ThreeRenderManager");
        if (this.mesh) render.scene.remove(this.mesh);
        if (this.geometry)this.geometry.dispose();
        if (this.material)this.material.dispose();
        if (this.material && this.material.map) this.material.map.dispose();
    }

    globalChanged() {
        super.globalChanged();
        this.isDirty = true;
    }

    update(time,delta) {
        super.update(time,delta)
        if (this.mesh && this.isDirty) {
            this.mesh.matrix.fromArray(this.global);
            this.isDirty = false;
        }

    }

}

//------------------------------------------------------------------------------------------
//-- PlaneWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PlaneWidget3 extends RenderWidget3 {

    buildGeometry() {
        super.buildGeometry();
        this.geometry = new THREE.PlaneGeometry(...this.trueSize, 1);
        if (this.mesh) this.mesh.geometry = this.geometry;
    }

    get size() { return super.size ;}
    set size(v) { super.size = v; this.buildGeometry();}



}

//------------------------------------------------------------------------------------------
//-- BoxWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BoxWidget3 extends RenderWidget3 {

    buildGeometry() {
        super.buildGeometry();
        this.geometry = new THREE.BoxGeometry(...this.trueSize, this.thick);
        if (this.mesh) this.mesh.geometry = this.geometry;
    }

    get thick() { return this._thick || 0.1;}
    set thick(n) { this._thick = n; this.buildGeometry();}
    get size() { return super.size ;}
    set size(v) { super.size = v; this.buildGeometry();}

}

//------------------------------------------------------------------------------------------
//-- ImageWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ImageWidget3 extends PlaneWidget3 {

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

export class CanvasWidget3 extends PlaneWidget3 {

    constructor(options) {
        super(options);
        // this.buildCanvas();
    }

    get size() { return super.size}
    set size(v) {super.size = v; this.buildCanvas()}
    get resolution() { return this._resolution || 300;}
    set resolution(n) { this._resolution = n; this.buildCanvas(); }
    get alpha() { return this._alpha;}
    set alpha(b) { this._alpha = b; this.buildCanvas(); }

    buildMaterial() {
        super.buildMaterial();
        this.buildCanvas();
    }

    buildCanvas() {
        if(this.material && this.material.map) this.material.map.dispose();
        if(this.material && this.material.alphaMap) this.material.alphaMap.dispose();
        this.canvas = document.createElement("canvas");
        this.canvas.width = Math.max(1,this.trueSize[0]) * this.resolution;
        this.canvas.height = Math.max(1,this.trueSize[1]) * this.resolution;
        if (this.material) {
            if (this.alpha) {
                this.material.alphaMap = new THREE.CanvasTexture(this.canvas);
                this.material.alphaTest = 0.1;
            } else {
                this.material.map = new THREE.CanvasTexture(this.canvas);
                this.material.alphaTest = 0;
            }
        }
        this.draw()
    }

    update(time,delta) {
        super.update(time,delta)
        if (this.redraw) {
            this.buildCanvas();
            this.redraw = false;
        } ;
    }

    draw() {};
}

//------------------------------------------------------------------------------------------
//-- TextWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TextWidget3 extends CanvasWidget3 {

    constructor(options) {
        super(options);
    }

    get text() { return this._text || "Text"}
    set text(s) { this._text = s; this.redraw = true; }
    get font() { return this._font || "sans-serif"}
    set font(s) { this._font = s; this.redraw = true; }
    get point() { return this._point || 24 }
    set point(n) { this._point = n; this.redraw = true; }
    get lineSpacing() { return this._lineSpacing || 0}
    set lineSpacing(n) { this._lineSpacing = n }
    get style() { return this._style || "normal"}
    set style(s) { this._style = s; this.redraw = true; }
    get alignX() { return this._alignX || "center"}
    set alignX(s) { this._alignX = s; this.redraw = true; }
    get alignY() { return this._alignY || "middle"}
    set alignY(s) { this._alignY = s; this.redraw = true; }
    get noWrap() { return this._noWrap }
    set noWrap(b) { this._noWrap = b; this.redraw = true; }

    get bgColor()  {return this._bgColor || [0,0,0]}
    set bgColor(v)  { this._bgColor = v; this.redraw = true; }
    get fgColor()  {return this._fgColor || [1,1,1]}
    set fgColor(v)  { this._fgColor = v; this.redraw = true; }

    lines() {
        if (this.noWrap) return this.text.split('\n');
        const cc = this.canvas.getContext('2d');
        const out = [];
        const spaceWidth = cc.measureText(' ').width;
        const words = this.text.split(' ');
        let sum = this.canvas.width+1;
        words.forEach( word => {
            const wordWidth = cc.measureText(word).width
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
        const cc = this.canvas.getContext('2d');
        this.setStyle(cc);
        const c = [...this.text];
        let offset = 0;
        n = Math.min(n, c.length);
        for (let i = 0; i < n; i++) {
            offset += cc.measureText(c[i]).width;
        }
        return offset / this.resolution;
    }

    setStyle(cc) {
        cc.textAlign = this.alignX;
        cc.textBaseline = this.alignY;
        cc.font = this.style + " " + this.point + "px " + this.font;
        cc.fillStyle = canvasColor(...this.bgColor);
        cc.fillRect(0, 0, this.canvas.width, this.canvas.height);
        cc.fillStyle = canvasColor(...this.fgColor);
    }

    draw() {
        const cc = this.canvas.getContext('2d', {alpha: false});
        this.setStyle(cc);
        // cc.textAlign = this.alignX;
        // cc.textBaseline = this.alignY;
        // cc.font = this.style + " " + this.point + "px " + this.font;

        const lineHeight = (this.point + this.lineSpacing);

        // cc.fillStyle = canvasColor(...this.bgColor);
        // cc.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // cc.fillStyle = canvasColor(...this.fgColor);

        const lines = this.lines(this.canvas);

        let xy = [0,0];
        let yOffset = 0;
        if (this.alignX === "center") {
            xy[0] = this.canvas.width / 2;
        } else if (this.alignX === "right") {
            xy[0] = this.canvas.width;
        }
        if (this.alignY === "middle") {
            xy[1] = this.canvas.height / 2;
            yOffset = lineHeight * (lines.length-1) / 2;
        } else if (this.alignY === "bottom") {
            xy[1] = this.canvas.height;
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

export function ParentControl(w) {
    do {
        if (w instanceof ControlWidget3) return w;
        w = w.parent
    } while(w)
    return null;
}

export class ControlWidget3 extends Widget3 {

    constructor(options) {
        super(options);
        this.active = new PlaneWidget3({parent: this, autoSize: [1,1], visible: true, color: [1,0,1], collidable:true});


    }


    onHilite() {}
    onNormal() {}
    onPress() {}


    onClick() {
        // console.log("click")
    }

}

//------------------------------------------------------------------------------------------
//-- ButtonWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ButtonWidget3 extends ControlWidget3 {

    constructor(options) {
        super(options);

        this.frame = new PlaneWidget3({parent: this, autoSize: [1,1], color: [0,0,1]});
        this.label = new TextWidget3({ parent: this.frame, autoSize: [1,1], border: [0.1, 0.1, 0.1, 0.1], color: [0.8,0.8,0.8], point: 96, text:  "Button" });
    }

    onNormal() {
        this.frame.color = [0,0,1];
        this.label.color = [0.8,0.8,0.8];
    }

    onHilite() {
        this.frame.color = [0,1,1];
    }

    onPress() {
        this.frame.color = [0,1,1];
        this.label.color = [1,1,1];
    }

    onClick() {
        console.log("click")
    }
}

//------------------------------------------------------------------------------------------
//-- ToggleWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ToggleWidget3 extends ButtonWidget3 {

    constructor(options) {
        super(options);
        this.onToggle();
    }

    destroy() {
        super.destroy();
        if (this.toggleSet) this.toggleSet.set.delete(this);

    }

    get isOn() { return this._isOn || false}
    set isOn(b) { this._isOn = b; this.onToggle()}
    get toggleSet() { return this._toggleSet }
    set toggleSet(ts) { this._toggleSet = ts; if (ts) ts.set.add(this); }

    onToggle() {
        this.isOn ? this.label.text = "On" : this.label.text = 'Off';
    }


    onClick() {
        if (this.toggleSet) {
            this.toggleSet.pick(this);
        } else {
            this.isOn = !this.isOn;
        }
    }

}

//------------------------------------------------------------------------------------------
//-- ToggleSet -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Helper class that manages a linked set of toggle widgets. You can pass a list of toggles
// into the constructor.

export class ToggleSet3  {
    constructor(...args) {
        this.set = new Set();
    }

    pick(on) {
        on.isOn = true
        this.set.forEach(w => { if (w !== on) w.isOn = false });
    }

}

//------------------------------------------------------------------------------------------
//-- SliderWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SliderWidget3 extends ControlWidget3 {

    constructor(options) {
        super(options);

        this.dragMargin = 0.5;

        const dragSize = [this.size[0]+2*this.dragMargin, this.size[1]+2*this.dragMargin]
        this.drag = new PlaneWidget3({parent: this.active, size: dragSize, visible: false, collidable:false, color: [1,0,1]});

        this.bar = new PlaneWidget3({parent: this, autoSize: [1,1], color: [0.8,0.8,0.8]});
        this.knob = new PlaneWidget3({
            parent: this.bar,
            size: this.knobSize,
            color: [0,0,1]
        });

        this.setKnobTranslation();

    }

    get isHorizontal() { return this.trueSize[0] > this.trueSize[1]; }
    get knobSize() {
        return this.isHorizontal ? [this.trueSize[1], this.trueSize[1]] : [this.trueSize[0], this.trueSize[0]]
    }
    get percent() {
        return this._percent || 0;
    }

    set percent(p) {
        p = Math.min(1,p);
        p = Math.max(0,p);
        if (this.ste) p = Math.round(p * (this.step)) / (this.step)
        this._percent = p;
        this.onPercent(p);
        this.setKnobTranslation()
    }
    get step() { return this._step || 0; }        // The number of steps the slider has. (0=continuous)
    set step(n) { this._step = n }

    setKnobTranslation() {
        if (!this.knob) return;
        const t = [0,0,0]
        if (this.isHorizontal) {
            // t[0] = -0.5 * this.trueSize[0] + (this.trueSize[0]-this.knobSize[0])*this.percent;
            t[0] = -0.5 * this.trueSize[0] + 0.5* this.knobSize[0] + this.percent*(this.trueSize[0]-this.knobSize[0]);
        } else {
            t[1] = -0.5 * this.trueSize[1] + 0.5* this.knobSize[1] + this.percent*(this.trueSize[1]-this.knobSize[1]);
        }
        this.knob.translation = t;
    }

    onNormal() {
        this.drag.collidable = false;
        this.knob.color = [0,0,1];
    }

    onHilite() {
        this.knob.color = [0,1,1];
    }

    onPress(hit) {
        this.drag.collidable = true;
        let x = hit.xy[0];
        let y = hit.xy[1];
        if(hit.widget === this.drag) {
            x = (x*this.drag.size[0] - this.dragMargin) / this.size[0]
            y = (y*this.drag.size[1] - this.dragMargin) / this.size[1]
        }

        if(this.isHorizontal) {
            this.percent = x;
        } else {
            this.percent = y;
        }
    }

    onPercent(p) {
        this.publish(this.id, "percent", p);
    }


}

//------------------------------------------------------------------------------------------
//-- DragWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class DragWidget3 extends ControlWidget3 {

    constructor(options) {
        super(options);
        this.dragSize = [100,100];
        this.knob = new BoxWidget3({parent: this.active, size: [0.3,0.3], thick:0.3, color: [0,0,1], collidable: true});
        this.drag = new PlaneWidget3({parent: this.active, size: this.dragSize, visible: false, collidable:false, color: [1,0,1]});
        this.pawnStart = this.pawn.translation;
        // this.startScale = ParentEditor(this).pawn.scale;

    }

    onNormal() {
        this.knob.color = [0,0,1];
        this.knob.collidable = true;
        this.drag.collidable = false;
    }

    onHilite() {
        this.knob.color = [0,0.5,1];
    }

    onPress(hit) {
        this.knob.color = [0.9,1,1];
        this.knob.collidable = false;
        this.drag.collidable = true;
        if(hit.widget === this.knob) {
        } else if (hit.widget = this.drag) {
            let x = this.dragSize[0] * (hit.xy[0]-0.5);
            let y = this.dragSize[1] * (hit.xy[1]-0.5);
            this.knob.translation = [x,y,0];
            const pt0 = v3_add(this.pawnStart, this.knob.translation);
            this.pawn.translateTo(pt0, 100);
        }
    }

    // onPress(hit) {
    //     this.knob.color = [0.9,1,1];
    //     this.knob.collidable = false;
    //     this.drag.collidable = true;
    //     if(hit.widget === this.knob) {
    //     } else if (hit.widget = this.drag) {
    //         let x = this.dragSize[0] * (hit.xy[0]-0.5);
    //         let y = this.dragSize[1] * (hit.xy[1]-0.5);
    //         this.knob.translation = [x,y,0];
    //         // const pt0 = v3_add(this.pawnStart, this.knob.translation);

    //         const s = (this.local[0] - x) / this.local[0];

    //         // const s = 1

    //         console.log(s);
    //         ParentEditor(this).pawn.scaleTo([s,s,s], 100);
    //     }
    // }

}

//------------------------------------------------------------------------------------------
//-- SpinWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SpinWidget3 extends ControlWidget3 {

    constructor(options) {
        super(options);
        this.dragSize = [2,2];
        this.knob = new BoxWidget3({parent: this.active, size: [0.3,0.3], thick:0.3, color: [0,0,1], lit: true, collidable: true});
        this.drag = new PlaneWidget3({parent: this.active, size: this.dragSize, visible: false, collidable:false, color: [1,0,1]});
        this.pawnStart = this.pawn.rotation;

    }

    onNormal() {
        this.knob.color = [0,0,1];
        this.knob.collidable = true;
        this.drag.collidable = false;
    }

    onHilite() {
        this.knob.color = [0,0.5,1];
    }

    onPress(hit) {
        this.knob.color = [0.9,1,1];
        this.knob.collidable = false;
        this.drag.collidable = true;
        if(hit.widget === this.knob) {
        } else if (hit.widget = this.drag) {
            let x = TAU * (hit.xy[0] - 0.5);
            let y = TAU * (hit.xy[1] - 0.5);
            const q0 = q_axisAngle([0,1,0],x);
            const q1 = q_axisAngle([-1,0,0], y);
            const q2 = q_multiply(q1,q0);
            const q3 = q_multiply( this.pawnStart,q0);
            this.knob.rotation = q0;
            this.pawn.rotateTo(q0, 100);
        }
    }

}

//------------------------------------------------------------------------------------------
//-- EditorWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class EditorWidget3 extends Widget3 {
    constructor(options) {
        super(options);
        if (this.pawn) this.local = this.pawn.global;
    }

    // get pawn() { return this._pawn }
    // set pawn(p) { this._pawn = p }
}

//------------------------------------------------------------------------------------------
//-- FocusWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class FocusWidget3 extends ControlWidget3 {

    onFocus() { console.log(this.name + " focus")}
    onBlur() {console.log(this.name + " blur")}
    keyDown(e) {}
    keyUp(e) {}

}

//------------------------------------------------------------------------------------------
//-- TextFieldWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class TextFieldWidget3 extends FocusWidget3 {
    constructor(options) {
        super(options);

        this.left = 1;
        this.right = 1;


        this.text = new TextWidget3({
            parent: this,
            autoSize:[1,1],
            bgColor: [1,1,1],
            fgColor: [0,0,0],
            font: "sans-serif",
            alignX: "left",
            point: 96,
            text: "12345"});

        this.cursor = new PlaneWidget3({
            parent: this.text,
            autoSize: [0,1],
            border: [0, 0.1, 0, 0.1],
            size: [0.02, 0],
            color:[0,0,0],
            translation: [this.cursorX,0,0]
            });

    }

    get cursorX() {
        return -this.trueSize[0]/2 + this.text.letterOffset(this.left);
    }

    keyDown(e) {
        switch (e.key) {
            default:
                this.insert(e.key)
        }
    }

    insert(s) {
        const t = this.text.text.slice(0, this.left) + s + this.text.text.slice(this.right);
        this.text.text = t;
        this.cursor.translation = [this.cursorX,0,0];
    }

    backspace() {
        const cut = Math.max(0, this.left - 1);
        const t = this.text.text.slice(0, cut) + this.text.text.slice(this.right);
        this.text.text = t;
        this.left = cut;
        this.right = this.left;
        this.cursor.translation = [this.cursorX,0,0];
    }

}





