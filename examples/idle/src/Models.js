import {  AccountManager, ModelRoot,  Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";


//------------------------------------------------------------------------------------------
// -- Account ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAccount extends Account {

    // get pawn() {return "MyPawn"}

    init(options) {
        super.init(options);
        console.log("new account");
        this.nickname = Nickname();
        this.mood = "Happy";
        this.population = 0;
        this.resources = new Map();
        this.resources.set("Wood", {count: 0});
        this.resources.set("Iron", {count: 0});
        this.resources.set("Stone",{count: 0});
        this.resources.set("Food", {count: 0});
        this.listen("clickResource", this.onClick);
    }

    onClick(rrr) {
        // console.log("onClick");
        const resource = this.resources.get(rrr);
        resource.count++;
        this.say("changed");
    }

}
MyAccount.register('MyAccount');

class MyAccountManager extends AccountManager {

    get defaultAccount() {return MyAccount}

}
MyAccountManager.register('MyAccountManager');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyAccountManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");
    }

}
MyModelRoot.register("MyModelRoot");
