import { Widget, BoxWidget, TextFieldWidget, ButtonWidget, HorizontalWidget, VerticalWidget, TextWidget } from "@croquet/worldcore";
import { Nickname } from "./Names";
import { MyPlayerPawn } from "./Player";
import { Question } from "./Questions";
import { CharacterName} from "./Characters";

const bgColor = [0.5, 0.75, 10.75];
let playerName;

export class HUD extends BoxWidget {
    constructor(...args) {
        super(...args);
        this.set({autoSize: [1,1], color: bgColor});
        console.log("hud");
        this.joinScreen = new JoinScreen(this, {autoSize: [1,1]});
        this.gameScreen = new GameScreen(this, {autoSize: [1,1], visible: false});
    }

    joinGame() {

        this.joinScreen.hide();
        this.gameScreen.show();
    }


}

//------------------------------------------------------------------------------------------
//-- JoinScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class JoinScreen extends Widget {

    constructor(...args) {
        super(...args);

        this.background = new BoxWidget(this, {autoSize: [1,1], color: bgColor});

        this.title = new TitlePanel(this.background, {autoSize:[1,0], local: [0,50]});

        this.entry = new Widget(this.background, {autoSize: [0, 0], anchor: [0.5,0.5], pivot: [0.5, 0.5], size:[600,45]});
        this.label = new TextWidget(this.entry, {local: [0, -50], size:[200,40], alignX: 'left', alignY: 'bottom', text:'Enter Player Name', point: 14});
        this.entryLayout = new HorizontalWidget(this.entry, {autoSize: [1, 1], margin: 5});

        this.nameEntry = new TextFieldWidget(this.entryLayout, {autoSize: [1,0], anchor:[0,1], pivot: [0,1], size:[0,45]});
        this.nameEntry.text.set({text: playerName || Nickname()});
        this.nameEntry.onEnter = () => this.joinGame();
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
        const name = this.nameEntry.text.text.slice(0,32);
        playerName = name;
        MyPlayerPawn().setName(name);
        this.parent.joinGame();
    }

}

//------------------------------------------------------------------------------------------
//-- GameScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GameScreen extends Widget {
    constructor(...args) {
        super(...args);

        this.lobbyPanel = new LobbyPanel(this, {autoSize:[1,1], visible: false});
        this.seedPanel = new SeedPanel(this, {autoSize:[1,1], visible: false});
        this.matchPanel = new MatchPanel(this, {autoSize:[1,1], visible: false});
        // this.winnerPanel = new WinnerPanel(this, {autoSize:[1,1], visible: false});

        this.refresh();

        this.subscribe("gm", "mode", this.refresh);
    }

    refresh() {
        const gm = this.wellKnownModel("GameMaster");
        const mode = gm.mode;
        if (this.activePanel) this.activePanel.hide();
        switch (mode) {
            case 'lobby':
                this.activePanel = this.lobbyPanel;
                break;
            case 'seed':
                this.activePanel = this.seedPanel;
                break;
            case 'match':
                this.activePanel = this.matchPanel;
                break;
            case 'winner':
                this.activePanel = this.winnerPanel;
                break;
            default:
        }
        if (this.activePanel) {
            this.activePanel.show();
            this.activePanel.refresh();
        }
    }

}

//------------------------------------------------------------------------------------------
//-- TitlePanel ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TitlePanel extends BoxWidget {
    constructor(...args) {
        super(...args);
        this.set({color: bgColor});

        new TextWidget(this, {autoSize: [1,1], local:[0,50], point: 48, style: 'bold', text: "Ultimate\nPop Smash!"});
    }
}

