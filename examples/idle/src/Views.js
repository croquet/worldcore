import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2, viewRoot, CanvasWidget2, Pawn} from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
//-- MyPawn ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPawn extends Pawn {

    constructor(actor) {
        super(actor);
        console.log("myPawn!");
        console.log(this.actor.nickname);

        const hud = this.service("HUD");
        this.game = new GameWidget({parent: hud.root, autoSize: [1,1]});
    }
}

MyPawn.register("MyPawn");

//------------------------------------------------------------------------------------------
//-- ResourceWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ResourceWidget extends VerticalWidget2 {

    get name() { return this._name}

    build() {
        this.button = new ButtonWidget2({parent: this, height:50});
        this.button.label.set({text: this.name});
        new TextWidget2({parent: this, text: "ddd", color: [1,1,1], textColor: [0,0,0]});
    }

}

//------------------------------------------------------------------------------------------
//-- PopulationWidget -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PopulationWidget extends ButtonWidget2 {

    build() {
        super.build();
        this.label.set({text: "Workers: 0"});
    }

}

//------------------------------------------------------------------------------------------
//-- GameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GameWidget extends Widget2 {

    build() {
        console.log("Game Widget");
        this.bg = new CanvasWidget2({parent: this, color: [0,1,1], autoSize: [1,1]});
        this.wood = new ResourceWidget({parent: this.bg, translation:[300,0], size: [200, 150], name: "Wood"});

        this.food = new ResourceWidget({parent: this.bg, translation:[500,0], size: [200, 150], name: "Food"});

        this.pop = new PopulationWidget({parent: this.bg, translation:[0,0], size: [200, 50]});
    }

}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, HUD];
    }

    onStart() {
        // const hud = this.service("HUD");
        // this.game = new GameWidget({parent: hud.root, autoSize: [1,1]});

        this.subscribe("input", "xDown", this.test);
        this.subscribe("input", "zDown", this.test2);
    }

    test() {
        console.log("test");
        const id = "aaa";
        this.publish("account", "login", id);
    }

    test2() {
        console.log("test2");
    }


}
