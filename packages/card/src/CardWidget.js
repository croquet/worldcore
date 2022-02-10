import { Actor, Pawn, mix, AM_Predictive, PM_Predictive, LoadImage, LoadFont, m4_multiply, v2_multiply, v2_sub, v2_scale } from "@croquet/worldcore-kernel";
import { AM_PointerTarget, PM_ThreePointerTarget, CardActor, CardPawn } from "./Card";
import { PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

//------------------------------------------------------------------------------------------
//-- HelperFunctions -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function RelativeTransform(t, anchor, pivot, size, parentSize, border) {
    const aX = 0.5*parentSize[0] * anchor[0];
    const aY = 0.5*parentSize[1]/2 * anchor[1];
    const pX = 0.5*size[0] * pivot[0];
    const pY = 0.5*size[1] * pivot[1];
    return [t[0]+aX-pX, t[1]+aY-pY, t[2]];
}


//------------------------------------------------------------------------------------------
//-- WidgetActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetActor extends CardActor {

    get pawn() { return WidgetPawn; }

    get size() { return this._size || [1,1];}
    get anchor() { return this._anchor || [0,0];}
    get pivot() { return this._pivot || [0,0];}
    get autoSize() { return this._autoSize || [0,0];}
    get isVisible() { return this._visible === undefined || this._visible;} // Default to true
    get color() { return this._color || [0,0,0];}
    get url() { return this._url || null}

}
WidgetActor.register('WidgetActor');

//------------------------------------------------------------------------------------------
//-- WidgetPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetPawn extends mix(CardPawn).with(PM_ThreeVisible) {

    constructor(...args) {
        super(... args);

        this.geometry = new THREE.PlaneGeometry(...this.size, 1);
        // this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(...this.color), side: THREE.DoubleSide});
        this.material = new THREE.MeshStandardMaterial({side: THREE.DoubleSide});
        this.material.polygonOffset = true;
        this.setPolygonOffsets();

        const mesh = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(mesh);

        this.listen("_parent", this.onParentSet);
        this.listen("_size", this.onSizeSet);
        this.listen("_color", this.onColorSet);


    }

    get size() { return this.actor.size; }
    get anchor() { return this.actor.anchor }
    get pivot() { return this.actor.pivot }
    get autoSize() { return this.actor.autoSize }
    get isVisible() { return this.actor.isVisible} // Default to true
    get color() { return this.actor.color }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();

        // Three.js clean-up
        this.geometry.dispose();
        this.material.dispose();
    }

    onParentSet() {
        this.setPolygonOffsets();
    }

    setPolygonOffsets() { // Set the polygon offsets to 1 less than our parent to prevent z fighting.
        if (this.parent) {
            this.material.polygonOffsetUnits = this.parent.material.polygonOffsetUnits - 1;
            this.material.polygonOffsetFactor = this.parent.material.polygonOffsetFactor - 1;
        } else {
            this.material.polygonOffsetFactor = 0;
            this.material.polygonOffsetUnits = 0;
        }
        if (this.children) this.children.forEach(c => c.setPolygonOffsets());
    }

    onSizeSet() {
        const plane = new THREE.PlaneGeometry(...this.size, 1);
        this.geometry.copy(plane);
        plane.dispose();
    }

    onColorSet() {
        this.material.color.set(new THREE.Color(...this.color));
    }

    // get global() {
    //     if (this.$global) return this.$global;
    //     console.log("new global");
    //     if (this.parent) {
    //         // const halfParent = v2_scale(this.parent.size, 0.5);
    //         // const halfSize = v2_scale(this.size, 0.5);
    //         // const anchor = v2_multiply(halfParent, this.anchor);
    //         // const pivot = v2_multiply(halfSize, this.pivot);
    //         // const offset = v2_sub(anchor, pivot);
    //         this.$global = m4_multiply(this.local, this.parent.global);
    //     } else {
    //         this.$global = this.local;
    //     }
    //     return this.$global;
    // }

}

//------------------------------------------------------------------------------------------
//-- ImageWidgetActor ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ImageWidgetActor extends WidgetActor {

    get pawn() { return ImageWidgetPawn; }

}
ImageWidgetActor.register('ImageWidgetActor');

//------------------------------------------------------------------------------------------
//-- ImageWidgetPawn -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ImageWidgetPawn extends WidgetPawn {

    constructor(...args) {
        super(...args);

        if (this.parent) {
            this.material.polygonOffsetUnits = this.parent.material.polygonOffsetUnits - 1;
            this.material.polygonOffsetFactor = this.parent.material.polygonOffsetFactor - 1;
        }

        this.image = new Image();
        this.image.onload = () => {
            if (this.material.map) this.material.map.dispose();
            this.material.map = new THREE.CanvasTexture(this.image);
            this.material.needsUpdate = true;
        }
        this.onURLSet();
        this.listen("_url", this.onURLSet);
    }

    destroy() {
        super.destroy();
        if (this.material.map) this.material.map.dispose();
    }

    onURLSet() {
        if (!this.actor.url) {
            if (this.material.map) this.material.map.dispose();
            this.material.map = null;
            this.material.needsUpdate = true;
        } else {
            this.image.src = this.actor.url;
        }
    }

}

function canvasColor(r, g, b) {
    return 'rgb(' + Math.floor(255 * r) + ', ' + Math.floor(255 * g) + ', ' + Math.floor(255 * b) +')';
}


//------------------------------------------------------------------------------------------
//-- CanvasWidgetActor ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CanvasWidgetActor extends WidgetActor {

    get pawn() { return CanvasWidgetPawn; }

}
CanvasWidgetActor.register('CanvasWidgetActor');

//------------------------------------------------------------------------------------------
//-- CanvasWidgetPawn -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CanvasWidgetPawn extends WidgetPawn {

    constructor(...args) {
        super(...args);

        this.canvas = document.createElement("canvas");
        document.body.insertBefore(this.canvas, null);
        this.cc = this.canvas.getContext('2d');
        this.material.map = new THREE.CanvasTexture(this.canvas);


        const xxx = RelativeTransform([0,0,0], [-1,0], [-1,0], [10,10], [500,200]);
        console.log(xxx);

        // canvas size relative to card?

        this.canvas.width = this.size[0] * 300;
        this.canvas.height = this.size[1] * 300;

        // this.cc.fillStyle = 'white';
        this.cc.fillStyle = canvasColor(...this.color);
        this.cc.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.cc.fillStyle = 'red';
        this.cc.fillText("xxx", 10, 10);

        // this.canvasContext.fillStyle = 'red';
        // this.canvasContext.fillRect(20, 10, 10, 10);

    }

    destroy() {
        super.destroy();
        if (this.material.map) this.material.map.dispose();
        this.canvas.remove();
    }

}

//------------------------------------------------------------------------------------------
//-- TextWidgetActor -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TextWidgetActor extends WidgetActor {

    get pawn() { return TextWidgetPawn; }

    get text() { return this._text || "Text"};


}
TextWidgetActor.register('TextWidgetActor');

//------------------------------------------------------------------------------------------
//-- TextWidgetPawn ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TextWidgetPawn extends CanvasWidgetPawn {

    constructor(...args) {
        super(...args);
    }

    get text() { return this.actor.text; }

    destroy() {
        super.destroy();
    }

}
