import { Actor, Pawn, mix, AM_Predictive, PM_Predictive, LoadImage, LoadFont, m4_multiply, v2_multiply, v2_sub, v2_scale, v2_add,
    m4_scaleRotationTranslation, GetPawn } from "@croquet/worldcore-kernel";
import { AM_PointerTarget, PM_PointerTarget, CardActor, CardPawn } from "./Card";
import { PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

//------------------------------------------------------------------------------------------
//-- HelperFunctions -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function RelativeTranslation(t, anchor, pivot, border, size, parentSize) {
    const aX = 0.5*parentSize[0] * anchor[0];
    const aY = 0.5*parentSize[1] * anchor[1];
    const pX = 0.5*size[0] * pivot[0];
    const pY = 0.5*size[1] * pivot[1];
    return [t[0]+aX-pX, t[1]+aY-pY, t[2]];
}

//------------------------------------------------------------------------------------------
//-- WidgetActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class WidgetActor extends mix(Actor).with(AM_Predictive) {

//     get pawn() { return WidgetPawn; }

//     init(options) {
//         super.init(options);
//         this.listen("_size", this.onSizeSet);
//         this.listen("_anchor", this.onSizeSet);
//         this.listen("_pivot", this.onSizeSet);
//         this.listen("_border", this.onSizeSet);
//         this.listen("_autoSize", this.onSizeSet);
//     }

//     get rawSize() { return this._size || [1,1];}
//     get anchor() { return this._anchor || [0,0];}
//     get pivot() { return this._pivot || [0,0];}
//     get border() { return this._border || [0,0,0,0]; }
//     get autoSize() { return this._autoSize || [0,0];}
//     get isVisible() { return this._visible === undefined || this._visible;} // Default to true
//     get color() { return this._color || [0,0,0];}
//     get url() { return this._url || null}

//     get fullSize() { // The size without borders
//         if (this.$fullSize) return this.$fullSize;
//         this.$fullSize = [...this.rawSize];
//         if (this.parent) {
//             if (this.autoSize[0]) { this.$fullSize[0] = this.parent.size[0] * this.autoSize[0]; }
//             if (this.autoSize[1]) { this.$fullSize[1] = this.parent.size[1] * this.autoSize[1]; }
//         }
//         return this.$fullSize;
//     }

//     onSizeSet() {
//         this.$size = null;
//         this.$fullSize = null;
//         this.localChanged();
//         if (this.children) this.children.forEach(c => c.onSizeSet());
//     }

//     get size() { // Subtracts the borders
//         if (this.$size) return this.$size;
//         this.$size = [...this.fullSize];
//         this.$size[0] -= (this.border[0] + this.border[2]);
//         this.$size[1] -= (this.border[1] + this.border[3]);
//         return this.$size;
//     }

//     get local() {
//         if (!this.$local) {
//             let parentSize = [0,0];
//             if (this.parent) parentSize = this.parent.size;
//             const relativeTranslation = RelativeTranslation(this.translation, this.anchor, this.pivot, this.border, this.fullSize,  parentSize);
//             this.$local = m4_scaleRotationTranslation(this.scale, this.rotation, relativeTranslation);
//         }
//         return this.$local;
//     }
// }
// WidgetActor.register('WidgetActor');

//------------------------------------------------------------------------------------------
//-- WidgetPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class WidgetPawn extends mix(Pawn).with(PM_Predictive) {

//     get rawSize() { return this.actor.rawSize; } // Without borders and autoSize
//     get fullSize() { return this.actor.fullSize; } // With borders
//     get size() { return this.actor.size; }
//     get anchor() { return this.actor.anchor }
//     get pivot() { return this.actor.pivot }
//     get border() { return this.actor.border }
//     get autoSize() { return this.actor.autoSize }
//     get isVisible() { return this.actor.isVisible} // Default to true
//     get color() { return this.actor.color }

//     get local() { // Revised local to incorporate widget layout
//         if (this._local) return this. _local;

//         let parentSize = [0,0];
//         if (this.parent) parentSize = this.parent.size;

//         const relativeTranslation = RelativeTranslation(this.translation, this.anchor, this.pivot, this.border, this.fullSize,  parentSize);
//         this._local = m4_scaleRotationTranslation(this._scale, this._rotation, relativeTranslation);

//         if (this._localOffset) this._local = m4_multiply(this._localOffset, this._localOffset);

//         return this._local;
//     }

// }

