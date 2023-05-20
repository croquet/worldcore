import { ViewRoot, InputManager, Widget2,  TextWidget2, HUD, ButtonWidget2, ToggleWidget2, VerticalWidget2, ToggleSet2,  HorizontalWidget2} from "@croquet/worldcore";

import { CharacterName } from "./Characters";

//------------------------------------------------------------------------------------------
//-- PickWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PickWidget extends ToggleWidget2 {

    get text() { return this._text || ""}
    get pick() { return this._pick}

    build() {
        super.build();
        // this.frame = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.5,0.7,0.83]});
        const nn = CharacterName(this.pick);
        this.label.set({text:this.text, point:18});
    }

    onToggle() {
        this.label.set({
            color: this.isOn ? [1,1,1] : [0.5,0.5,0.5]
        });

        if (this.isOn) {
            console.log("vote!");
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
        const toggleSet = new ToggleSet2();
        this.pickA = new PickWidget({toggleSet, parent: this, pick: 0, text: CharacterName(10), size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [-50,-50]});
        this.pickB = new PickWidget({toggleSet, parent: this, pick: 1, text: CharacterName(318), size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,0.5], translation: [-50,0]});
        this.pickC = new PickWidget({toggleSet, parent: this, pick: 2, text: CharacterName(272), size: [200,70], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [-50,50]});

        this.tallyA = new TextWidget2({parent: this, text: vm.tally[0]+'', color: [1,1,1], size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,1], translation: [130,-60]});
        this.tallyB = new TextWidget2({parent: this, text: vm.tally[1]+'', color: [1,1,1], size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,0.5], translation: [130,0]});
        this.tallyC = new TextWidget2({parent: this, text: vm.tally[2]+'', color: [1,1,1], size: [100,50], anchor:[0.5, 0.5], pivot: [0.5,0], translation: [130,60]});

        this.subscribe("VoteManager", "update", this.updateTally);
    }

    updateTally(t) {
        this.tallyA.set({text: ''+ t[0]});
        this.tallyB.set({text: ''+ t[1]});
        this.tallyC.set({text: ''+ t[2]});
    }

}

//------------------------------------------------------------------------------------------
//-- GameWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GameWidget extends Widget2 {

    build() {
        const um = this.modelService("UserManager");
        this.bg = new VerticalWidget2({parent: this, autoSize: [1,1]});
        this.top = new HorizontalWidget2({parent: this.bg, height: 50});
        this.timer = new TextWidget2({parent: this.top, width:50, color: [1,1,1], text: "-"});
        this.round = new TextWidget2({parent: this.top, height: 50, color: [1,1,1], style: "bold", text: "Preliminaries"});
        this.players = new TextWidget2({parent: this.top, width:50, color: [1,1,1], text: "" + um.userCount});
        this.top.resize();
        this.question = new TextWidget2({parent: this.bg, color: [1,1,1], height: 100, style: "italic", text: "Who would win in a fair fight?"});
        this.vote = new VoteWidget({parent: this.bg});

        this.subscribe("timer", "tick", this.refreshTimer);
        this.subscribe("UserManager", "create", this.refreshPlayers);
        this.subscribe("UserManager", "destroy", this.refreshPlayers);
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
