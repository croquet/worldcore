import { Actor, Pawn, mix, AM_Predictive, PM_Predictive } from "@croquet/worldcore-kernel";
import { AM_PointerTarget, PM_ThreePointerTarget } from "./Card";
import { PM_ThreeVisible } from "@croquet/worldcore-three";

//------------------------------------------------------------------------------------------
//-- WidgetActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetActor extends mix(Actor).with(AM_Predictive, AM_PointerTarget) {

    get pawn() { return WidgetPawn; }

}
WidgetActor.register('WidgetActor');

//------------------------------------------------------------------------------------------
//-- WidgetPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WidgetPawn extends mix(Pawn).with(PM_Predictive, PM_ThreePointerTarget) {
}