//------------------------------------------------------------------------------------------
//-- VisibleWidgetActor --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class VisibleWidgetActor extends WidgetActor {

//     get pawn() { return VisibleWidgetPawn; }
// }
// VisibleWidgetActor.register('VisibleWidgetActor');

//------------------------------------------------------------------------------------------
//-- VisibleWidgetPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class VisibleWidgetPawn extends mix(WidgetPawn).with(PM_ThreeVisible) {

//     constructor(actor) {
//         super(actor);

//         this.geometry = new THREE.PlaneGeometry(...this.size, 1);
//         this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(...this.color), side: THREE.DoubleSide});
//         this.material.polygonOffset = true;
//         this.setPolygonOffsets();

//         const mesh = new THREE.Mesh( this.geometry, this.material );
//         this.setRenderObject(mesh);
//         this.refreshVisibility();
//         this.listen("_parent", this.onParentSet);
//         this.listen("_size", this.onSizeSet);
//         this.listen("_color", this.onColorSet);
//         this.listen("_anchor", this.onLocalChanged);
//         this.listen("_pivot", this.onLocalChanged);
//         this.listen("_border", this.onLocalChanged);
//         this.listen("_autoSize", this.onLocalChanged);
//         this.listen("_visible", this.onVisibleSet);
//     }

//     destroy() {
//         super.destroy();
//         this.geometry.dispose();
//         this.material.dispose();
//     }

//     onParentSet() {
//         this.onLocalChanged();
//         this.setPolygonOffsets();
//         this.refreshVisibility();
//     }

//     onVisibleSet() {
//         this.refreshVisibility();
//     }

// //Visibility and polygon offsets are not robust with parent changes.
// // Need a way to set visibiligy locally like the local offset.

//     refreshVisibility() {
//         let v = this.isVisible;
//         let p = this.parent;
//         while(p) {
//             v = v && p.isVisible;
//             p = p.parent;
//         }
//         this.renderObject.visible = v;
//         if (this.children) this.children.forEach(c => c.refreshVisibility());
//     }

//     setPolygonOffsets() { // Set the polygon offsets to 1 less than our parent to prevent z fighting.
//         if (this.parent) {
//             this.material.polygonOffsetUnits = this.parent.material.polygonOffsetUnits - 1;
//             this.material.polygonOffsetFactor = this.parent.material.polygonOffsetFactor - 1;
//         } else {
//             this.material.polygonOffsetFactor = 0;
//             this.material.polygonOffsetUnits = 0;
//         }
//         if (this.children) this.children.forEach(c => c.setPolygonOffsets());
//     }

//     onSizeSet() {
//         this.onLocalChanged();
//         const plane = new THREE.PlaneGeometry(...this.size, 1);
//         this.geometry.copy(plane);
//         plane.dispose();
//         if (this.children) this.children.forEach(c => c.onSizeSet());
//     }

//     onColorSet() {
//         this.material.color.set(new THREE.Color(...this.color));
//     }

// }

// //------------------------------------------------------------------------------------------
// //-- ImageWidgetActor ----------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class ImageWidgetActor extends VisibleWidgetActor {

//     get pawn() { return ImageWidgetPawn; }

// }
// ImageWidgetActor.register('ImageWidgetActor');

// //------------------------------------------------------------------------------------------
// //-- ImageWidgetPawn -----------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class ImageWidgetPawn extends VisibleWidgetPawn {

//     constructor(...args) {
//         super(...args);

//         if (this.parent) {
//             this.material.polygonOffsetUnits = this.parent.material.polygonOffsetUnits - 1;
//             this.material.polygonOffsetFactor = this.parent.material.polygonOffsetFactor - 1;
//         }

//         this.image = new Image();
//         this.image.onload = () => {
//             if (this.material.map) this.material.map.dispose();
//             this.material.map = new THREE.CanvasTexture(this.image);
//             this.material.needsUpdate = true;
//         }
//         this.onURLSet();
//         this.listen("_url", this.onURLSet);
//     }

//     destroy() {
//         super.destroy();
//         if (this.material.map) this.material.map.dispose();
//     }

//     onURLSet() {
//         if (!this.actor.url) {
//             if (this.material.map) this.material.map.dispose();
//             this.material.map = null;
//             this.material.needsUpdate = true;
//         } else {
//             this.image.src = this.actor.url;
//         }
//     }

// }

// function canvasColor(r, g, b) {
//     return 'rgb(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) +')';
// }


