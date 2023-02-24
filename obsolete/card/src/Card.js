import { Actor, Pawn, GetPawn, mix, RegisterMixin, AM_Predictive, PM_Predictive } from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
//-- AM_PointerTarget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to an actor to have it handle card pointer events.

export const AM_PointerTarget = superclass => class extends superclass {
    init(options) {
        super.init(options);
        this.hovered = new Set();
        this.focused = new Set();
        this.listen("pointerEnter", this._onPointerEnter);
        this.listen("pointerLeave", this._onPointerLeave);
        this.listen("tryFocus", this._onTryFocus);
        this.listen("blur", this._onBlur);
        if (this.onPointerDown) this.listen("pointerDown", this._onPointerDown);
        if (this.onPointerUp)this.listen("pointerUp", this._onPointerUp);
        if (this.onKeyDown) this.listen("keyDown", this.onKeyDown);
        if (this.onKeyUp) this.listen("keyUp", this.onKeyUp);
        this.future(0).dropoutTick();
    }

    get isMultiuser() { return this._multiuser || true; }
    get isHovered() { return this.hovered.size};
    get isFocused() { return this.focused.size};

    dropoutTick() {
        const am = this.service("ActorManager");
        const testHovered = new Set(this.hovered);
        const testFocused = new Set(this.focused);
        testHovered.forEach(id => {
            if (!am.has(id)) this.hovered.delete(id);
        })
        testFocused.forEach(id => {
            if (!am.has(id)) this.focused.delete(id);
        })
        if (!this.doomed) this.future(1000).dropoutTick();
    }

    _onPointerEnter(pointerId) {
        this.hovered.add(pointerId)
        this.onPointerEnter(pointerId);
    }

    _onPointerLeave(pointerId) {
        this.hovered.delete(pointerId)
        this.onPointerLeave(pointerId);
    }

    _onTryFocus(pointerId) {
        if (this.focused.has(pointerId)) return;
        if (!this.isMultiuser && this.focused.size > 0) {
            this.say("focusFailure", pointerId);
        } else {
            this.focused.add(pointerId)
            this.say("focusSuccess", pointerId)
            this.onFocus(pointerId);
        }
    }

    _onBlur(pointerId) {
        this.focused.delete(pointerId)
        this.onBlur(pointerId);
    }

    _onPointerDown(pe) {
        if (!this.focused.has(pe.pointerId)) return;
        this.onPointerDown(pe);
    }

    _onPointerUp(pe) {
        if (!this.focused.has(pe.pointerId)) return;
        this.onPointerUp(pe);
    }

    onPointerEnter(pointerId) {}
    onPointerLeave(pointerId) {}
    onFocus(pointerId) {}
    onBlur(pointerId) {}

    // onPointerDown(pe) {}
    // onPointerUp(pe) {}
    // onKeyDown(e) {}
    // onKeyUp(e) {}

}
RegisterMixin(AM_PointerTarget);

//------------------------------------------------------------------------------------------
//-- PM_PointerTarget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to a pawn to have it be targeted by PM_Pointer

