import { TextWidget, GetNamedView, Widget, ButtonWidget, BoxWidget, TextFieldWidget, HorizontalWidget, VerticalWidget, ImageWidget} from "@croquet/worldcore";
import { Nickname } from "./Names";

import upArrow from "../assets/upArrow.png";
import downArrow from "../assets/downArrow.png";
import leftArrow from "../assets/leftArrow.png";
import rightArrow from "../assets/rightArrow.png";
import amplitude from "../assets/amplitude.png";
import { MyPlayerPawn } from "./Player";

let playerName;

//------------------------------------------------------------------------------------------
//-- JoinScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class JoinScreen extends Widget {

    constructor(...args) {
        super(...args);

        this.background = new BoxWidget(this, {autoSize: [1,1], color: [0.5, 0.75, 0.75]});

        this.title = new TextWidget(this.background, {anchor: [0.5,0], pivot: [0.5, 0], local:[0,120], size:[300,60], text: "Worldcore Demo 1", point: 32});

        this.entry = new Widget(this.background, {autoSize: [0, 0], anchor: [0.5,0.5], pivot: [0.5, 0.5], size:[600,45]});
        this.label = new TextWidget(this.entry, {local: [0, -50], size:[200,40], alignX: 'left', alignY: 'bottom', text:'Enter Player Name', point: 14});
        this.entryLayout = new HorizontalWidget(this.entry, {autoSize: [1, 1], margin: 5});

        this.nameEntry = new TextFieldWidget(this.entryLayout, {autoSize: [1,0], anchor:[0,1], pivot: [0,1], size:[0,45]});
        this.nameEntry.text.set({text: playerName || Nickname()});
        // this.nameEntry.onEnter = () => this.joinGame();
        this.entryLayout.addSlot(this.nameEntry);

        this.enterButton = new ButtonWidget(this.entryLayout, {autoSize: [1,0], anchor:[0,1], pivot: [0,1], size:[0,45], width: 100});
        this.enterButton.label.set({text: "Join"});
        this.enterButton.onClick = () => this.joinGame();
        this.entryLayout.addSlot(this.enterButton);
    }

    onStart() {
        // this.nameEntry.selectAll();
        // this.nameEntry.focus();
    }

    joinGame() {
        // const localUser = GetNamedView('LocalUser');
        const name = this.nameEntry.text.text.slice(0,36);
        playerName = name;
        MyPlayerPawn().setName(name);
        // localUser.setName(name);
        this.publish("hud", "enterGame");
    }

}

//------------------------------------------------------------------------------------------
//-- GameScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GameScreen extends Widget {
    constructor(...args) {
        super(...args);
        this.playerList = new PlayerList(this, {autoSize: [0,0], size: [200,300], border: [10,10,10,10], opacity: 0.5});
        this.navPanel = new NavPanel(this, {size: [200,200], anchor:[1,1], pivot:[1,1]});
    }

}

//------------------------------------------------------------------------------------------
//-- PlayerList ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PlayerList extends BoxWidget {
    constructor(...args) {
        super(...args);

        this.set({color: [0.9,0.9,0.9]});
        this.layout = new VerticalWidget(this, {autoSize: [1,1], border: [5,5,5,5]});

        this.refresh();

        this.subscribe("playerManager", "listChanged", this.refresh);
        this.subscribe("playerManager", "playerChanged", this.refresh);
    }

    refresh() {
        this.markCanvasChanged();
        const playerManager = this.wellKnownModel("PlayerManager");
        const myPlayerPawn = MyPlayerPawn();
        const players = playerManager.players;

        this.layout.destroyAllSlots();

        players.forEach(player => {
            const self = myPlayerPawn.actor === player;
            const name = new TextWidget(this.layout, {autoSize: [1,0], height: 20, alignX: 'left', point: 12, text: player.name || "...Joining"});
            if (!player.name) name.set({style: 'italic'});
            if (self) name.set({style: 'bold'});
            this.layout.addSlot(name);
        });

    }
}

//------------------------------------------------------------------------------------------
//-- NavPanel ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class NavPanel extends Widget {
    constructor(...args) {
        super(...args);

        this.fButton = new ButtonWidget(this, {size:[50,50], local:[60,0]});
        this.bButton = new ButtonWidget(this, {size:[50,50], local:[60,120]});
        this.lButton = new ButtonWidget(this, {size:[50,50], local:[0,60]});
        this.rButton = new ButtonWidget(this, {size:[50,50], local:[120,60]});
        this.soundButton = new ButtonWidget(this, {size:[50,50], local:[60,60]});

        this.fButton.setLabel(new ImageWidget(this.fButton, {autoSize:[1,1], url: upArrow}));
        this.bButton.setLabel(new ImageWidget(this.bButton, {autoSize:[1,1], url: downArrow}));
        this.lButton.setLabel(new ImageWidget(this.lButton, {autoSize:[1,1], url: leftArrow}));
        this.rButton.setLabel(new ImageWidget(this.rButton, {autoSize:[1,1], url: rightArrow}));
        this.soundButton.setLabel(new ImageWidget(this.soundButton, {autoSize:[1,1], url: amplitude}));

        this.fButton.onPress = () => {this.publish("hud", "fore", 1);};
        this.fButton.onRelease = () => {this.publish("hud", "fore", 0);};
        this.bButton.onPress = () => {this.publish("hud", "back", 1);};
        this.bButton.onRelease = () => {this.publish("hud", "back", 0);};
        this.lButton.onPress = () => {this.publish("hud", "left", 1);};
        this.lButton.onRelease = () => {this.publish("hud", "left", 0);};
        this.rButton.onPress = () => {this.publish("hud", "right", 1);};
        this.rButton.onRelease = () => {this.publish("hud", "right", 0);};
        this.soundButton.onClick = () => {this.publish("hud", "sound");};


    }


}
