import {  AccountManager, ModelRoot, Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";
import { BigNum } from "./BigNum";
import { Resource } from "./Resource";
import { Lackey, Hut } from "./Population";

//------------------------------------------------------------------------------------------
// -- Account ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAccount extends Account {

    static types() {
        return {
            "BigNum": BigNum,
            "Resource": Resource,
            "Lackey": Lackey,
            "Hut": Hut
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

        this.resources = new Map();
        this.resources.set("food", new Resource());
        this.resources.set("wood", new Resource());
        this.resources.set("stone", new Resource());
        this.resources.set("iron", new Resource());

        this.domain = new Map();
        this.domain.set("lackey",  new Lackey());
        this.domain.set("hut",  new Hut());

        this.upgrades = new Set();
        this.upgrades.add("Baskets");
        this.upgrades.add("Axes");
        this.upgrades.add("Mining");


        this.listen("clickResource", this.onClick);
        this.listen("buyPopulation", this.onBuyPopulation);
        this.listen("buyTech", this.onBuyTech);
        // this.subscribe("input", "tDown", this.tech);

        this.future(100).tick();
    }

    tick() {
        this.resources.forEach(resource => resource.produce());

        this.say("changed");
        this.future(100).tick();
    }

    onClick(key) {
        this.resources.get(key).count.increment(new BigNum(1));
        this.say("changed");
    }

    spend(amount) {
        for (const key in amount) {
            console.log(key + ": " + amount[key].text);
            this.resources.get(key).count.decrement(amount[key]);
        }
    }

    canAfford(amount) {
        for (const key in amount) {
            if (amount[key].greaterThan(this.resources.get(key).count)) return false;
        }
        return true;
    }

    onBuyPopulation(key) {
        console.log("buy " + key);
        const pop = this.domain.get(key);
        if (!pop) return;

        const price = pop.price;
            if (!this.canAfford(price)) {
                console.log("Too much!"); return;
            }

        this.spend(price);
        pop.count += 1;

        this.calculateProduction();
        this.say("changed");
    }

    calculateProduction() {
        this.resources.forEach(resource => resource.production = new BigNum());
        this.domain.forEach(pop => {
            const prod = pop.production;
            for (const key in pop.production) {
                const resource = this.resources.get(key);
                if (resource) resource.production.increment(prod[key]);
            }
        });
    }

    techPrice(tech) {
        switch (tech) {
            default: return {};
            case "Baskets": return {wood: new  BigNum(100)};
            case "Axes": return {wood: new  BigNum(10), stone: new  BigNum(10)};
            case "Mining": return {stone: new  BigNum(100)};
        }
    }

    techHint(tech) {
        switch (tech) {
            default: return "None";
            case "Baskets": return "2x food production";
            case "Axes": return "2x wood production";
            case "Mining": return "Unlock Iron";
        }
    }

    onBuyTech(tech) {
        console.log("buy " + tech);
        if (!this.upgrades.has(tech)) return;

        const price = this.techPrice(tech);
            if (!this.canAfford(price)) {
                console.log("Too much!"); return;
            }

        this.spend(price);

        switch (tech) {
            default: break;
            case "Baskets":
                this.resources.get("food").multiplier *= 2;
                break;
            case "Axes":
                this.resources.get("wood").multiplier *= 2;
                break;
            case "Mining":
                console.log("Iron unlocked");
                break;
        }
        this.calculateProduction();
        this.upgrades.delete(tech);
        this.say("changed");
        this.say("techChanged");
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
        console.log("Start root model!!!!");
    }

}
MyModelRoot.register("MyModelRoot");
