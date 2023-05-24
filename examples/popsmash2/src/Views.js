import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2, viewRoot, CanvasWidget2} from "@croquet/worldcore";

import { CharacterName } from "./Characters";
import { Question } from "./Questions";

//------------------------------------------------------------------------------------------
//-- PickWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PickWidget extends ToggleWidget2 {

    get text() { return this._text || ""}
    get pick() { return this._pick}

    build() {
        super.build();
        this.label.set({text:this.text, point:18});
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

    get color() { return [0,1,1]}

    build() {
        const vm = this.modelService("VoteManager");
        const game = viewRoot.model.game;
        const toggleSet = new ToggleSet2();
        this.pickA = new PickWidget({toggleSet, parent: this, pick: 0, text: game.slate[0], size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [-50,-50]});
        this.pickB = new PickWidget({toggleSet, parent: this, pick: 1, text: game.slate[1], size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,0.5], translation: [-50,0]});
        this.pickC = new PickWidget({toggleSet, parent: this, pick: 2, text: game.slate[2], size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [-50,50]});

        this.tallyA = new TextWidget2({parent: this, text: vm.tally[0]+'', color: [1,1,1], alpha: 0, size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [130,-60]});
        this.tallyB = new TextWidget2({parent: this, text: vm.tally[1]+'', color: [1,1,1], alpha: 0, size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,0.5], translation: [130,0]});
        this.tallyC = new TextWidget2({parent: this, text: vm.tally[2]+'', color: [1,1,1], alpha: 0, size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [130,60]});

        this.subscribe("VoteManager", "update", this.updateTally);
        this.subscribe("game", "start", this.updatePicks);
    }

    updatePicks() {
        const game = viewRoot.model.game;
        this.pickA.label.set({text: game.slate[0]});
        this.pickB.label.set({text: game.slate[1]});
        this.pickC.label.set({text: game.slate[2]});
    }

    updateTally(t) {
        this.tallyA.set({text: ''+ t[0]});
        this.tallyB.set({text: ''+ t[1]});
        this.tallyC.set({text: ''+ t[2]});
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

    // updateTally(t) {
    //     this.tallyA.set({text: ''+ t[0]});
    //     this.tallyB.set({text: ''+ t[1]});
    //     this.tallyC.set({text: ''+ t[2]});
    // }

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
        this.question = new TextWidget2({parent: this.layout, color: [1,1,1], height: 100, style: "italic", text: Question(game.question)});
        this.content = new Widget2({parent: this.layout});
        this.start = new StartWidget({parent: this.layout, height: 100, });

        this.subscribe("timer", "tick", this.refreshTimer);
        this.subscribe("UserManager", "create", this.refreshPlayers);
        this.subscribe("UserManager", "destroy", this.refreshPlayers);
        this.subscribe("game", "start", this.refreshQuestion);
        this.subscribe("game", "mode", this.mode);
    }

    mode(m) {
        this.content.destroyChildren();
        console.log(m);
        switch(m) {
            default:
            case "match": new VoteWidget({parent: this.content, anchor: [0.5,0.5], pivot: [0.5,0.5]}); break;
            case "result": new RankWidget({parent: this.content, anchor: [0.5,0.5], pivot: [0.5,0.5]}); break;
        }
    }


    refreshTimer(n) {
        const text = n+"";
        let textColor = [0,0,0];
        if (n<5) textColor = [1,0,0];
        this.timer.set({textColor, text});
    }

    refreshPlayers() {
        const um = this.modelService("UserManager");
        const text = um.userCount+"";
        this.players.set({text});
    }

    refreshQuestion() {
        const game = viewRoot.model.game;
        const text = Question(game.question);
        this.question.set({text});
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
        this.game = new GameWidget({parent: hud.root, autoSize: [1,1]});
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
