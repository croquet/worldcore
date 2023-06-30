import {  AccountManager, ModelRoot, Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";
import { BigNum } from "./BigNum";

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
        const price = this.price;
        if (!this.account.canAfford(price)) {
            console.log("Too much!"); return;
        }
        this.account.spend(price);
        this.count += 1;
    }

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

    get price() {
        const base = { Food: new BigNum(15)};
        const markup = 1.15**this.count;
        base.Food.scale(markup);
        return base;
    }

    get production() {
        const base = {Food: new BigNum(5), Wood: new BigNum(1)};
        const production = this.population/20;
        base.Food.scale(production);
        base.Wood.scale(production);
        return base;
    }

    tick() {
        // console.log("Lackeys tick");
        this.account.earn(this.production);
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

        this.tech = new Map();
        const bbb = {
            name: "Baskets",
            resource: "Food",
            multiplier: 2,
            price: {Wood: new BigNum(5)}
        };

        this.domain.set("Lackeys", Lackeys.create({account: this}));

        this.listen("clickResource", this.onClick);
        this.listen("buyPopulation", this.onBuyPopulation);

        this.future(50).tick();
    }

    tick() {
        // console.log(this.accountId + " tick");
        this.domain.forEach( p => p.tick());
        this.say("changed");
        this.future(50).tick();
    }

    onClick(n) {
        this.resources.get(n).increment(new BigNum(1));
        this.say("changed");
    }

    spend(amount) {
        for (const key in amount) {
            // console.log(key + ": " + amount[key].text);
            this.resources.get(key).decrement(amount[key]);
        }
    }

    earn(amount) {
        for (const key in amount) {
            // console.log(key + ": " + amount[key].text);
            this.resources.get(key).increment(amount[key]);
        }
    }

    canAfford(amount) {
        for (const key in amount) {
            if (amount[key].greaterThan(this.resources.get(key))) return false;
        }
        return true;
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
        console.log("Start root model!");

    }

}
MyModelRoot.register("MyModelRoot");
