import { Actor } from "./Actor";
import { RegisterMixin } from "./Mixins";
import { ModelService} from "./Root";


// ------------------------------------------------------------------------------------------
// -- User ----------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------

export class User extends Actor {
    get userId() { return this._userId }
}
User.register('User');

//------------------------------------------------------------------------------------------
//-- UserManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of users connected to the session.

export class UserManager extends ModelService {

    get defaultUser() {return User;}

    init() {
        super.init('UserManager');
        this.users = new Map();
        this.subscribe(this.sessionId, "view-join", this.onJoin);
        this.subscribe(this.sessionId, "view-exit", this.onExit);
    }

    user(viewId) { return this.users.get(viewId) }

    onJoin(viewId) {
        if (this.users.has(viewId)) console.warn("PlayerManager received duplicate view-join for viewId " + viewId);
        const user = this.defaultUser.create({userId: viewId});
        this.users.set(viewId, user);
        this.publish("userManager", "create", user);
    }

    onExit(viewId) {
        const user = this.user(viewId);
        if (!user) return;
        user.destroy();
        this.users.delete(viewId);
        this.publish("userManager", "destroy", user);
    }

}
UserManager.register("UserManager");


//------------------------------------------------------------------------------------------
//-- AM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export const AM_Avatar = superclass => class extends superclass {

    get driver() { return this._driver} // The who that is controlling this avatar.

};
RegisterMixin(AM_Avatar);

//------------------------------------------------------------------------------------------
//-- PM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Avatar = superclass => class extends superclass {

    constructor(actor) {
        super(actor);
        this.onDriverSet();
        this.listenOnce("driverSet", this.onDriverSet);
    }

    get isMyAvatar() {
        return this.actor.driver === this.viewId;
    }

    // onDriverSet() {
    //     if (this.isMyAvatarPawn) {
    //         // this.driving = true;
    //         //sub
    //     } else {
    //         // this.driving = false;
    //         // unsub
    //     }
    // }

    // onDriverSet() {
    //     if (this.driving) this.park();
    //     if (this.isMyAvatarPawn) this.drive();
    // }

    // drive() { // Subscribe to controls
    //     this.driving = true;
    //     // this.publish(this.viewId, "avatar", true)
    // }

    // park() { // Unsubscribes from  controls
    //     this.driving = false;
    //     // this.publish(this.viewId, "avatar", false)
    // }


};