// //------------------------------------------------------------------------------------------
// //-- CanvasWidgetActor ----------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class CanvasWidgetActor extends VisibleWidgetActor {

//     get pawn() { return CanvasWidgetPawn; }

//     get resolution() { return this._resolution || 300;}

// }
// CanvasWidgetActor.register('CanvasWidgetActor');

// //------------------------------------------------------------------------------------------
// //-- CanvasWidgetPawn -----------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class CanvasWidgetPawn extends VisibleWidgetPawn {

//     constructor(...args) {
//         super(...args);
//         this.buildCanvas();
//         this.listen("_resolution", this.onSizeSet);
//     }

//     buildCanvas() {
//         if (this.material.map) this.material.map.dispose();
//         if (this.canvas) this.canvas.remove();

//         this.canvas = document.createElement("canvas");
//         document.body.insertBefore(this.canvas, null);
//         this.cc = this.canvas.getContext('2d');
//         this.material.map = new THREE.CanvasTexture(this.canvas);
//         this.canvas.width = this.size[0] * this.resolution;
//         this.canvas.height = this.size[1] * this.resolution;
//         this.material.needsUpdate = true;

//         this.draw();
//     }

//     destroy() {
//         super.destroy();
//         if (this.material.map) this.material.map.dispose();
//         if (this.canvas) this.canvas.remove();
//     }

//     get resolution() { return this.actor.resolution;}

//     onSizeSet() {
//         super.onSizeSet();
//         if (this.material.map) this.material.map.dispose();
//         this.buildCanvas();
//     }

//     draw() {};

// }

// //------------------------------------------------------------------------------------------
// //-- TextWidgetActor -----------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class TextWidgetActor extends CanvasWidgetActor {

//     get pawn() { return TextWidgetPawn; }

//     get text() { return this._text || "Text"};
//     get font() { return this._font || "sans-serif";}
//     get point() { return this._point || 24 }
//     get lineSpacing() { return this._lineSpacing || 0;}
//     get style() { return this._style || "normal";}
//     get alignX() { return this._alignX || "center";}
//     get alignY() { return this._alignY || "middle";}
//     get wrap() { return this._wrap === undefined || this._wrap;} // Default to true


// }
// TextWidgetActor.register('TextWidgetActor');

// //------------------------------------------------------------------------------------------
// //-- TextWidgetPawn ------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class TextWidgetPawn extends CanvasWidgetPawn {

//     constructor(...args) {
//         super(...args);

//         this.listen("_text", this.draw);
//         this.listen("_font", this.draw);
//         this.listen("_point", this.draw);
//         this.listen("_lineSpacing", this.draw);
//         this.listen("_style", this.draw);
//         this.listen("_alignX", this.draw);
//         this.listen("alignY", this.draw);
//         this.listen("_text", this.draw);
//         this.listen("_wrap", this.draw);

//     }


//     get text() { return this.actor.text; }
//     get font() { return this.actor.font;}
//     get point() { return this.actor.point; }
//     get lineSpacing() { return this.actor.lineSpacing;}
//     get style() { return this.actor.style;}
//     get alignX() { return this.actor.alignX;}
//     get alignY() { return this.actor.alignY;}
//     get wrap() { return this.actor.wrap;}

//     destroy() {
//         super.destroy();
//     }

//     lines() {
//         if (!this.wrap) return this.text.split('\n');
//         const out = [];
//         const spaceWidth = this.cc.measureText(' ').width;
//         const words = this.text.split(' ');
//         let sum = this.canvas.width+1;
//         words.forEach( word => {
//             const wordWidth = this.cc.measureText(word).width
//             sum += spaceWidth + wordWidth;
//             if (sum > this.canvas.width) {
//                 out.push(word);
//                 sum = wordWidth;
//             } else {
//                 out[out.length-1] += ' ' + word;
//             }
//         });
//         return out;
//     }

//     onSizeSet() {
//         super.onSizeSet();
//         this.draw();
//     }

//     draw() {

//         this.cc.textAlign = this.alignX;
//         this.cc.textBaseline = this.alignY;
//         this.cc.font = this.style + " " + this.point + "px " + this.font;

//         const lineHeight = (this.point + this.lineSpacing);

//         this.cc.fillStyle = canvasColor(...this.color);
//         this.cc.fillRect(0, 0, this.canvas.width, this.canvas.height);
//         this.cc.fillStyle = 'black';

//         const lines = this.lines();

