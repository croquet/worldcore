import { Model } from "@croquet/croquet";
import { CharacterCount } from "./Characters";
import { QuestionCount } from "./Questions";
import { RoundPoints } from "./Points";

export class GameMaster extends Model {
    init() {
        super.init();
        this.beWellKnownAs("GameMaster");
        this.question = 0;
        this.timer = 0;
        this.startLobby();
        this.subscribe("hud", "startGame", this.startSeed);
        // this.subscribe("hud", "resetScores", this.resetScores);
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
        this.setMode('lobby');
    }

    startSeed() {
        const players = this.wellKnownModel("PlayerManager").players;
        players.forEach(player => { player.picks = [-1, -1, -1];});
        this.makeDecks();
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
        this.setTimer(5);
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
                    player.score += RoundPoints(round, 0);
                } else if (picks[1] === this.winner) {
                    player.score += RoundPoints(round, 1);
                } else if (picks[2] === this.winner) {
                    player.score += RoundPoints(round, 2);
                }
             }
        });
        this.startWin();
    }

    startWin() {
        console.log("Starting win!");
        this.setMode('win');
        this.setTimer(5);
        this.inCountdown = true;
        this.future(1000).tickWin();
    }

    tickWin() {
        this.setTimer(this.timer-1)
        if (this.timer <= 0) {
            this.match++;
            if (this.match > 13) {
                this.series++;
                this.startFinale();
            } else {
                this.startDebate();
            }
            return;
        }
        this.future(1000).tickWin();

    }

    startFinale() {
        this.setMode('finale');
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

//--------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------

export class GameMaster2 extends Model {
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
        this.subscribe("playerManager", "listChanged", this.checkReset);
        this.subscribe("playerManager", "playerChanged", this.checkTimer);
    }

    checkReset() {
        console.log("listChanged");
        const playerManager = this.wellKnownModel("PlayerManager");
        console.log(playerManager.joinedCount);
        if (playerManager.joinedCount === 0) {
            console.log("Start lobby!");
            this.startLobbyMode();
            return;
        }
    }

    checkTimer() {
        const playerManager = this.wellKnownModel("PlayerManager");
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
GameMaster2.register("GameMaster2");

