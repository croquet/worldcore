import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2, viewRoot, CanvasWidget2, Pawn} from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- GameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GameWidget extends Widget2 {

    get account() {return this._account}

    build() {
        console.log("Game Widget");
        const account = this.account;

        console.log(account);
        this.bg = new CanvasWidget2({account, parent: this, color: [0,1,1], autoSize: [1,1]});
        this.wood = new ResourceWidget({account, parent: this.bg, translation:[300,0], size: [200, 150], type: "Wood"});

        this.food = new ResourceWidget({account, parent: this.bg, translation:[500,0], size: [200, 150], type: "Food"});

        this.pop = new DomainWidget({account, parent: this.bg, translation:[0,0], size: [200, 100]});

        this.subscribe(this.account.id, {event: "changed", handling: "oncePerFrame"}, this.tally);
    }

    tally() {
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
        const text = count +  " sticks";
        this.amount.set({text});

    }

}

//------------------------------------------------------------------------------------------
//-- DomainWidget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class DomainWidget extends VerticalWidget2 {

    get account() {return this._account}

    build() {
        const title = this.account.nickname + "'s\ndomain";
        const population = "Population:\n" + (this.account.population ?  this.account.population +" "+ this.account.mode +" citizens" : this.account.nickname);
        this.title = new TextWidget2({parent: this, color: [1,1,1], textColor: [0,0,0], point: 12, height:50, noWrap: true, text: title});
        this.population = new TextWidget2({parent: this, color: [1,1,1], textColor: [0,0,0], point: 12, height:50, noWrap: true, text: population});
        this.workers = new PopulationWidget({key: "Workers", parent: this, height:50});
        this.huts = new PopulationWidget({key: "Huts", parent: this, height:50});
        this.villages = new PopulationWidget({key: "Villages", parent: this, height:50});
    }

}

//------------------------------------------------------------------------------------------
//-- PopulationWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopulationWidget extends ButtonWidget2 {

    get account() {return this._account}
    get key() {return this._key}

    build() {
        super.build();
        const text = this.key +": 0";
        this.label.set({text});
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
