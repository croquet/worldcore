import { RegisterMixin  } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
//-- AM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Avatar = superclass => class extends superclass {

    get driverId() { return this._driverId} // The userId of the user controlling this avatar

};
RegisterMixin(AM_Avatar);


//------------------------------------------------------------------------------------------
//-- PM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Avatar = superclass => class extends superclass {

    constructor(actor) {
        super(actor);
        console.log("PM_Avatar");
        this.listenOnce("driverIdSet", this.onDriverIdSet);
        this.drive();
    }

    get isMyAvatarPawn() {
        return this.actor.driverId === this.viewId;
    }

    onDriverIdSet(e) {
        this.park();
        this.drive();
    }

    drive() {}
    park() {}

};
