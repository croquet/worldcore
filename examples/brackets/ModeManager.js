import { Constants, Model } from "@croquet/croquet";
import { CharacterCount } from "./Characters";
import { QuestionCount, Question } from "./Questions";

export class ModeManager extends Model {

    init() {
        super.init();
        this.beWellKnownAs("ModeManager");
        this.seedTimeout = 600;
        this.matchTimeout = 5;
        this.scoreTimeout = 5;


        this.mode = "seed";
        this.round = 0;
        this.match = 0;

        this.startSeedMode();
    }

    startSeedMode() {
        this.mode = 'seed';
        this.generateSeed();
        this.timer = this.seedTimeout;
        this.publish("mode", "start", this.mode);
        this.publish("mode", "timer", this.timer);
        this.future(1000).tickSeedMode();
    }

    tickSeedMode() {
        this.timer -= 1;
        if (this.timer <= 0) {
            this.startMatchMode();
            return;
        }
        this.publish("mode", "timer", this.timer);
        this.future(1000).tickSeedMode();
    }

    startMatchMode() {
        this.mode = 'match';
        this.round = 0;
        this.match = 0;
        this.publish("mode", "start", this.mode);
        this.publish("mode", "timer", this.timer);
        this.startFirstRound();
    }

    startFirstRound() {
        this.publish("mode", "round", 1);
        this.startNextMatch();
    }

    startQuarterFinals() {
        this.publish("mode", "round", 2);
    }

    startSemiFinals() {
        this.publish("mode", "round", 3);
    }

    startFinals() {
        this.publish("mode", "round", 4);
    }

    startNextMatch() {
        switch (this.round) {
            case 0:
                if (this.match < 8) {
                    const a = this.seed[this.match * 2];
                    const b = this.seed[this.match * 2 + 1];
                    this.startMatch(a,b);
                    this.match++;
                } else {
                    this.startScoreMode();
                }
                break;
            default:
                this.startScoreMode();
        }
    }

    startMatch(a,b) {
        console.log(a + " vs " + b);
        this.timer = this.matchTimeout;
        this.publish("mode", "match", {a, b});
        this.future(1000).tickMatchMode();
    }

    tickMatchMode() {
        this.timer -= 1;
        if (this.timer <= 0) {
            this.startNextMatch();
            return;
        }
        this.publish("mode", "timer", this.timer);
        this.future(1000).tickMatchMode();
    }

    startScoreMode() {
        this.mode = 'score';
        this.timer = this.scoreTimeout;
        this.publish("mode", "start", this.mode);
        this.publish("mode", "timer", this.timer);
        this.future(1000).tickScoreMode();
    }

    tickScoreMode() {
        this.timer -= 1;
        if (this.timer <= 0) {
            this.startSeedMode();
            return;
        }
        this.publish("mode", "timer", this.timer);
        this.future(1000).tickScoreMode();
    }

    generateSeed() {
        this.qDeck = this.shuffleDeck(QuestionCount());
        this.cDeck = this.shuffleDeck(CharacterCount());
        this.question = this.qDeck.pop();
        this.seed = [];
        for (let i = 0; i < 16; i++) this.seed.push(this.cDeck.pop());
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
ModeManager.register("ModeManager");