export const PM_PointerTarget = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        if (this.onPointerDown) this.listen("pointerDown", this.onPointerDown);
        if (this.onPointerUp) this.listen("pointerUp", this.onPointerUp);
        // if (this.onPointerOver) this.listen("pointerOver", this.onPointerOver);
        if (this.onPointerMove) this.listen("pointerMove", this.onPointerMove);
        if (this.onPointerEnter) this.listen("pointerEnter", this.onPointerEnter);
        if (this.onPointerLeave) this.listen("pointerLeave", this.onPointerLeave);
        if (this.onPointerWheel) this.listen("pointerWheel", this.onPointerWheel);
        if (this.onPointerDoubleDown) this.listen("pointerDoubleDown", this.onPointerDoubleDown);
        if (this.onFocus) this.listen("focusSuccess", this.onFocus);
        if (this.onBlur) this.listen("blur", this.onBlur);
        if (this.onKeyDown) this.listen("keyDown", this.onKeyDown);
        if (this.onKeyUp) this.listen("keyUp", this.onKeyUp);
        this.listen("focusFailure", this._onFocusFailure);
    }

    destroy() {
        super.destroy();

        // const hoverEnd = new Set(this.actor.hovered);
        // hoverEnd.forEach( pointerId => {
        //     const pointerPawn = GetPawn(pointerId);
        //     if (pointerPawn) pointerPawn.hoverPawn = null;
        // });

        // const focusEnd = new Set(this.actor.focused);
        // focusEnd.forEach( pointerId => {
        //     const pointerPawn = GetPawn(pointerId);
        //     if (pointerPawn) pointerPawn.focusPawn = null;
        // });
    }

    get isMultiuser() { return this.actor.isMultiuser; }
    get isHovered() { return this.actor.isHovered; }
    get isFocused() { return this.actor.isFocused; }

    _onFocusFailure(pointerId) {
        const pointerPawn = GetPawn(pointerId);
        if (pointerPawn) pointerPawn.focusPawn = null;
        if (this.onFocusFailure) this.onFocusFailure(pointerId)
    }

    // onPointerEnter(pointerId) {}
    // onPointerLeave(pointerId) {}
    // onFocus(pointerId) {}
    // onFocusFailure(pointerId) {}
    // onBlur(pointerId) {}

    // onPointerDown(pe) {}
    // onPointerUp(pe) {}
    // onPointerMove(pe) {}
    // onPointerWheel(e) {}
    // onPointerDoubleDown(pe) {}
    // onKeyDown(e) {}
    // onKeyUp(e) {}

}

//------------------------------------------------------------------------------------------
//-- PM_Pointer ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Add to an avatar to allow it to use card pointer events.
// Requires the ThreeCamera raycaster.

export const PM_Pointer = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        if (this.isMyPlayerPawn) {

            this.focusTime = this.now();
            this.idleTimeout = 5000;

            this.future(0).focusTick();

            if (this.service("UIManager")) {
                this.subscribe("ui", "pointerDown", this.doPointerDown);
                this.subscribe("ui", "pointerUp", this.doPointerUp);
                this.subscribe("ui", "pointerMove", this.doPointerMove);
                this.subscribe("ui", "wheel", this.doPointerWheel);
                this.subscribe("ui", "doubleDown", this.doPointerDoubleDown);
            }
            else {
                this.subscribe("input", "pointerDown", this.doPointerDown);
                this.subscribe("input", "pointerUp", this.doPointerUp);
                this.subscribe("input", "pointerMove", this.doPointerMove);
                this.subscribe("input", "wheel", this.doPointerWheel);
                this.subscribe("input", "doubleDown", this.doPointerDoubleDown);
            }

            this.subscribe("input", "keyDown", this.doKeyDown);
            this.subscribe("input", "keyUp", this.doKeyUp);
        }
    }

    destroy() {
        super.destroy();
        if (this.hoverPawn) this.hoverPawn.say("pointerLeave", this.actor.id);
        if (this.focusPawn) this.focusPawn.say("blur", this.actor.id);
    }

    focusTick() {
        if (this.focusPawn && this.now() > this.focusTime + this.IdleTimeout) this.focusPawn.say("blur", this.actor.id);
        if (!this.doomed) this.future(1000).focusTick();
    }

    doPointerDown(e) {
        this.focusTime = this.now();
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y]);

        if (e.button === 0) {
            this.isPointerDown = true;
            if (this.focusPawn !== rc.pawn) {
                if (this.focusPawn) this.focusPawn.say("blur", this.actor.id);
                this.focusPawn = rc.pawn;
                if (this.focusPawn) this.focusPawn.say("tryFocus", this.actor.id);
            }
        }

        if (this.focusPawn) this.focusPawn.say("pointerDown", this.pointerEvent(rc));

    };

    doPointerUp(e) {
        this.focusTime = this.now();
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y]);

        if (this.focusPawn) this.focusPawn.say("pointerUp", this.pointerEvent(rc));
        this.isPointerDown = false;
        // this.focusPawn = null;
    };

    doPointerMove(e) {
        this.focusTimeout = this.now();
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y]);
        if (this.hoverPawn !== rc.pawn) {
            if (this.hoverPawn) this.hoverPawn.say("pointerLeave", this.actor.id)
            this.hoverPawn = rc.pawn
            if (this.hoverPawn) rc.pawn.say("pointerEnter", this.actor.id)
        }

        if (this.isPointerDown && this.focusPawn) this.focusPawn.say("pointerMove", this.pointerEvent(rc));
    }

    doPointerWheel(e) {
        if (this.focusPawn) this.focusPawn.say("pointerWheel", e);
    }

    doPointerDoubleDown(e) {
        this.focusTimeout = this.now();
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y]);
        if (this.focusPawn) this.focusPawn.say("pointerDoubleDown", this.pointerEvent(rc));
    }

    doKeyDown(e) {
        this.focusTime = this.now();
        if (this.focusPawn) this.focusPawn.say("keyDown", e);
    }

    doKeyUp(e) {
        this.focusTime = this.now();
        if (this.focusPawn) this.focusPawn.say("keyUp", e);
    }

    pointerEvent(rc) {
        const pe = {pointerId: this.actor.id}
        if (rc.pawn) {
            pe.targetId = rc.pawn.actor.id,
            pe.xyz = rc.xyz,
            pe.uv = rc.uv;
            pe.normal = rc.normal
        }
        return pe;
    }

}