//         let xy = [0,0];
//         let yOffset = 0;
//         if (this.alignX === "center") {
//             xy[0] = this.canvas.width / 2;
//         } else if (this.alignX === "right") {
//             xy[0] = this.canvas.width;
//         }
//         if (this.alignY === "middle") {
//             xy[1] = this.canvas.height / 2;
//             yOffset = lineHeight * (lines.length-1) / 2;
//         } else if (this.alignY === "bottom") {
//             xy[1] = this.canvas.height;
//             yOffset = lineHeight * (lines.length-1);
//         }

//         lines.forEach((line,i) => {
//             const o = (i * lineHeight) - yOffset;
//             this.cc.fillText(line, xy[0], xy[1] + o);
//         });

//     }

// }

// //------------------------------------------------------------------------------------------
// //-- ControlWidgetActor --------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class ControlWidgetActor extends VisibleWidgetActor {

//     get pawn() { return ControlWidgetPawn; }

// }
// ControlWidgetActor.register('ControlWidgetActor');

// //------------------------------------------------------------------------------------------
// //-- ControlWidgetPawn ----------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class ControlWidgetPawn extends mix(VisibleWidgetPawn).with(PM_PointerTarget) {
//     constructor(actor) {
//         super(actor);

//         this.addToLayers("pointer");
//     }
// }



// //------------------------------------------------------------------------------------------
// //-- ButtonWidgetActor ---------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class ButtonWidgetActor extends ControlWidgetActor {

//     get pawn() { return ButtonWidgetPawn; }

//     init(options) {
//         super.init(options);

//         this._normal = VisibleWidgetActor.create({parent: this, autoSize: [1,1], color: [0,1,0]});
//         this._hovered = VisibleWidgetActor.create({parent: this, autoSize: [1,1], color: [0,0,1], visible:false});
//         this._pressed = VisibleWidgetActor.create({parent: this, autoSize: [1,1], color: [1,0,0], visible:false});

//         // this.set({normal: VisibleWidgetActor.create({parent: this, autoSize: [1,1], color: [0,1,0]})});
//         // if (!this.hover) this.set({hover: VisibleWidgetActor.create({parent: this, autoSize: [1,1], color: [0,0,1], visible:false})});
//         // if (!this.pressed) this.set({pressed: VisibleWidgetActor.create({parent: this, autoSize: [1,1], color: [1,0,0], visible:false})});

//         // console.log(this.normal);
//     }

//     get normal() {return this._normal; }
//     get hovered() {return this._hovered; }
//     get pressed() {return this._pressed; }

//     // // get label() {return this._label; }


// }
// ButtonWidgetActor.register('ButtonWidgetActor');

// //------------------------------------------------------------------------------------------
// //-- ButtonWidgetPawn ----------------------------------------------------------------------
// //------------------------------------------------------------------------------------------


// export class ButtonWidgetPawn extends ControlWidgetPawn {

//     constructor(actor) {
//         super(actor)
//     }

//     get normal() {
//         if (!this._normal) {
//             this._normal = null;
//             if (this.actor.normal) this._normal = GetPawn(this.actor.normal.id);
//         }
//         return this._normal;
//     }

//     get hovered() {
//         if (!this._hovered) {
//             this._hovered = null;
//             if (this.actor.hovered) this._hovered = GetPawn(this.actor.hovered.id);
//         }
//         return this._hovered;
//     }

//     get pressed() {
//         if (!this._pressed) {
//             this._pressed = null;
//             if (this.actor.pressed) this._pressed = GetPawn(this.actor.pressed.id);
//         }
//         return this._pressed;
//     }

//     onNormalSet() { this._normal = null; }

//     // onHoverSet() {
//     //     this._hover = null;
//     //     if (this.actor.hover) this._hover = GetPawn(this.actor.hover.id);
//     // }

//     // onPressedSet() {
//     //     this._pressed = null;
//     //     if (this.actor.pressed) this._pressed = GetPawn(this.actor.pressed.id);
//     // }

//     onPointerEnter() {
//         console.log("pointerEnter");
//         this.normal.renderObject.visible = false;
//         this.hovered.renderObject.visible = true;
//     }

//     onPointerLeave() {
//         console.log("pointerLeave");
//         this.normal.renderObject.visible = true;
//         this.hovered.renderObject.visible = false;
//     }

//     // onPointerDown() {
//     //     console.log("pointerLeave");
//     //     this.normal.renderObject.visible = true;
//     //     this.hovered.renderObject.visible = false;
//     // }
// }