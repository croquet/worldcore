import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2, viewRoot, CanvasWidget2, Pawn} from "@croquet/worldcore";

import { BigNum } from "./BigNum";

function Name(key) {
    switch (key) {
        default: return "Resource";
        case "food": return "Food";
        case "wood": return "Wood";
        case "stone": return "Stone";
        case "iron": return "Iron";
        case "gold": return "Gold";
    }
}

//------------------------------------------------------------------------------------------
//-- GameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GameWidget extends Widget2 {

    get account() {return this._account}

    build() {
        console.log("Game Widget");
        const account = this.account;

        this.bg = new CanvasWidget2({account, parent: this, color: [0,1,1], autoSize: [1,1]});
        this.domain = new DomainPanel({account, parent: this.bg, translation:[0,0], size: [200, 100]});
        this.population = new PopulationPanel({account, parent: this.bg, translation: [0,105], size:[200, 100]});

        this.food = new ResourceWidget({account, parent: this.bg, translation:[240,0], size: [150, 150], key: "food"});
        this.wood = new ResourceWidget({account, parent: this.bg, translation:[440,0], size: [150, 150], key: "wood"});
        this.stone = new ResourceWidget({account, parent: this.bg, translation:[640,0], size: [150, 150], key: "stone"});
        this.iron = new ResourceWidget({account, parent: this.bg, translation:[840,0], size: [150, 150], key: "iron"});


        this.tech = new TechPanel({account, parent: this.bg, translation:[300,-500], anchor: [0,1], pivot: [0,1], size: [200, 100]});

        this.subscribe(this.account.id, {event: "changed", handling: "oncePerFrame"}, this.tally);
        this.subscribe(this.account.id, {event: "techChanged", handling: "oncePerFrame"}, this.techChanged);
    }

    tally() {
        // this.domain.tally();
        // this.population.tally();
        // this.tech.tally();

        // this.food.tally();
        // this.wood.tally();
        // this.stone.tally();
        // this.iron.tally();
    }

    techChanged() {
        this.tech.build();
    }

}

//------------------------------------------------------------------------------------------
//-- PriceWidget ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PriceWidget extends VerticalWidget2 {

    get account() {return this._account}
    get price() {return this._price|| {stone: new BigNum(1), wood:new BigNum(1)}}

    build() {
        this.destroyChildren();
        this.lines = {};
        for (const key in this.price) {
            const amount = this.price[key];
            const resource = this.account.resources.get(key);
            const text = Name(key) + ": " + amount.text;
            this.lines[key] = new TextWidget2({parent: this, height:20, color: [1,1,1], point: 12, style: "italic", alignX: "left", text});
        }
        this.tally();
        this.subscribe(this.account.id, {event: "changed", handling: "oncePerFrame"}, this.tally);
    }

    priceSet() {
        this.build();
    }

    tally() {
        for (const key in this.price) {
            const amount = this.price[key];
            const resource = this.account.resources.get(key);
            const textColor = amount.greaterThan(resource.count) ? [1,0,0] : [30/256,132/256,73/256];
            this.lines[key].set({textColor});
        }

    }

}

//------------------------------------------------------------------------------------------
//-- DomainPanel --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class DomainPanel extends VerticalWidget2 {

    get account() {return this._account}

    build() {
        const account = this.account;
        const title = account.nickname + "'s\ndomain";
        this.title = new TextWidget2({parent: this, color: [1,1,1], textColor: [0,0,0], point: 12, height:50, noWrap: true, text: title});
        this.population = new TextWidget2({parent: this, color: [1,1,1], textColor: [0,0,0], point: 12, height:50, noWrap: true});

        this.tally();
    }

    tally() {
        const account = this.account;
        const pop = account.population;
        const citizens = pop +" "+ account.mood + ((pop>1)? " followers":" follower");
        const text = "Population:\n" + ((pop>0) ? citizens : account.nickname);
        this.population.set({text});
    }

    update(time,delta) {
        super.update(time,delta);
        this.tally();
    }

}