// //------------------------------------------------------------------------------------------
// //-- PM_ThreePointerTarget  ----------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export const PM_ThreePointerTarget = superclass => class extends PM_PointerTarget(superclass) {
//     constructor(...args) {
//         super(...args)
//         const render = this.service("ThreeRenderManager");
//     }

//     destroy() {
//         super.destroy();
//         const render = this.service("ThreeRenderManager");
//         if (!render.layers.pointer) return;
//         const i = render.layers.pointer.indexOf(this.renderObject);
//         if (i === -1) return;
//         render.layers.pointer.splice(i,1);
//     }

//     // onSetRenderObject(renderObject) {
//     //     if (super.onSetRenderObject) super.onSetRenderObject(renderObject)
//     //     const render = this.service("ThreeRenderManager");
//     //     render.layers.pointer.push(renderObject)
//     // }
// }


// export const PM_LayerTarget = superclass => class extends superclass {
//     constructor(...args) {
//         super(...args);
//      }

//     destroy() {
//         super.destroy();
//         const render = this.service("ThreeRenderManager");

//         if(this.layers)
//         this.layers.forEach( layer => {
//             if (render.layers[layer]){
//                 const i = render.layers[layer].indexOf(this.renderObject);
//                 if(i>=0) render.layers[layer].splice(i,1);
//             }
//         });
//     }

//     // onSetRenderObject(renderObject) {
//     //     if (super.onSetRenderObject) super.onSetRenderObject(renderObject);
//     //     const render = this.service("ThreeRenderManager");
//     //     if(this.layers)
//     //     this.layers.forEach( layer =>{
//     //         if(!render.layers[layer])render.layers[layer]=[];
//     //         render.layers[layer].push(renderObject);
//     //     })
//     // }
// }

//------------------------------------------------------------------------------------------
//-- WidgetActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class WidgetActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget) {
//     get pawn() { return WidgetPawn; }

//     get size() { return this._size || [100,100];}
//     get anchor() { return this._anchor || [0,0];}
//     get pivot() { return this._pivot || [0,0];}
//     get autoSize() { return this._autoSize || [0,0];}
//     get isVisible() { return this._visible === undefined || this._visible;} // Default to true
//     get color() { return this._color || [0,0,0];}


// }
// WidgetActor.register('WidgetActor');


// //------------------------------------------------------------------------------------------
// //-- WidgetPawn ---------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class WidgetPawn extends mix(Pawn).with(PM_Predictive, PM_ThreeVisible, PM_ThreePointerTarget) {

//     constructor(...args) {
//         super(... args);
//     }

//     get size() { return this.actor.size; }
//     get anchor() { return this.actor.anchor }
//     get pivot() { return this.actor.pivot }
//     get autoSize() { return this.actor.autoSize }
//     get isVisible() { return this.actor.isVisible} // Default to true
//     get color() { return this.actor.color }

// }


/*

//------------------------------------------------------------------------------------------
//-- CardActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget) {

    get pawn() { return CardPawn; }

}
CardActor.register('CardActor');

//------------------------------------------------------------------------------------------
//-- CardPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CardPawn extends mix(Pawn).with(PM_Predictive, PM_PointerTarget) {
}
*/
