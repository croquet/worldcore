import {  AccountManager, ModelRoot, Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";
import { BigNum } from "./BigNum";

//------------------------------------------------------------------------------------------
// -- Price --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Price {
     constructor() {
        this.map = new Map();
     }

     add(key, bn) {
        this.map.add(key, bn);
     }

    afford(account) {
        const out = new Map();
        this.map.forEach((value,key) => {
            const resource = account.resources.get(key);
            out.set(key, resource.greaterThan(value));
        });

        return out;
     }

}

//------------------------------------------------------------------------------------------
// -- Population ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Population extends Actor {

    get cost() {return this._cost || { Food: 5, Wood: 1}}
    get account() {return this._account}

    init(options) {
        super.init(options);
        this.count = 0;
        this.size = 1;
    }

    get population() {return this.count * this.size}

    buy() {
        this.count += 1;
    }

    // get price() {
    //     const markup = 1.15**this.count;
    //     const out = [];
    //     this.cost.forEach(c => {
    //         const p = new BigNum(c);
    //         p.scale(markup);
    //         out.push(p);
    //     });
    //     return out;
    // }

    // get affordable() {
    //     const price = this.price;
    //     for (let n = 0; n < price.length; n++) {
    //         if (price[n].greaterThan(this.account.resources[n])) return false;
    //     }
    //     return true;
    // }

    // afford(n) {
    //     if (this.price[n].greaterThan(this.account.resources[n])) return false;
    //     return true;
    // }

    tick() {}

}
Population.register('Population');

//------------------------------------------------------------------------------------------
// -- Lackeys ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Lackeys extends Population {

    init(options) {
        super.init(options);
    }

    get cost() {
        const markup = 1.15**this.count;
        return { Food: 5};
    }

    tick() {
        console.log("Lackeys tick");
        const amount = new BigNum(this.population);
        this.account.resources.get("Food").increment(amount);
    }

}
Lackeys.register('Lackeys');

//------------------------------------------------------------------------------------------
// -- Account ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAccount extends Account {

    static types() {
        return {
            "BigNum": BigNum
        };
    }

    get population() {
        let sum = 0;
        this.domain.forEach(p => {sum += p.population});
        return sum;
    }

    init(options) {
        super.init(options);
        this.nickname = Nickname();
        this.mood = "happy";
        this.domain = new Map();

        this.resources = new Map();
        this.resources.set("Food", new BigNum(0));
        this.resources.set("Wood", new BigNum(0));
        this.resources.set("Iron", new BigNum(0));

        this.domain.set("Lackeys", Lackeys.create({account: this}));

        this.listen("clickResource", this.onClick);
        this.listen("buyPopulation", this.onBuyPopulation);

        this.future(1000).tick(1000);
    }

    tick() {
        // console.log(this.accountId + " tick");
        this.domain.forEach( p => p.tick());
        this.say("changed");
        this.future(1000).tick(1000);
    }

    onClick(n) {
        this.resources.get(n).increment(new BigNum(5));
        this.say("changed");
    }

    onBuyPopulation(key) {
        console.log("buy " + key);
        const pop = this.domain.get(key);
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
        console.log("Start root model!!!");

    }

}
MyModelRoot.register("MyModelRoot");
