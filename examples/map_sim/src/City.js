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

        this.set({translation: [this.node[0], 0, this.node[1]]})

    }

    get map() {
        return this._map || [0];
    }

    get node() {
        return [ 510 * this.map[0] /70.83, 315 * this.map[1]/43.75 ]
    }

    get title() { return this._title}
    get sells() { return this._sells}
    get buys() { return this._buys}


}
CityActor.register('CityActor');

//------------------------------------------------------------------------------------------
//-- CityPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class CityPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Widget3) {
    constructor(...args) {
        super(...args);

        this.focus = new FocusWidget3({parent:this.rootWidget, name:"city"});
        this.widget = new BoxWidget3({parent:this.focus, collidable: true, size:[5,1], thick: 5, translation: [0,0.5,0], color: [0.7, 0, 0]});
        this.nameplate = new TextWidget3({
            parent: this.focus, size: [40,20],
            translation: [0,10,0],
            resolution: 10,
            alpha: true,
            point: 24,
            // collidable: true,
            color: [0,0,0],
            bgColor: [0, 0, 0],
            fgColor: [1, 1, 1],
            billboard: true,
            text: this.actor.title});

        this.focus.onFocus = () => { viewRoot.hiliteMesh(this.widget.mesh) };
        this.focus.onBlur = () => { viewRoot.hiliteMesh(null) };

    }


}