//------------------------------------------------------------------------------------------
//-- LobbyPanel ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class LobbyPanel extends BoxWidget {
    constructor(...args) {
        super(...args);
        this.set({color: bgColor});

        this.horizontal = new HorizontalWidget(this, {autoSize: [1,1]});

        this.rankList = new RankList(null, {autoSize: [1,1], width: 250, border: [10,10,10,10]});
        const right = new Widget(null, {autoSize: [1,1]});

        this.horizontal.addSlot(this.rankList);
        this.horizontal.addSlot(right);

        new TitlePanel(right, {autoSize:[1,0], local: [0,10]});

        const info = `Sixteen pop culture icons face-off in crazy 1-on-1 battles. Vote to determine who wins each match-up. Ties are broken by coin flip. Your goal is to predict who will be on top of the heap when the dust clears. Every time one of your picks advances, you earn points: Three points for #1, two points for #2, and one for #3.`;

        new TextWidget(right, {anchor: [0.5,0], pivot: [0.5,0], local: [0,200], autoSize: [1,0], size:[0,50], point: 24, style: 'bold', text: "Rules"});
        new TextWidget(right, {anchor: [0.5,0], pivot: [0.5,0], local: [0,250], autoSize: [0.9,0], size:[0,300], point: 16, alignX: 'left', alignY: 'top', text: info});

        const reset = new ButtonWidget(right, {anchor: [0.5,1], pivot: [0.5,1], local: [0,-20], size:[200,50]} );
        reset.label.setText("Reset Scores");
        reset.onClick = () => this.publish("hud", "resetScores");

        const start = new ButtonWidget(right, {anchor: [0.5,0.6], pivot: [0.5,0.5], local: [0,0], size:[200,50]} );
        start.label.setText("Start Game");
        start.onClick = () => this.publish("hud", "startGame");
    }

    refresh() {
        this.markCanvasChanged();
        this.rankList.refresh();
    }
}

//------------------------------------------------------------------------------------------
//-- RankList ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class RankList extends BoxWidget {
    constructor(...args) {
        super(...args);

        this.set({color: [0.9,0.9,0.9]});
        this.layout = new VerticalWidget(this, {autoSize: [1,1], border: [5,5,5,5]});

        this.subscribe("playerManager", "listChanged", this.refresh);
        this.subscribe("playerManager", "playerChanged", this.refresh);
    }

    refresh() {
        this.markCanvasChanged();
        const players = this.wellKnownModel("PlayerManager").players;

        this.layout.destroyAllSlots();

        const ranked = [];

        players.forEach(player => {
            const me = MyPlayerPawn();
            let self = false;
            if (me) self = me.actor === player;
            ranked.push({name: player.name, score: player.score, self});
        });

        ranked.sort((a,b) => b.score - a.score);

        let rankNumber = 0;
        let previousScore = -1;

        ranked.forEach(player => {

            const h = new HorizontalWidget(null, {autoSize: [1,1], height: 30});
            this.layout.addSlot(h);

            if (player.score !== previousScore) {
                rankNumber++;
                previousScore = player.score;
            }

            const rank = new TextWidget(null, {autoSize: [1,1], alignX: 'left', point: 18, text: "" + rankNumber, width: 20});
            const name = new TextWidget(null, {autoSize: [1,1], alignX: 'left', point: 18, text: player.name || "...Joining"});
            const score = new TextWidget(null, {autoSize: [1,1], alignX: 'right', point: 18, text: "" + player.score, width: 20});

            if (!player.name) name.set({style: 'italic'});
            if (player.self) name.set({style: 'bold'});

            h.addSlot(rank);
            h.addSlot(name);
            h.addSlot(score);

        });

    }
}

//------------------------------------------------------------------------------------------
//-- SeedPanel ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SeedPanel extends BoxWidget {
    constructor(...args) {
        super(...args);
        this.set({color: [bgColor]});

        this.vertical = new VerticalWidget(this, {autoSize: [1,1]});

        this.questionPanel = new QuestionPanel(null, {autoSize: [1,0], height: 120});
        this.vertical.addSlot(this.questionPanel);

        this.horizontal = new HorizontalWidget(null, {autoSize: [1,1]});
        this.vertical.addSlot(this.horizontal);

        this.statusPanel = new StatusPanel(null, {autoSize: [1,0], height: 80});
        this.vertical.addSlot(this.statusPanel);

        const seedSlot = new Widget(null, {autoSize: [1,1]});
        this.seedGrid = new SeedGrid(seedSlot, {anchor:[0.5,0.5], pivot:[0.5,0.5], size: [510,500]});
        this.horizontal.addSlot(seedSlot);
    }

    refresh() {
        this.questionPanel.refresh();
        this.seedGrid.refresh();
        this.statusPanel.refresh();
    }
}

