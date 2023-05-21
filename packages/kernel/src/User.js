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

    get defaultUser() {return User}

    init() {
        super.init('UserManager');
        this.userNumber = 0;
        this.users = new Map();
        this.subscribe(this.sessionId, "view-join", this.onJoin);
        this.subscribe(this.sessionId, "view-exit", this.onExit);
    }

    user(viewId) { return this.users.get(viewId) }

    createUser(options) {
        return this.defaultUser.create(options);
    }

    destroyUser(user) {
        user.destroy();
    }

    onJoin(viewId) {
        if (this.users.has(viewId)) console.warn("UserManager received duplicate view-join for viewId " + viewId);
        const user = this.createUser({userId: viewId, userNumber: this.userNumber});
        this.userNumber++;
        this.users.set(viewId, user);
        this.publish("UserManager", "create", user);
    }

    onExit(viewId) {
        const user = this.user(viewId);
        if (!user) return;
        this.destroyUser(user);
        this.users.delete(viewId);
        this.publish("UserManager", "destroy", viewId);
    }

    get userCount() {
        return this.users.size;
    }

}
UserManager.register("UserManager");


//------------------------------------------------------------------------------------------
//-- AM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export const AM_Avatar = superclass => class extends superclass {

    get driver() { return this._driver} // The viewId of the user controlling this avatar.

};
RegisterMixin(AM_Avatar);

//------------------------------------------------------------------------------------------
//-- PM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Way to turn on view smoothing temporarily.

export const PM_Avatar = superclass => class extends superclass {

    constructor(actor) {
        super(actor);
        this.onDriverSet();
        this.listenOnce("driverSet", this.onDriverSet);
    }

    get isMyAvatar() {
        return this.actor.driver === this.viewId;
    }

    onDriverSet() {
        if (this.isMyAvatar) {
            this.driving = true;
            this.drive();
        } else {
            this.driving = false;
            this.park();
        }
    }

    park() {}
    drive() {}

};



