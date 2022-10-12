import { Actor, Pawn, mix, PM_ThreeVisible, THREE, AM_Smoothed, PM_Smoothed, PM_Widget3, BoxWidget3, FocusWidget3, viewRoot, AM_Behavioral, Behavior, v2_sub, v2_normalize, v2_scale, v2_magnitude, q_axisAngle, toRad, toDeg, SequenceBehavior, PlaneWidget3, TextWidget3, ModelService  } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
//-- CityManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CityManager extends ModelService {
    init() {
        super.init("CityManager");
        this.cities = new Map();
    }

    add(city) {
        this.cities.set(city.name, city);
    }
}
CityManager.register("CityManager")


//------------------------------------------------------------------------------------------
//-- CityActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CityActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return CityPawn}

    init(options) {
        super.init(options);
        const cm = this.service("CityManager");
        cm.add(this);

        const node = [
            510 * this.map[0] /70.83,
            315 * this.map[1]/43.75
        ]

        this.set({translation: [this.node[0], 0, this.node[1]]})

    }

    get map() {
        return this._map || [0];
    }

    get node() {
        return [ 510 * this.map[0] /70.83, 315 * this.map[1]/43.75 ]
    }


}
CityActor.register('CityActor');

//------------------------------------------------------------------------------------------
//-- CityPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class CityPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Widget3) {
    constructor(...args) {
        super(...args);

        this.focus = new FocusWidget3({parent:this.rootWidget, name:"city"});
        this.widget = new BoxWidget3({parent:this.focus, collidable: true, size:[5,1], thick: 5, translation: [0,1,0], color: [1, 0, 0]});
        // this.widget.mesh.castShadow = true;
        // this.widget.mesh.receiveShadow = true;
        this.nameplate = new TextWidget3({
            parent: this.focus, size: [30,15],
            translation: [0,10,0],
            resolution: 50,
            alpha: true,
            point: 192,
            // collidable: true,
            color: [0,0,0],
            bgColor: [0, 0, 0],
            fgColor: [1, 1, 1],
            billboard: true,
            text: this.actor.name});

        // this.focus.onFocus = () => { viewRoot.hiliteMesh(this.widget.mesh) };
        // this.focus.onBlur = () => { viewRoot.hiliteMesh(null) };

    }


}