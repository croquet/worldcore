
import { TextWidget, GetNamedView, Widget, ButtonWidget, BoxWidget, ImageWidget, GetNamedModel, TextFieldWidget,
    HorizontalWidget, VerticalWidget, ToggleWidget, ToggleSet } from "@croquet/worldcore";
import { CharacterName } from "./Characters";
import { Question } from "./Questions";
import { Nickname } from "./Names";
import { RoundPoints } from "./Points";
import check from "../assets/check.png";

const bgColor = [0.5, 0.75, 10.75];
let playerName;

//------------------------------------------------------------------------------------------
//-- JoinScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class JoinScreen extends Widget {

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
        const localUser = GetNamedView('LocalUser');
        const name = this.nameEntry.text.text.slice(0,32);
        playerName = name;
        localUser.setName(name);
        this.publish("hud", "enterGameScreen");
    }

}

//------------------------------------------------------------------------------------------
//-- GameScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GameScreen2 extends Widget {
    constructor(...args) {
        super(...args);

        this.lobbyPanel = new LobbyPanel(this, {autoSize:[1,1], visible: false});
        this.seedPanel = new SeedPanel(this, {autoSize:[1,1], visible: false});
        this.matchPanel = new MatchPanel(this, {autoSize:[1,1], visible: false});
        this.winnerPanel = new WinnerPanel(this, {autoSize:[1,1], visible: false});

        this.refresh();

        this.subscribe("gm", "mode", this.refresh);
    }

    refresh() {
        const gm = this.wellKnownModel("GameMaster");
        if (this.activePanel) this.activePanel.hide();
        switch (gm.mode) {
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
//-- SeedPanel ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SeedPanel extends BoxWidget {
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

        const matchSlot = new Widget(null, {autoSize: [1,1]});
        this.matchControls = new MatchControls(matchSlot, {anchor:[0.5,0.5], pivot:[0.5,0.5], size: [510,300]});
        this.horizontal.addSlot(matchSlot);
    }

    refresh() {
        this.questionPanel.refresh();
        this.rankList.refresh();
        this.matchControls.refresh();
        this.matchControls.resetVote();
        this.statusPanel.refresh();
    }
}

