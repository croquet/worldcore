import { Pawn } from "./Pawn";
import { Actor } from "./Actor";

export class CardActor extends Actor {

    get pawn() { return CardPawn; }

}
CardActor.register('CardActor');


export class CardPawn extends Pawn {

}

export const AM_PointerTarget = superclass => class extends superclass {
    init(options) {
        super.init(options);
    }

    get multiuser() { return this._multiuser; }
    get hovered() { return this._hovered || []; }
    get focused() { return this._focused || []; }

    // onPointerDown()
    // onPointerUp

}



export const PM_PointerTarget = superclass => class extends superclass {

    constructor(...args) {
        super(...args);

    }

    pointerDown(pe) {}
    pointerUp(pe) {}
    pointerMove(pe) {}
    pointerOver(pe) {}

    pointerEnter(pe) {
        this.hover();
    }
    pointerLeave(pe) {
        this.unhover();
    }

    hover() {console.log("hover")}
    unhover() { console.log("unhover")}

    focus() { console.log("focus") }
    blur() { console.log("blur") }

}

export const PM_Pointer = superclass => class extends superclass {

    constructor(...args) {
        super(...args);

        this.hovered = null;
        this.focused = null;

        if (this.isMyPlayerPawn) {
            if (this.service("UIManager")) {
                this.subscribe("ui", "pointerDown", this.onPointerDown);
                this.subscribe("ui", "pointerUp", this.onPointerUp);
                this.subscribe("ui", "pointerMove", this.onPointerMove);
            }
            else {
                this.subscribe("input", "pointerDown", this.onPointerDown);
                this.subscribe("input", "pointerUp", this.onPointerUp);
                this.subscribe("input", "pointerMove", this.onPointerMove);
            }
        }
    }

    onPointerDown(e) {
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y]);
        rc.pointer = this;
        if(rc.pawn && rc.pawn.onPointerDown) rcPawn.onPointerDown();
    };

    onPointerUp(e) {};

    onPointerMove(e) {
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const rc = this.pointerRaycast([x,y]);
        if (this.hovered !== rc.pawn) {
            if (this.hovered) this.hovered.pointerLeave();
            this.hovered = rc.pawn;
            if (this.hovered) this.hovered.pointerEnter();
        }
    }

}