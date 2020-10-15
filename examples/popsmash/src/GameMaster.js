import { Model } from "@croquet/croquet";
import { CharacterCount } from "./Characters";
import { QuestionCount } from "./Questions";
import { RoundPoints } from "./Points";

export class GameMaster extends Model {
    init() {
        super.init();
        this.beWellKnownAs("GameMaster");

        this.mode = 'lobby';
        this.series = 0;

        this.timer = 5;
        this.inCountdown = false;

        this.question = 0;
        this.match = 0;     // 0-7 = round one, 8-11 = quarterfinals, 12-13 = semifinals, 14 = finals
        this.seed = [0,1];

        this.voters = 0;
        this.aVotes = 0;
        this.bVotes = 0;
        this.winner = 0;
        this.loser = 0;

        this.startLobbyMode();

        this.subscribe("hud", "startGame", this.startGame);
        this.subscribe("hud", "resetScores", this.resetScores);
        this.subscribe("playerManager", "playerChanged", this.checkTimer);
    }

    checkTimer() {
        const playerManager = this.wellKnownModel("PlayerManager");
        if (playerManager.playerCount === 0) {
            this.startLobbyMode();
            return;
        }
        let done = false;
        switch (this.mode) {
            case 'seed':
                done = playerManager.joinedCount === playerManager.pickedCount;
                break;
            case 'match':
                done = playerManager.joinedCount === playerManager.votedCount;
                break;
            case 'winner':
                done = true;
                break;
            default:
        }
        if (done === this.inCountdown) return;
        this.timer = 5;
        this.publish("gm", "timer", this.timer);
        this.inCountdown = done;
        switch (this.mode) {
            case 'seed':
                if (done) this.future(1000).tickSeedMode();
                break;
            case 'match':
                this.future(1000).tickMatch();
                break;
            case 'winner':
                this.future(1000).tickWinner();
                break;
            default:
        }
    }

    startLobbyMode() {
        console.log("lobby!");
        this.mode = 'lobby';
        this.publish("gm", "mode", this.mode);
    }

    startGame() {
        console.log("start game!");
        this.startSeedMode();
    }

    resetScores() {
        const pm = this.wellKnownModel("PlayerManager");
        pm.players.forEach(player => { player.score = 0; });
        pm.listChanged();
    }

    startSeedMode() {
        console.log("seed!");
        const players = this.wellKnownModel("PlayerManager").players;
        players.forEach(player => { player.picks = [-1, -1, -1];});

        this.mode = 'seed';
        this.timer = 20;
        this.countdown = 30;

        if (this.series % 5 === 0) this.shuffle();

        this.question = this.questionDeck.pop();

        this.seed = [];
        for (let i = 0; i < 16; i++) this.seed.push(this.characterDeck.pop());

        this.mode = 'seed';
        this.publish("gm", "mode", this.mode);
        this.checkTimer();
    }

    tickSeedMode() {
        if (!this.inCountdown) return;
        this.timer--;
        if (this.timer <= 0) {
            this.inCountdown = false;
            this.startMatchMode();
            return;
        }
        this.publish("gm", "timer", this.timer);
        this.future(1000).tickSeedMode();
    }

    startMatchMode() {
        console.log("match!");
        this.match = 0;
        this.publish("gm", "mode", this.mode);
        this.startMatch();
    }

    startMatch() {
        const players = this.wellKnownModel("PlayerManager").players;
        this.mode = 'match';
       players.forEach(player => { player.vote = 'x';});
        this.publish("gm", "timer", this.timer);
        this.publish("gm", "mode", this.mode);
        this.checkTimer();
    }

    tickMatch() {
        if (!this.inCountdown) return;
        this.timer--;
        if (this.timer <= 0) {
            this.inCountdown = false;
            this.endMatch();
            return;
        }
        this.publish("gm", "timer", this.timer);
        this.future(1000).tickMatch();
    }

    endMatch() {
        this.tallyVotes();
        const a = this.seed[this.match * 2];
        const b = this.seed[this.match * 2 + 1];
        if (this.aVotes > this.bVotes) {
            this.winner = a;
            this.loser = b;
        } else if (this.bVotes > this.aVotes) {
            this.winner = b;
            this.loser = a;
        } else if (Math.random > 0.5) {
            this.winner = a;
            this.loser = b;
        } else {
            this.winner = b;
            this.loser = a;
        }
        this.seed.push(this.winner);

        let round = 0;
        if (this.match > 7) round = 1;
        if (this.match > 11) round = 2;
        if (this.match > 13 ) round = 3;

        const players = this.wellKnownModel("PlayerManager").players;
        players.forEach(player => {
            const picks = player.picks;
            if (picks) {
                if (picks[0] === this.winner) {
                    player.score += RoundPoints(round, 0);
                } else if (picks[1] === this.winner) {
                    player.score += RoundPoints(round, 1);
                } else if (picks[2] === this.winner) {
                    player.score += RoundPoints(round, 2);
                }
             }
        });


        this.startWinner();
    }

    tallyVotes() {
        // if (this.mode !== 'match') return;
        const players = this.wellKnownModel('PlayerManager').players;
        let voters = 0;
        let aVotes = 0;
        let bVotes = 0;
        players.forEach((value, key) => {
            const player = value;
            if (player.hasVoted) {
                voters++;
                if (player.vote === 'a') {
                    aVotes++;
                } else if (player.vote === 'b') {
                    bVotes++;
                }
            }
        });
        this.voters = voters;
        this.aVotes = aVotes;
        this.bVotes = bVotes;
    }

    startWinner() {
        console.log("winner!");
        this.mode = 'winner';
        this.timer = 20;
        this.publish("gm", "timer", this.timer);
        this.publish("gm", "mode", this.mode);
        this.checkTimer();
    }

    tickWinner() {
        if (!this.inCountdown) return;
        this.timer--;
        if (this.timer <= 0) {
            this.inCountdown = false;
            if (this.match > 13) {
                this.series++;
                this.startLobbyMode();
            } else {
                this.match++;
                this.startMatch();
            }
            return;
        }
        this.publish("gm", "timer", this.timer);
        this.future(1000).tickWinner();
    }

    startScoreMode() {
        this.mode = 'score';
        this.match = 0;
        this.publish("gm", "mode", this.mode);
    }

    shuffle() {
        this.questionDeck = this.shuffleDeck(QuestionCount());
        this.characterDeck = this.shuffleDeck(CharacterCount());
    }

    shuffleDeck(size) {
        const deck = [];
        for (let i = 0; i < size; i++) deck.push(i);
        while (size) {
            const pick = Math.floor(Math.random() * size--);
            const swap = deck[size];
            deck[size] = deck[pick];
            deck[pick] = swap;
        }
        return deck;
    }
}
GameMaster.register("GameMaster");

