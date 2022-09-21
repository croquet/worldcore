import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    UIManager, AM_Smoothed, PM_Smoothed, MenuWidget3, Widget3, PM_Widget3, PM_WidgetPointer, WidgetManager, ImageWidget3, CanvasWidget3, ToggleSet3, TextWidget3, SliderWidget3, User, UserManager, m4_identity, m4_rotationX, toRad, m4_scaleRotationTranslation, q_pitch, q_axisAngle, PlaneWidget3, ControlWidget3 } from "@croquet/worldcore";


import diana from "../assets/diana.jpg";
import llama from "../assets/llama.jpg";
import silk from "../assets/silk.jpg";
//------------------------------------------------------------------------------------------
//-- LevelActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MapActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return MapPawn}
}
MapActor.register('MapActor');

//------------------------------------------------------------------------------------------
//-- MapPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MapPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_Widget3) {
    constructor(...args) {
        super(...args)

        const map = new MapWidget({parent: this.rootWidget, size:[200,96.4], translation: [0,0,0], rotation: q_axisAngle([1,0,0], toRad(-90))});
    }

}

//------------------------------------------------------------------------------------------
//-- MapWidget -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MapWidget extends ControlWidget3 {
    constructor(options) {
        super(options);

        const image = new ImageWidget3({parent: this, lit: true, autoSize:[1,1], collideable: true, url: silk});
        image.mesh.receiveShadow = true;
    }

}