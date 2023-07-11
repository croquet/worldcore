import { BigNum } from "./BigNum";

export class Baskets {

    constructor() {
        this.name = "Baskets";
        this.hint = "Doubles food production";
    }

    get cost() {
        const wood = new BigNum(100);
        return {wood};
    }

    apply(account) {
        console.log("baskets");
        const food = account.resources.get("food");
        food.multiplier *= 2;
        // account.calculateProduction();
        // console.log(wood.multiplier);
        // console.log(wood.perSecond.text);
        account.say("changed");
    }
}