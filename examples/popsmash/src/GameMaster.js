import { Model } from "@croquet/croquet";
import { CharacterCount } from "./Characters";
import { QuestionCount } from "./Questions";
import { RoundPoints } from "./Points";

export class GameMaster extends Model {
    init() {
        super.init();
        this.beWellKnownAs("GameMaster");
        this.series = 0;
        this.question = 0;
        this.timer = 0;
        this.startLobby();
        this.subscribe("hud", "startGame", this.startSeed);
        this.subscribe("hud", "resetScores", this.resetScores);
        this.subscribe("playerManager", "listChanged", this.checkReset);
        this.subscribe("playerManager", "playerChanged", this.checkTimer);
    }

    setMode(m) {
        this.mode = m;
        this.publish("gm", "mode", m);
    }

    setTimer(t) {
        this.timer = t;
        this.publish("gm", "timer", t);
    }

    resetScores() {
        const pm = this.wellKnownModel("PlayerManager");
        pm.players.forEach(player => { player.score = 0; player.playerChanged(); });
    }

    checkReset() {
        const playerManager = this.wellKnownModel("PlayerManager");
        if (playerManager.joinedCount === 0) this.startLobby();
    }

    checkTimer() {
        switch (this.mode) {
            case "seed":
                this.checkSeed();
                break;
            case "vote":
                this.checkVote();
                break;
        }
    }

    startLobby() {
        const players = this.wellKnownModel("PlayerManager").players;
        players.forEach(player => {
            player.picks = [-1, -1, -1];
            player.points = [0,0,0];
        });
        this.setMode('lobby');
    }

    startSeed() {

        if (this.series % 5 === 0) this.makeDecks();

        this.question = this.questionDeck.pop();
        this.seed = [];
        this.brackets = [];
        for (let i = 0; i < 16; i++) {
            const c = this.characterDeck.pop();
            this.seed.push(c);
            this.brackets.push(c);
        }
        this.shuffle(this.brackets);
        this.setMode('seed');
        this.checkSeed();
    }

    checkSeed() {
        const pm = this.wellKnownModel("PlayerManager");
        const done = pm.joinedCount === pm.pickedCount;
        if (done === this.inCountdown) return;
        this.inCountdown = done;
        if (!this.inCountdown) return;
        this.setTimer(5);
        this.future(1000).tickSeed();
    }

    tickSeed() {
        if (!this.inCountdown) return;
        this.setTimer(this.timer-1)
        if (this.timer <= 0) {
            this.inCountdown = false;
            this.match = 0;
            this.startDebate();
            return;
        }
        this.future(1000).tickSeed();
    }

    startDebate() {
        this.setMode('debate');
        this.setTimer(20);
        this.inCountdown = true;
        this.future(1000).tickDebate();
    }

    tickDebate() {
        this.setTimer(this.timer-1)
        if (this.timer <= 0) {
            this.startVote();
            return;
        }
        this.future(1000).tickDebate();

    }

    startVote() {
        const players = this.wellKnownModel("PlayerManager").players;
        players.forEach(player => { player.vote = "x";});
        this.setMode('vote');
        this.checkVote();
    }

    checkVote() {
        const pm = this.wellKnownModel("PlayerManager");
        const done = pm.joinedCount === pm.votedCount;
        if (done === this.inCountdown) return;
        this.inCountdown = done;
        if (!this.inCountdown) return;
        this.setTimer(5);
        this.future(1000).tickVote();
    }

    tickVote() {
        if (!this.inCountdown) return;
        this.setTimer(this.timer-1)
        if (this.timer <= 0) {
            this.inCountdown = false;
            this.endVote();
            return;
        }
        this.future(1000).tickVote();
    }

    endVote() {
        const players = this.wellKnownModel('PlayerManager').players;
        let aVotes = 0;
        let bVotes = 0;
        players.forEach( player => {
            if (!player.hasVoted) return;
            if (player.vote === 'a') {
                aVotes++;
            } else if (player.vote === 'b') {
                bVotes++;
            }
        });

        const a = this.brackets[this.match * 2];
        const b = this.brackets[this.match * 2 + 1];
        if (aVotes > bVotes) {
            this.winner = a;
        } else if (bVotes > aVotes) {
            this.winner = b;
        } else if (Math.random > 0.5) {
            this.winner = a;
        } else {
            this.winner = b;
        }
        this.brackets.push(this.winner);

        let round = 0;
        if (this.match > 7) round = 1;
        if (this.match > 11) round = 2;
        if (this.match > 13 ) round = 3;

        players.forEach(player => {
            const picks = player.picks;
            if (picks) {
                if (picks[0] === this.winner) {
                    player.points[0] += RoundPoints(round, 0);
                } else if (picks[1] === this.winner) {
                    player.points[1] += RoundPoints(round, 1);
                } else if (picks[2] === this.winner) {
                    player.points[2] += RoundPoints(round, 2);
                }
             }
        });
        this.startWin();
    }

    startWin() {
        const players = this.wellKnownModel('PlayerManager').players;
        this.setMode('win');
        let t = 5;
        if (this.match === 14) {
            t = 30;
            players.forEach(player => {
                player.setScore(player.score + player.points[0] + player.points[1] + player.points[2]);
            })
        }
        this.setTimer(t);
        this.inCountdown = true;
        this.future(1000).tickWin();
    }

    tickWin() {
        this.setTimer(this.timer-1)
        if (this.timer <= 0) {
            this.match++;
            if (this.match > 14) {
                this.series++;
                this.startLobby();
            } else {
                this.startDebate();
            }
            return;
        }
        this.future(1000).tickWin();

    }

    makeDecks() {
        this.questionDeck = [];
        for (let i = 0; i < QuestionCount(); i++) this.questionDeck.push(i);
        this.shuffle(this.questionDeck);

        this.characterDeck = [];
        for (let i = 0; i < CharacterCount(); i++) this.characterDeck.push(i);
        this.shuffle(this.characterDeck);
    }

    shuffle(deck) {
        let size = deck.length;
        while (size) {
            const pick = Math.floor(Math.random() * size--);
            const swap = deck[size];
            deck[size] = deck[pick];
            deck[pick] = swap;
        }
    }

}
GameMaster.register("GameMaster");

