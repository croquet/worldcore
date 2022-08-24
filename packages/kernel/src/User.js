import { Actor } from "./Actor";
import { ModelService } from "./Root";

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


    init(options) {
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



