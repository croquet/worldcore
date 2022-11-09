import { RegisterMixin  } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
//-- AM_Avatar -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Avatar = superclass => class extends superclass {

    get driver() { return this._driver} // The user that is controlling this avatar.

};
RegisterMixin(AM_Avatar);


//-- Pawn ----------------------------------------------------------------------------------

export const PM_Avatar = superclass => class extends superclass {

    constructor(actor) {
        super(actor);
        this.listenOnce("driverSet", this.onDriverSet);
        this.drive();
    }

    get isMyAvatarPawn() {
        if (this.actor.driver) return this.actor.driver.userId === this.viewId;
        return false;
    }

    onDriverSet(e) {
        this.park();
        this.drive();
    }

    drive() {}
    park() {}

};
