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

    get driver() { return this._driver} // The user that is controlling this avatar.

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

    get isMyAvatarPawn() {
        if (this.actor && this.actor.driver) return this.actor.driver.userId === this.viewId;
        return false;
    }

    onDriverSet() {
        if (this.isMyAvatarPawn) {
            this.park()
            this.drive()
        }
    }

    drive() { // Subscribes to controls
        this.driving = true;
    }
    
    park() { // Unsubscribes from  controls
        this.driving = false; 
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) this.say("viewGlobalChanged"); // If you're driving update the renderer every frame
    }

};