//------------------------------------------------------------------------------------------
//-- QuestionPanel -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class QuestionPanel extends BoxWidget {
    constructor(...args) {
        super(...args);
        this.set({color:[0.9,0.9,0.9]});
        this.textBox = new TextWidget(this, {autoSize: [1,1], style: 'italic'});
    }

    refresh() {
        const gm = this.wellKnownModel('GameMaster');
        this.textBox.setText(Question(gm.question));
    }
}

//------------------------------------------------------------------------------------------
//-- Status Panel -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class StatusPanel extends BoxWidget {
    constructor(...args) {
        super(...args);

        this.set({color:[0.9,0.9,0.9]});

        this.hint = new TextWidget(this, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [0,1], size: [400, 80], point: 18, style: 'italic', text: "Hint!"});
        this.voters = new TextWidget(this, {anchor: [1,0.5], pivot: [1,0.5], autoSize: [0,1], size: [80, 80], point: 30, text: "3/4"});

        this.subscribe("playerManager", "playerChanged", this.refreshVoters);
        this.subscribe("playerManager", "listChanged", this.refreshVoters);
        this.subscribe("gm", "mode", this.refreshHint);
        this.subscribe("gm", "timer", this.refreshVoters);
    }

    refresh() {
        this.refreshHint();
        this.refreshVoters();
    }

    refreshVoters() {
        const pm = this.wellKnownModel('PlayerManager');
        const gm = this.wellKnownModel('GameMaster');

        const voters = pm.joinedCount;
        let voted = 0;
        switch (gm.mode) {
            case 'seed':
                voted = pm.pickedCount;
                break;
            case 'match':
                voted = pm.votedCount;
                break;
            case 'score':
                break;
            default:
        }
        if (gm.inCountdown) {
            this.voters.set({text: "" + gm.timer, color: [1,0,0]});
        } else {
            this.voters.set({text: voted + "/" + voters, color: [0,0,0]});
        }

    }

    refreshHint() {
        const gm = this.wellKnownModel('GameMaster');
        const mode = gm.mode;
        switch (mode) {
            case 'seed':
                this.hint.setText("Predict the top three!");
                break;
            case 'match':
                this.hint.setText("Vote for who wins the match-up!");
                break;
            case 'winner':
                this.hint.setText("Correct predictions score points!");
                break;
            case 'score':
                this.hint.setText("Score!");
                break;
            default:
        }
    }
}

//------------------------------------------------------------------------------------------
//-- SeedGrid ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SeedGrid extends Widget {

    constructor(...args) {
        super(...args);

        this.buttons = [];
        for ( let i = 0; i < 8; i++) {
            this.buttons[i] = new LeftSeedButton(this, {local: [0,i*60]});
            // this.buttons[i].setLocal([0,i*60]);
            this.buttons[i].button.onClick = () => this.pick(i);
        }

        for ( let i = 0; i < 8; i++) {
            const j = i + 8;
            this.buttons[j] = new RightSeedButton(this, {anchor:[1,0], pivot:[1,0], local: [0,i*60]});
            this.buttons[j].button.onClick = () => this.pick(j);
        }

    }

    refresh() {
        const gm = this.wellKnownModel('GameMaster');
        for (let i = 0; i < 16; i++) {
            this.buttons[i].button.label.setText(CharacterName(gm.seed[i]));
        }

        this.pick1 = -1;
        this.pick2 = -1;
        this.pick3 = -1;

        this.refreshTags();
    }

    pick(n) {
        if (this.pick1 === n) {
            this.pick1 = -1;
        } else if (this.pick1 === -1) {
            if (this.pick2 === n) this.pick2 = -1;
            if (this.pick3 === n) this.pick3 = -1;
            this.pick1 = n;
        } else if (this.pick2 === n) {
            this.pick2 = -1;
        } else if (this.pick2 === -1) {
            if (this.pick3 === n) this.pick3 = -1;
            this.pick2 = n;
        } else if (this.pick3 === n) {
            this.pick3 = -1;
        } else if (this.pick3 === -1) {
            this.pick3 = n;
        }
        this.refreshTags();
        this.publishPicks();
    }

    publishPicks() {
        const gm = this.wellKnownModel("GameMaster");
        const picks = [-1, -1, -1];
        if (this.pick1 !== -1) picks[0] = gm.seed[this.pick1];
        if (this.pick2 !== -1) picks[1] = gm.seed[this.pick2];
        if (this.pick3 !== -1) picks[2] = gm.seed[this.pick3];
        MyPlayerPawn().setPicks(picks);
    }

    refreshTags() {
        this.buttons.forEach(button => button.setRank(0));
        if (this.pick1 !== -1 && this.pick2 !== -1 && this.pick3 !== -1 ) {
            this.buttons.forEach(button => button.button.disable());
        }
        if (this.pick1 !== -1) this.buttons[this.pick1].setRank(1);
        if (this.pick2 !== -1) this.buttons[this.pick2].setRank(2);
        if (this.pick3 !== -1) this.buttons[this.pick3].setRank(3);
    }

}

