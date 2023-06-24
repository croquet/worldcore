import {  AccountManager, ModelRoot, Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";


//------------------------------------------------------------------------------------------
// -- Population ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Population extends Actor {

    get account() {return this._account}
    get type() {return this._type}
    get size() {return this._size || 1}

    init(options) {
        super.init(options);
        this.count = 0;
    }

    get population() {return this.count * this.size}

    buy(n) {
        this.count += n;
    }

    tick() {
        console.log(this.type + " tick");
        const food = this.account.resources.get("Food");
        food.count+=this.population;
    }

}
Population.register('Population');

//------------------------------------------------------------------------------------------
// -- Lackey -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Lackey extends Population {

    get foodCost() {return this.count * 1.5}
    get type() {return "Lackey"}

}
Lackey.register('Lackey');



//------------------------------------------------------------------------------------------
// -- Account ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAccount extends Account {

    get population() {
        let sum = 0;
        this.domain.forEach(p => {sum += p.population});
        return sum;
    }

    init(options) {
        super.init(options);
        console.log("new account");
        this.nickname = Nickname();
        this.mood = "happy";
        this.resources = new Map();
        this.domain = new Map();
        this.resources.set("Wood", {count: 0});
        this.resources.set("Iron", {count: 0});
        this.resources.set("Stone",{count: 0});
        this.resources.set("Food", {count: 0});

        this.domain.set("Lackeys", Lackey.create({account: this}));
        // this.domain.set("Huts", Population.create({type: "Huts"}));
        // this.domain.set("Villages", Population.create({type: "Villages"}));
        // this.domain.set("Towns", Population.create({type: "Towns"}));

        this.listen("clickResource", this.onClick);
        this.listen("buyPopulation", this.onBuyPopulation);

        console.log(this.population);

        this.future(1000).tick();
    }

    tick() {
        console.log(this.accountId + " tick");
        this.domain.forEach( p => p.tick());
        this.say("changed");
        this.future(1000).tick();
    }

    onClick(type) {
        const resource = this.resources.get(type);
        resource.count++;
        this.say("changed");
    }

    onBuyPopulation(type) {
        console.log(type);
        const pop = this.domain.get(type);
        if (pop) pop.buy(1);
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
        console.log("Start root model!!");
    }

}
MyModelRoot.register("MyModelRoot");
