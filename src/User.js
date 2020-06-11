import { Model } from "@croquet/croquet";
import { NamedView } from "./NamedView";

//------------------------------------------------------------------------------------------
//-- UserListBase --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of users connected to the session. You should create your own derived
// UserList class from this and overload the createUser method to create your User.

export class UserListBase extends Model {

    init() {
        if (this.constructor === UserListBase) throw new Error("Attempted to instantiate the abstract base class UserListBase insteand of a derived UserList class.");
        super.init();
        this.beWellKnownAs('UserList');
        this.users = new Map();
        this.subscribe(this.sessionId, "view-join", this.join);
        this.subscribe(this.sessionId, "view-exit", this.exit);
    }

    join(id) {
        const user = this.createUser(id);
        this.users.set(id, user);
        this.subscribe(id, "changed", this.changed);
        this.listChanged();
    }

    exit(id) {
        this.users.get(id).destroy();
        this.users.delete(id);
        this.unsubscribe(id, "changed");
        this.listChanged();
    }

    get count() {
        return this.users.size;
    }

    createUser(id) {
        return UserBase.create(id);
    }

    listChanged() {
        this.publish("userList", "listChanged");
        this.publish("userList", "changed");
    }

    changed() {
        this.publish("userList", "changed");
    }

}
UserListBase.register("UserListBase");

//------------------------------------------------------------------------------------------
//-- UserBase ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains information for one user in the current session. You should create your own derived
// User class from this, and extend it to listen for set messages coming from ThisUser. Call changed
// to let ThisUser know a state variable has changed.

export class UserBase extends Model {
    init(id) {
        if (this.constructor === UserBase) throw new Error("Attempted to instantiate the abstract base class UserBase insteand of a derived User class. Does your UserList class not have the right createUser method?");
        super.init();
        this.userID = id;
        this.say("joined", this);
    }

    destroy() {
        this.say("exited");
        super.destroy();
    }

    say(event, data) {
        this.publish(this.userID, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.userID, event, callback);
    }

    changed(state) {
        this.say("changed", state);
    }
}
UserBase.register("UserBase");

//------------------------------------------------------------------------------------------
//-- ThisUserBase --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// View-side interface to the entry in the user list associated with the local session instance.
// You should create your own derived ThisUser class from this, and extend it with setter methods
// to broadcast state changes to the associated User.

export class ThisUserBase extends NamedView {
    constructor() {
        super("ThisUser");
        if (this.constructor === UserBase) throw new Error("Attempted to instantiate the abstract base class ThisUserBase insteand of a derived ThisUser class.");
        this.verifications = new Map();
        const userList = this.wellKnownModel("UserList");
        userList.users.forEach((value, key) => { if (key === this.viewId) this.join(value); });
        if (!this.user) this.subscribe(this.viewId, "joined", this.join);
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


