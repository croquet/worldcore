// THREE.js widget system.

import { GetViewService, THREE, m4_identity } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- ThreeWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Widget3 {

    constructor(options) {
        this.set(options);
        this.global = m4_identity();
    }

    destroy() {
        new Set(this.children).forEach(child => child.destroy());
        this.parent = null;
    }

    get parent() { return this._parent; }
    set parent(p) {
        if (this.parent) this.parent.removeChild(this);
        this._parent = p;
        if (this.parent) this.parent.addChild(this);
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
        this.material = new THREE.MeshStandardMaterial({color: new THREE.Color(...this.color), side: THREE.DoubleSide});

        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.matrixAutoUpdate = false;
        mesh.matrix.fromArray(this.global);

        render.scene.add(mesh);
    }

}