//------------------------------------------------------------------------------------------
//-- SeedButton ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SeedButton extends Widget {
    constructor(...args) {
        super(...args);

        this.set({size:[250,50]});
        this.tab = new BoxWidget(this, {size:[50,50], color: [1,0,0], visible: false});
        this.label = new TextWidget(this.tab, {autoSize:[1,1], text:"1"});
        this.button = new ButtonWidget(this, {size:[200,50]});
        this.button.label.set({point: 20, wrap: true});
    }

    setRank(n) {
        this.button.enable();
        switch (n) {
            case 0:
                this.tab.set({color:[1,0,0], visible: false});
                this.label.setText("0");
                break;
            case 1:
                this.tab.set({color:[1,0,0], visible: true});
                this.label.setText("1");
                break;
            case 2:
                this.tab.set({color:[0,1,0], visible: true});
                this.label.setText("2");
                break;
            case 3:
                this.tab.set({color:[0.3,0.5,1], visible: true});
                this.label.setText("3");
                break;
            default:
        }
    }

}

class LeftSeedButton extends SeedButton {
    constructor(...args) {
        super(...args);

        this.tab.set({anchor:[0,0], pivot:[0,0]});
        this.button.set({anchor:[1,0], pivot:[1,0]});
    }

}

class RightSeedButton extends SeedButton {
    constructor(...args) {
        super(...args);

        this.tab.set({anchor:[1,0], pivot:[1,0]});
        this.button.set({anchor:[0,0], pivot:[0,0]});

    }
}

//------------------------------------------------------------------------------------------
//-- MatchPanel ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MatchPanel extends BoxWidget {
    constructor(...args) {
        super(...args);
        this.set({color: bgColor});

        this.vertical = new VerticalWidget(this, {autoSize: [1,1]});

        this.questionPanel = new QuestionPanel(null, {autoSize: [1,0], height: 120});
        this.vertical.addSlot(this.questionPanel);

        this.horizontal = new HorizontalWidget(null, {autoSize: [1,1]});
        this.vertical.addSlot(this.horizontal);

        this.statusPanel = new StatusPanel(null, {autoSize: [1,0], height: 80});
        this.vertical.addSlot(this.statusPanel);

        this.rankList = new RankList(null, {autoSize: [1,1], width: 250, border: [10,10,10,10]});
        this.horizontal.addSlot(this.rankList);

        // const matchSlot = new Widget(null, {autoSize: [1,1]});
        // this.matchControls = new MatchControls(matchSlot, {anchor:[0.5,0.5], pivot:[0.5,0.5], size: [510,300]});
        // this.horizontal.addSlot(matchSlot);
    }

    refresh() {
        this.questionPanel.refresh();
        this.rankList.refresh();
        // this.matchControls.refresh();
        // this.matchControls.resetVote();
        this.statusPanel.refresh();
    }
}