//------------------------------------------------------------------------------------------
//-- WinnerPanel ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WinnerPanel extends BoxWidget {
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

        const winnerSlot = new Widget(null, {autoSize: [1,1]});
        this.winnerAnnunciator = new WinnerAnnunciator(winnerSlot, {anchor:[0.5,0.5], pivot:[0.5,0.5], size: [510,300]});
        this.horizontal.addSlot(winnerSlot);
    }

    refresh() {
        this.questionPanel.refresh();
        this.rankList.refresh();
        this.winnerAnnunciator.refresh();
        this.statusPanel.refresh();
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
//-- RankList ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class RankList extends BoxWidget {
    constructor(...args) {
        super(...args);

        this.set({color: [0.9,0.9,0.9]});
        this.layout = new VerticalWidget(this, {autoSize: [1,1], border: [5,5,5,5]});

        this.subscribe("userList", "changed", this.refresh);
    }

    refresh() {
        this.markCanvasChanged();
        const userList = this.wellKnownModel("UserList");
        const localUser = GetNamedView("LocalUser");
        const players = userList.users;

        this.layout.destroyAllSlots();

        const ranked = [];

        players.forEach(player => {
            const self = localUser.user === player;
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
//-- QuestionPanel -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class QuestionPanel extends BoxWidget {
    constructor(...args) {
        super(...args);
        this.set({color:[0.9,0.9,0.9]});
        this.textBox = new TextWidget(this, {autoSize: [1,1], style: 'italic'});
    }

    refresh() {
        const gm = GetNamedModel('GameMaster');
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

        this.subscribe("userList", "changed", this.refreshVoters);
        this.subscribe("gm", "mode", this.refreshHint);
        this.subscribe("gm", "timer", this.refreshVoters);
    }

    refresh() {
        this.refreshHint();
        this.refreshVoters();
    }

    refreshVoters() {
        const userList = GetNamedModel('UserList');
        const gm = GetNamedModel('GameMaster');

        const voters = userList.joinedCount;
        let voted = 0;
        switch (gm.mode) {
            case 'seed':
                voted = userList.pickedCount;
                break;
            case 'match':
                voted = userList.votedCount;
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
        const gm = GetNamedModel('GameMaster');
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
        const gm = GetNamedModel('GameMaster');
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
        const localUser = GetNamedView("LocalUser");
        const gm = GetNamedModel("GameMaster");
        const picks = [-1, -1, -1];
        if (this.pick1 !== -1) picks[0] = gm.seed[this.pick1];
        if (this.pick2 !== -1) picks[1] = gm.seed[this.pick2];
        if (this.pick3 !== -1) picks[2] = gm.seed[this.pick3];
        localUser.setPicks(picks);
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
//-- MatchControls--------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MatchControls extends BoxWidget {
    constructor(...args) {
        super(...args);

        this.set({color: bgColor});

        this.round = new TextWidget(this, {anchor: [0.5, 0], pivot:[0.5, 0], style: 'bold', text: "Preliminaries"});
        this.vs = new TextWidget(this, {anchor: [0.5,0.5], pivot:[0.5,0.5], text: "vs."});
        this.checkBoxA = new CheckBoxWidget(this, {size: [300,50], anchor: [0.5,0.5], pivot:[0.5,1], local:[0,-20]});
        this.checkBoxB = new CheckBoxWidget(this, {size: [300,50], anchor: [0.5,0.5], pivot:[0.5,0], local:[0,20]});

        this.checkBoxA.toggle.onToggleOn = () => this.updateVote();
        this.checkBoxA.toggle.onToggleOff = () => this.updateVote();
        this.checkBoxB.toggle.onToggleOn = () => this.updateVote();
        this.checkBoxB.toggle.onToggleOff = () => this.updateVote();

        this.toggleSet = new ToggleSet();
        this.toggleSet.add(this.checkBoxA.toggle);
        this.toggleSet.add(this.checkBoxB.toggle);
    }

    refresh() {
        const gm = GetNamedModel('GameMaster');
        const m = gm.match;
        if (gm.mode === "winner") {
            this.round.setText("Winner!");
        } else if (m < 8) {
            this.round.setText("Preliminaries");
        } else if (m < 12) {
            this.round.setText("Quarterfinals");
        } else if (m < 14) {
            this.round.setText("Semifinals");
        } else {
            this.round.setText("Finals");
        }
        if (2*m+1 >= gm.seed.length) return;
        const a = gm.seed[2*m];
        const b = gm.seed[2*m+1];
        this.checkBoxA.label.setText(CharacterName(a));
        this.checkBoxB.label.setText(CharacterName(b));
    }

    resetVote() {
        this.vote = "x";
        this.checkBoxA.toggle.set({state: false});
        this.checkBoxB.toggle.set({state: false});
    }

    updateVote() {
        let vote ="x";
        if (this.checkBoxA.toggle.isOn) {
            vote = "a";
        } else if (this.checkBoxB.toggle.isOn) {
            vote = "b";
        }
        if (this.vote === vote) return;
        this.vote = vote;

        const gm = GetNamedModel('GameMaster');
        const localUser = GetNamedView('LocalUser');
        const data = {m: gm.match, v: this.vote};
        localUser.setVote(data);
    }
}

//------------------------------------------------------------------------------------------
//-- CheckBoxWidget ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class CheckBoxWidget extends Widget {
    constructor(...args) {
        super(...args);

        this.background = new BoxWidget(this, {autoSize: [1,1], color:[0.5, 0.5, 0.5]});
        this.horizontal = new HorizontalWidget(this.background, {autoSize:[1,1], margin:5, bubbleChanges: true});
        this.label = new TextWidget(null, {autoSize:[1,1], wrap: true, point:20});
        this.frame = new BoxWidget(null, {autoSize:[1,1], border: [5,5,5,5], color:[0.1, 0.1, 0.1], width: 50});

        this.horizontal.addSlot(this.label);
        this.horizontal.addSlot(this.frame);

        this.toggle = new ToggleWidget(this.frame, {autoSize:[1,1], border: [3,3,3,3]});
        this.toggle.normalOff.set({color: [0.7, 0.7, 0.7]});
        this.toggle.normalOn.set({color: [0.7, 0.7, 0.7]});
        this.toggle.hiliteOff.set({color: [0.8, 0.8, 0.8]});
        this.toggle.hiliteOn.set({color: [0.8, 0.8, 0.8]});
        this.toggle.pressedOff.set({color: [0.6, 0.6, 0.6]});
        this.toggle.pressedOn.set({color: [0.6, 0.6, 0.6]});

        this.toggle.setLabelOn(new ImageWidget(null, {autoSize:[1,1], url: check}));
        this.toggle.setLabelOff(new ImageWidget(null, {autoSize:[1,1]}));

    }
}

//------------------------------------------------------------------------------------------
//-- WinnerAnnunciator ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WinnerAnnunciator extends BoxWidget {
    constructor(...args) {
        super(...args);

        this.set({color: bgColor});

        this.round = new TextWidget(this, {anchor: [0.5,0], pivot: [0.5,0], style:'bold', text: "Winner!"});
        this.victor = new TextWidget(this, {anchor: [0.5,0], pivot: [0.5,0], local:[0,100], size: [500,100], point: 36, style:'bold', text: "Winner!"});
        this.pick = new PickPanel(this, {anchor: [0.5,1], pivot:[0.5,1], size:[320,50]});

    }

    refresh() {
        const gm = GetNamedModel('GameMaster');
        const match = gm.match;
        const winner = gm.winner;
        this.victor.setText(CharacterName(winner));
        this.pick.refresh();

        if (match < 8) {
            this.round.setText("Quarterfinalist!");
        } else if (match < 12) {
            this.round.setText("Semifinalist!");
        } else if (match < 14) {
            this.round.setText("Finalist!");
        } else {
            this.round.setText("Winner!");
        }
    }
}

class PickPanel extends BoxWidget {

    constructor(...args) {
        super(...args);

        this.set({color: bgColor});

        this.horizontal = new HorizontalWidget(this, {autoSize:[1,1]});

        this.box0 = new BoxWidget(null, {autoSize:[1,1], color: bgColor, width:50});
        this.horizontal.addSlot(this.box0);

        this.rank = new TextWidget(this.box0, {autoSize:[1,1], point: 28, text: "1"});

        this.box1 = new BoxWidget(null, {autoSize:[1,1], color: [0.5, 0.5, 0.5]});
        this.horizontal.addSlot(this.box1);

        this.name = new TextWidget(this.box1, {autoSize:[1,1], point: 20, border: [5,0,5,0], text: "Name"});

        this.box2 = new BoxWidget(null, {autoSize:[1,1], color: bgColor, width:50});
        this.horizontal.addSlot(this.box2);

        this.points = new TextWidget(this.box2, {autoSize:[1,1], point: 28, text: "+20", alignX: 'right'});
    }

    refresh() {
        const localUser = GetNamedView('LocalUser');
        const gm = GetNamedModel('GameMaster');
        const winner = gm.winner;
        const match = gm.match;
        const picks = localUser.user.picks;
        if (!picks) { this.hide(); return; }
        let round = 0;
        if (match > 7) round = 1;
        if (match > 11) round = 2;
        if (match > 13 ) round = 3;
        const first = picks[0];
        const second = picks[1];
        const third = picks[2];
        let points = 0;
        if (winner === first) {
            points = RoundPoints(round, 0);
            this.box0.set({color:[1,0,0]});
            this.rank.setText("1");
            this.name.setText(CharacterName(first));
            this.show();
        } else if (winner === second) {
            points = RoundPoints(round, 1);
            this.box0.set({color:[0,1,0]});
            this.rank.setText("2");
            this.name.setText(CharacterName(second));
            this.show();
        } else if (winner === third) {
            points = RoundPoints(round, 2);
            this.box0.set({color:[0.3,0.5,1]});
            this.rank.setText("3");
            this.name.setText(CharacterName(third));
            this.show();
        } else {
            this.hide();
        }
        this.points.setText("+" + points);
    }

}

