import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2, viewRoot, CanvasWidget2, Pawn} from "@croquet/worldcore";

import { CharacterName } from "./Characters";
import { Question } from "./Questions";

//------------------------------------------------------------------------------------------
// GamePawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GamePawn extends Pawn {

    constructor(actor) {
        super(actor);
        const hud = this.service("HUD");
        console.log("game pawn");
        this.game = new GameWidget({parent: hud.root, autoSize: [1,1]});
    }

    destroy() {
        super.destroy();
        this.game.destroy();
    }

}
GamePawn.register("GamePawn");


//------------------------------------------------------------------------------------------
//-- PickWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PickWidget extends ToggleWidget2 {

    // get text() { return this._text || ""}
    get pick() { return this._pick}

    build() {
        super.build();
        this.refresh();
    }

    refresh() {
        const game = viewRoot.model.game;
        const point = 18;
        const text = game.slate[this.pick];
        this.label.set({text,point});
    }

    onToggle() {
        this.label.set({
            color: this.isOn ? [1,1,1] : [0.5,0.5,0.5]
        });

        if (this.isOn) {
            this.publish("hud", "vote", {user: this.viewId, pick: this.pick});
        }
    }

}

//------------------------------------------------------------------------------------------
//-- VoteWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class VoteWidget extends Widget2 {

    build() {
        const vm = this.modelService("VoteManager");
        const game = viewRoot.model.game;
        console.log(game.slate[0]);
        console.log(game.slate[1]);
        console.log(game.slate[2]);
        const toggleSet = new ToggleSet2();
        this.pickA = new PickWidget({toggleSet, parent: this, pick: 0, size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [-50,-50]});
        this.pickB = new PickWidget({toggleSet, parent: this, pick: 1, size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,0.5], translation: [-50,0]});
        this.pickC = new PickWidget({toggleSet, parent: this, pick: 2, size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [-50,50]});

        this.tallyA = new TextWidget2({parent: this, text: game.tally[0]+'', color: [1,1,1], alpha: 0, size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [130,-60]});
        this.tallyB = new TextWidget2({parent: this, text: game.tally[1]+'', color: [1,1,1], alpha: 0, size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,0.5], translation: [130,0]});
        this.tallyC = new TextWidget2({parent: this, text: game.tally[2]+'', color: [1,1,1], alpha: 0, size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [130,60]});

        this.subscribe(game.id, "slateSet", this.refreshSlate);
        this.subscribe(game.id, "tallySet", this.refreshTally);

        this.update();
    }

    refreshSlate() {
        this.pickA.refresh();
        this.pickB.refresh();
        this.pickC.refresh();

    }

    refreshTally() {
        const game = viewRoot.model.game;
        this.tallyA.set({text: ''+ game.tally[0]});
        this.tallyB.set({text: ''+ game.tally[1]});
        this.tallyC.set({text: ''+ game.tally[2]});
    }

}

//------------------------------------------------------------------------------------------
//-- RankWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class RankWidget extends Widget2 {

    get color() { return [0,1,1]}

    build() {
        const vm = this.modelService("VoteManager");
        let rank1;
        let rank2;
        let rank3;
        const winner = vm.winner();
        switch (winner) {
            default:
            case 0: rank1 = 0; rank2 = 1; rank3 = 2; break;
            case 1: rank1 = 1; rank2 = 0; rank3 = 2; break;
            case 2: rank1 = 2; rank2 = 0; rank3 = 1; break;
        }

        const game = viewRoot.model.game;
        const name1 = new TextWidget2({parent: this, text: game.slate[rank1], alpha: 0, size: [300,100], point: 32,  style: "bold", anchor:[0.5, 0.5], pivot: [0.5,1], translation: [0,-50]});
        const name2 = new TextWidget2({parent: this, text: game.slate[rank2], alpha: 0, size: [200,50], point: 18,  sanchor:[0.5, 0.5], pivot: [0.5,0.5], translation: [0,0]});
        const name3 = new TextWidget2({parent: this, text: game.slate[rank3], alpha: 0, size: [200,50], point: 18,  anchor:[0.5, 0.5], pivot: [0.5,0], translation: [0,20]});
    }


}

//------------------------------------------------------------------------------------------
//-- GameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GameWidget extends Widget2 {

    build() {
        const um = this.modelService("UserManager");
        const game = viewRoot.model.game;
        this.bg = new CanvasWidget2({parent: this, color: [0,1,1], autoSize: [1,1]});
        this.layout = new VerticalWidget2({parent: this.bg, autoSize: [1,1]});
        this.top = new HorizontalWidget2({parent: this.layout, height: 50});
        this.timer = new TextWidget2({parent: this.top, width:50, color: [1,1,1], text: "-"});
        this.round = new TextWidget2({parent: this.top, height: 50, color: [1,1,1], style: "bold", text: game.round});
        this.players = new TextWidget2({parent: this.top, width:50, color: [1,1,1], text: "" + um.userCount});
        this.top.resize();
        this.question = new TextWidget2({parent: this.layout, color: [1,1,1], height: 100, style: "italic", text: game.question});
        this.content = new Widget2({parent: this.layout});
        this.start = new StartWidget({parent: this.layout, height: 100, });
        this.refreshMode();

        this.subscribe(game.id, "modeSet", this.refreshMode);
        this.subscribe(game.id, "timerSet", this.refreshTimer);
        this.subscribe("UserManager", "create", this.refreshPlayers);
        this.subscribe("UserManager", "destroy", this.refreshPlayers);
        this.subscribe(game.id, "questionSet", this.refreshQuestion);
        this.subscribe(game.id, "roundSet", this.refreshRound);


    }

    refreshMode() {
        this.content.destroyChildren();
        const game = viewRoot.model.game;
        const mode = game.mode;
        switch (mode) {
            default:
            case "vote": new VoteWidget({parent: this.content, anchor: [0.5,0.5], pivot: [0.5,0.5]}); break;
            case "rank": new RankWidget({parent: this.content, anchor: [0.5,0.5], pivot: [0.5,0.5]}); break;
        }
    }


    refreshTimer() {
        const game = viewRoot.model.game;
        const text = game.timer+"";
        let textColor = [0,0,0];
        if (game.timer<5) textColor = [1,0,0];
        this.timer.set({textColor, text});
    }

    refreshPlayers() {
        const um = this.modelService("UserManager");
        const text = um.userCount+"";
        this.players.set({text});
    }

    refreshQuestion() {
        const game = viewRoot.model.game;
        const text = game.question;
        this.question.set({text});
    }

    refreshRound() {
        const game = viewRoot.model.game;
        const text = game.round;
        this.round.set({text});
    }

}

//------------------------------------------------------------------------------------------
//-- StartWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class StartWidget extends Widget2 {

    build() {
        const startButton = new ButtonWidget2({parent: this, anchor: [0.5, 0.5], pivot: [0.5, 0.5], size: [200,50]});
        startButton.label.set({text: "New Game"});
        startButton.onClick = () => this.publish("hud", "start");
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
        const hud = this.service("HUD");
        // this.game = new GameWidget({parent: hud.root, autoSize: [1,1]});
        this.subscribe("input", "xDown", this.test);
        this.subscribe("input", "zDown", this.test2);
    }

    test() {
        console.log("test");
    }

    test2() {
        console.log("test2");
    }


}
