import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2, viewRoot, CanvasWidget2, Pawn} from "@croquet/worldcore";

import { BigNum } from "./BigNum";

//------------------------------------------------------------------------------------------
//-- GameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GameWidget extends Widget2 {

    get account() {return this._account}

    build() {
        console.log("Game Widget");
        const account = this.account;

        this.bg = new CanvasWidget2({account, parent: this, color: [0,1,1], autoSize: [1,1]});
        this.domain = new DomainWidget({account, parent: this.bg, translation:[0,0], size: [200, 100]});
        this.food = new ResourceWidget({account, parent: this.bg, translation:[250,0], size: [200, 150], key: "Food"});
        this.wood = new ResourceWidget({account, parent: this.bg, translation:[500,0], size: [200, 150], key: "Wood"});
        this.iron = new ResourceWidget({account, parent: this.bg, translation:[750,0], size: [200, 150], key: "Iron"});


        this.subscribe(this.account.id, {event: "changed", handling: "oncePerFrame"}, this.tally);
    }

    tally() {
        this.domain.tally();
        this.food.tally();
        this.wood.tally();
        this.iron.tally();
    }

}

//------------------------------------------------------------------------------------------
//-- ResourceWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ResourceWidget extends VerticalWidget2 {

    get key() { return this._key}
    get account() {return this._account}

    build() {
        this.button = new ButtonWidget2({parent: this, height:50});
        this.button.label.set({text: this.key});
        this.button.onClick = () => {
            this.publish(this.account.id, "clickResource", this.key);
        };

        this.amount = new TextWidget2({parent: this, text: 0, color: [1,1,1], textColor: [0,0,0]});
        this.tally();

    }

    tally() {
        const count = this.account.resources.get(this.key);
        this.amount.set({text: count.text});
    }

}

//------------------------------------------------------------------------------------------
//-- DomainWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class DomainWidget extends VerticalWidget2 {

    get account() {return this._account}

    build() {
        this.set({margin: 5});
        const account = this.account;
        const title = this.account.nickname + "'s\ndomain";
        this.title = new TextWidget2({parent: this, color: [1,1,1], textColor: [0,0,0], point: 12, height:50, noWrap: true, text: title});
        this.population = new TextWidget2({parent: this, color: [1,1,1], textColor: [0,0,0], point: 12, height:50, noWrap: true});
        this.lackeys = new PopulationWidget({account, key: "Lackeys", parent: this, height:50});

        this.tally();
    }

    tally() {
        const account = this.account;
        const pop = this.account.population;
        const citizens = pop +" "+ this.account.mood + ((pop>1)? " followers":" follower");
        const text = "Population:\n" + ((pop>0) ? citizens : this.account.nickname);
        this.population.set({text});

        this.lackeys.tally();

    }

}

//------------------------------------------------------------------------------------------
//-- PriceWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// function Resource(n) {
//     switch (n) {
//         default: return "None: ";
//         case 0: return "Food: ";
//         case 1: return "Wood: ";
//         case 2: return "Iron: ";
//         case 3: return "Stone: ";
//         case 4: return "Gold: ";
//     }
// }

class PriceWidget extends VerticalWidget2 {

    get account() {return this._account}
    get affordable() {return this._affordable}
    get price() {return this._price || [new BigNum(1), new BigNum(4000000), null, new BigNum(4), new BigNum(5)]}

    build() {
        console.log("build price");
        this.destroyChildren();
        for (let n = 0; n< this.price.length; n++) {
            const p = this.price[n];
            if (p) new TextWidget2({parent: this, height:20, color: [1,1,1], textColor: [30/256,132/256,73/256], point: 12, style: "italic", alignX: "left", text: Resource(n) + p.text});
        }


    }

    // tally() {
    //     const account = this.account;
    //     const pop = this.account.population;
    //     const citizens = pop +" "+ this.account.mood + ((pop>1)? " disciples":" disciple");
    //     const text = "Population:\n" + ((pop>0) ? citizens : this.account.nickname);
    //     this.population.set({text});

    //     this.lackeys.tally();

    // }

}

//------------------------------------------------------------------------------------------
//-- PopulationButton ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopulationButton extends ButtonWidget2 {

    get account() {return this._account}
    get key() {return this._key}

    build() {
        super.build();
        this.tally();
        this.onClick = () => {
            this.publish(this.account.id, "buyPopulation", this.key);
        };
    }

    tally() {
        const pop = this.account.domain.get(this.key);
        const text = this.key +": " + pop.count;
        this.label.set({text});
    }

}

//------------------------------------------------------------------------------------------
//-- PopulationWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopulationWidget extends VerticalWidget2 {

    get account() {return this._account}
    get key() {return this._key}

    build() {
        console.log("Build population widget");
        const account = this.account;
        this.button = new PopulationButton({account, key: this.key, parent: this, height:50});
        // this.price = new PriceWidget({parent:this});
        // this.cost = new TextWidget2({account, parent: this, height:20, color: [1,1,1], textColor: [30/256,132/256,73/256], point: 12, style: "italic", alignX: "left", text: "Food: 12"});
    }

    tally() {
            this.button.tally();
    }

}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function randomString() { return Math.floor(Math.random() * 36**10).toString(36) }

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, HUD];
    }

    onStart() {
        this.subscribe("input", "xDown", this.test);
        this.subscribe("input", "zDown", this.test2);

        this.subscribe("AccountManager", "create", this.spawnUI);

        this.accountId = localStorage.getItem("wc.idle.accountId");
        this.accountId = null;

        if (!this.accountId) {
            this.accountId = randomString();
            localStorage.setItem("wc.idle.accountId", this.accountId);
        }

        const am = this.modelService("AccountManager");
        if (!am.accounts.has(this.accountId)) this.publish("account", "create", this.accountId);

        this.spawnUI();
    }

    spawnUI() {
        console.log("test2");
        const am = this.modelService("AccountManager");

        const account = am.accounts.get(this.accountId);

        if (!account) return;

        const hud = this.service("HUD");
        this.game = new GameWidget({account, parent: hud.root, autoSize: [1,1]});
    }

    test() {
        console.log("test");
    }

    test2() {
        console.log("test2");
    }



}
