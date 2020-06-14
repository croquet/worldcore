import { Model } from "@croquet/croquet";
import { NamedView } from "./NamedView";

//------------------------------------------------------------------------------------------
//-- UserList --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of users connected to the session.

export class UserList extends Model {

    init() {
        super.init();
        this.beWellKnownAs('UserList');
        this.users = new Map();
        this.subscribe(this.sessionId, "view-join", this.join);
        this.subscribe(this.sessionId, "view-exit", this.exit);
    }

    join(viewId) {
        const user = UserList.userType.create(viewId);
        this.users.set(viewId, user);
        this.subscribe(viewId, "changed", this.changed);
        this.listChanged();
    }

    exit(viewId) {
        this.users.get(viewId).destroy();
        this.users.delete(viewId);
        this.unsubscribe(viewId, "changed");
        this.listChanged();
    }

    get count() {
        return this.users.size;
    }

    listChanged() {
        this.publish("userList", "listChanged");
        this.publish("userList", "changed");
    }

    changed() {
        this.publish("userList", "changed");
    }

}
UserList.register("UserList");

//------------------------------------------------------------------------------------------
//-- User ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains information for one user in the current session.  Call changed to let ThisUser
// know a state variable has changed. You should create your own derived User class with
// subscriptions to the setter messages coming from ThisUser.

export class User extends Model {
    static register(...args) {
        super.register(...args);
        UserList.userType = this;
    }

    init(viewID) {
        super.init();
        this.viewId = viewID;
        this.say("joined", this);
    }

    destroy() {
        this.say("exited");
        super.destroy();
    }

    say(event, data) {
        this.publish(this.viewId, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.viewId, event, callback);
    }

    changed(state) {
        this.say("changed", state);
    }
}
User.register("UserBase");

//------------------------------------------------------------------------------------------
//-- LocalUser ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// View-side interface to the entry in the user list associated with the local session instance.
// You should create your own derived ThisUser class from this, and extend it with setter methods
// to broadcast state changes to the associated User.

export class LocalUser extends NamedView {
    constructor() {
        super("LocalUser");
        const userList = this.wellKnownModel("UserList");
        const mine = userList.users.get(this.viewId);
        if (mine) {
            this.join(mine);
        } else {
            this.subscribe(this.viewId, "joined", this.join);
        }
    }

    join(user) {
        this.user = user;
        this.unsubscribe(this.viewId, "joined");
    }

    say(event, data) {
        this.publish(this.viewId, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.viewId, event, callback);
    }

    listenOnce(event, callback) {
        this.subscribe(this.viewId, {event, handling: "oncePerFrame"}, callback);
    }

}
