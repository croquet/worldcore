import { Actor } from "./Actor";
import { RegisterMixin, AM_Drivable, PM_Drivable } from "./Mixins";
import { ModelService} from "./Root";


// ------------------------------------------------------------------------------------------
// -- User ----------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------

export class User extends Actor {
    get userId() { return this._userId }
    get driver() { return this._userId }
    get userNumber() { return this._userNumber }
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

export const AM_Avatar = superclass => class extends AM_Drivable(superclass) {
    // currently no extensions
};
RegisterMixin(AM_Avatar);


//------------------------------------------------------------------------------------------
//-- PM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Avatar = superclass => class extends PM_Drivable(superclass) {
    get isMyAvatar() {
        return this.isDrivenHere;
    }
};

// ------------------------------------------------------------------------------------------
// -- Account -------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------

export class Account extends Actor {
    get accountId() { return this._accountId }
}
Account.register('Account');

//------------------------------------------------------------------------------------------
//-- AccountManager ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of accounts in the session

export class AccountManager extends ModelService {

    get defaultAccount() {return Account}

    init() {
        super.init('AccountManager');
        this.accounts = new Map();
        this.subscribe("account", "create", this.onCreate);
    }

    deleteAccount(id) {
        const account = this.accounts.get(id);
        if (account) account.destroy();
        this.accounts.delete(id);
    }

    onCreate(accountId) {
        console.log("am onCreate");
        console.log(accountId);
        if (this.accounts.has(accountId)) {
            console.error("Duplicate account: "+ accountId);
            return;
        }

        console.log("new account: " + accountId);
        const account = this.defaultAccount.create({accountId});
        this.accounts.set(accountId, account);
        this.publish("AccountManager", "create", accountId);
    }

    // onLogout(id) {
    //     const account = this.accounts.get(id);
    //     if (account) account.set({owner: null});
    // }

}
AccountManager.register("AccountManager");