//------------------------------------------------------------------------------------------
//-- PopulationPanel -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopulationPanel extends VerticalWidget2 {

    get account() {return this._account}

    build() {
        const account = this.account;
        this.destroyChildren();
        this.set({margin: 5});
        this.lackey = new PopulationWidget({account, key: "lackey", parent: this, height:90});
        this.hut = new PopulationWidget({account, key: "hut", parent: this, height:90});
        // this.tally();
    }

    // tally() {
    //     this.lackey.tally();
    //     this.hut.tally();
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
        const text = pop.name +": " + pop.count;
        this.label.set({text});
    }

    update(time,delta) {
        super.update(time,delta);
        this.tally();
    }

}

//------------------------------------------------------------------------------------------
//-- PopulationWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopulationWidget extends VerticalWidget2 {

    get account() {return this._account}
    get key() {return this._key}

    build() {
        const account = this.account;
        const pop = this.account.domain.get(this.key);
        this.button = new PopulationButton({account, key: this.key, parent: this, height:50});
        this.price = new PriceWidget({account, parent:this, price: pop.price});
    }

    tally() {
        const pop = this.account.domain.get(this.key);
        this.price.set({price: pop.price});
        this.button.tally();
        // this.price.build();
    }

}

//------------------------------------------------------------------------------------------
//-- ResourceWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ResourceWidget extends VerticalWidget2 {

    get key() { return this._key}
    get account() {return this._account}

    build() {
        const account = this.account;
        this.set({margin: 5});
        this.button = new ButtonWidget2({parent: this, height:50});
        this.button.label.set({text: Name(this.key)});
        this.button.onClick = () => {
            this.publish(this.account.id, "clickResource", this.key);
        };

        this.stats = new TextWidget2({account, parent: this, height: 20, point: 12, color: [1,1,1], textColor: [0,0,0], text:"1.234 million per second" });

        this.amount = new TextWidget2({account, parent: this, point:12, text: 0, color: [1,1,1], textColor: [0,0,0]});

        this.tally();
    }

    tally() {
        const resource = this.account.resources.get(this.key);
        const count = resource.count.text;
        const stats = resource.perSecond.text + " per second";
        this.stats.set({text: stats});
        this.amount.set({text: count});
    }

    update(time,delta) {
        super.update(time,delta);
        this.tally();
    }

}

//------------------------------------------------------------------------------------------
//-- TechPanel -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TechPanel extends VerticalWidget2 {

    get account() {return this._account}

    build() {
        console.log("Tech panel build");
        this.set({margin: 5});
        this.destroyChildren();
        this.upgrades = [];
        new TextWidget2({parent: this, height: 50, color: [1,1,1], testColor: [0,0,0], text: "Technology"});
        const account = this.account;
        account.upgrades.forEach(key => {
            this.upgrades.push(new TechWidget({account, key, parent: this, height: 90}));
        });
    }

    tally() {
        this.upgrades.forEach(w => w.tally());
    }

}

//------------------------------------------------------------------------------------------
//-- TechWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TechWidget extends VerticalWidget2 {

    get key() { return this._key}
    get account() {return this._account}

    build() {
        const account = this.account;
        const price = account.techPrice(this.key);
        const hint = account.techHint(this.key);
        this.button = new ButtonWidget2({parent: this, height: 50, point: 12, color: [1,1,1], textColor: [0,0,0]});
        this.button.label.destroy();
        this.button.label = new VerticalWidget2({parent: this.button.frame, autoSize: [1,1], border: [5, 5, 5, 5],});
        this.button.onClick = () => this.publish(account.id, "buyTech", this.key);

        this.title = new TextWidget2({ parent: this.button.label, style: "bold", color: [1,1,1], point: 16, text:  this.key });
        this.hint = new TextWidget2({parent: this.button.label, height: 20, point: 10, color: [1,1,1], textColor: [0,0,0], text: hint });
        this.price = new PriceWidget({parent: this, account, height:20, price});
    }

    tally() {
        this.price.build();
    }

}

//-------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function randomString() { return Math.floor(Math.random() * 36**10).toString(36) }

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, HUD];
    }

    onStart() {
        // this.subscribe("input", "xDown", this.test);
        // this.subscribe("input", "zDown", this.test2);

        this.subscribe("AccountManager", "create", this.spawnUI);

        this.accountId = localStorage.getItem("wc.idle.accountId");
        // this.accountId = null;

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
