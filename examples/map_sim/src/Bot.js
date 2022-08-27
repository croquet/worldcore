import { Actor, Pawn, mix, PM_ThreeVisible, THREE, AM_Smoothed, PM_Smoothed, PM_Widget3, BoxWidget3, FocusWidget3, viewRoot,  } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BotActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return BotPawn}

}
BotActor.register('BotActor');

//------------------------------------------------------------------------------------------
//-- BotPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class BotPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Widget3) {
    constructor(...args) {
        super(...args);

        this.focus = new FocusWidget3({parent:this.rootWidget, name:"bot"});
        this.widget = new BoxWidget3({parent:this.focus, collidable: true, size:[1,2], thick: 1, translation: [0,1,0], color: [0.5, 0.25, 0.1]});
        this.widget.mesh.castShadow = true;

        this.focus.onFocus = () => { viewRoot.hiliteMesh(this.widget.mesh) };
        this.focus.onBlur = () => { viewRoot.hiliteMesh(null) };


        this.subscribe("input", "bDown", this.ttt)
    }

    ttt() {
        console.log("b")
        viewRoot.hiliteMesh(this.widget.mesh);
    }

}