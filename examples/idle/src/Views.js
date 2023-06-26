import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2, viewRoot, CanvasWidget2, Pawn} from "@croquet/worldcore";

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
        this.wood = new ResourceWidget({account, parent: this.bg, translation:[300,0], size: [200, 150], type: "Wood", singular: "stick", plural: "sticks"});
        this.food = new ResourceWidget({account, parent: this.bg, translation:[500,0], size: [200, 150], type: "Food", singular: "berry", plural: "berries"});


        this.subscribe(this.account.id, {event: "changed", handling: "oncePerFrame"}, this.tally);
    }

    tally() {
        this.domain.tally();
        this.wood.tally();
        this.food.tally();
    }

}

//------------------------------------------------------------------------------------------
//-- ResourceWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ResourceWidget extends VerticalWidget2 {

    get type() { return this._type}
    get account() {return this._account}
    get singular() { return this._singular}
    get plural() { return this._plural}

    build() {
        this.button = new ButtonWidget2({parent: this, height:50});
        this.button.label.set({text: this.type});
        this.button.onClick = () => {
            this.publish(this.account.id, "clickResource", this.type);
        };

        this.amount = new TextWidget2({parent: this, text: 0, color: [1,1,1], textColor: [0,0,0]});
        this.tally();

    }

    tally() {
        const resource = this.account.resources.get(this.type);
        let count = resource.count;
        const text = count +  " " + (count===1?this.singular:this.plural);
        this.amount.set({text});

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
        this.lackeys = new PopulationWidget({account, type: "Lackeys", parent: this, height:50});
        // this.huts = new PopulationWidget({account,type: "Huts", parent: this, height:50});
        // this.villages = new PopulationWidget({account, type: "Villages", parent: this, height:50});

        this.pop = new PopWidget({account, parent: this});

        this.tally();
    }

    tally() {
        const account = this.account;
        const pop = this.account.population;
        const citizens = pop +" "+ this.account.mood + ((pop>1)? " citizens":" citizen");
        const text = "Population:\n" + ((pop>0) ? citizens : this.account.nickname);
        this.population.set({text});

        this.lackeys.tally();
        // this.huts.tally();
        // this.villages.tally();
    }

}

//------------------------------------------------------------------------------------------
//-- PopulationWidget ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopulationWidget extends ButtonWidget2 {

    get account() {return this._account}
    get type() {return this._type}

    build() {
        super.build();
        this.tally();
        this.onClick = () => {
            this.publish(this.account.id, "buyPopulation", this.type);
        };
    }

    tally() {
        const pop = this.account.domain.get(this.type);
        const text = this.type +": " + pop.count;
        this.label.set({text});
    }

}

//------------------------------------------------------------------------------------------
//-- PopWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopWidget extends VerticalWidget2 {

    get account() {return this._account}
    get type() {return this._type}

    build() {
        const account = this.account;
        this.button = new PopulationWidget({account, type: "Lackeys", parent: this, height:50});
        this.cost = new TextWidget2({account, parent: this, height:20, color: [1,1,1], textColor: [30/256,132/256,73/256], point: 12, style: "italic", alignX: "left", text: "Food: 12"});
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
