import { AM_Behavioral,  UserManager, ModelRoot,  Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel} from "@croquet/worldcore";
import { Question, QuestionCount } from "./Questions";
import { CharacterName, CharacterCount } from "./Characters";

//------------------------------------------------------------------------------------------
// -- Game ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Game extends mix(Actor).with(AM_Behavioral) {

    get mode() { return this._mode || "vote"}
    get timer()  {return this._timer || 0}
    get round() { return this._round || "PopSmash!"}
    get question() { return this._question || "81 pop-culture characters face off in a single-elimination tournament. There can be only one!"}
    get match() {return this._match || 0}
    get matchCount() {return this._matchCount || 0}
    get slate() { return this._slate || ["Pick A"," Pick B"," Pick C"]}
    get tally() { return this._tally|| [0,0,0]}
    get rank() { return this._rank || ["A"," B","C"]}
    get running() { return this._running}

    init(options) {
        super.init(options);
        this.subscribe("hud", "start", this.start);
    }

    timerSet() {
        if (this.timer === 0) this.endMatch();
    }

    start() {
        this.matchTime = 20;
        const question = Question(Math.floor(QuestionCount()*Math.random()));
        const running = true;
        const shuffle = Shuffle(CharacterCount());
        this.deck = [];
        for (let n = 0; n<81; n++) this.deck.push(CharacterName(shuffle.pop()));
        this.set({question, running});

        this.startRound("Preliminaries");
    }

    done() {
        const round = "The Supreme Champion!";
        this.set({round});
        this.future(10000).set({running: false});
    }

    startRound(round) {
        switch (round) {
            default:
            case "Preliminaries": this.matchTime = 15; break;
            case "Quarterfinals": this.matchTime = 20; break;
            case "Semifinals": this.matchTime = 30; break;
            case "Finals": this.matchTime = 60; break;
        }
        this.results = [];
        const match = 0;
        const matchCount = this.deck.length / 3;
        this.set({round, match, matchCount});
        this.startMatch();
    }

    endRound() {
        this.deck = this.results.reverse();

        switch (this.round) {
            default:
            case "Preliminaries": this.startRound("Quarterfinals"); break;
            case "Quarterfinals": this.startRound("Semifinals"); break;
            case "Semifinals": this.startRound("Finals"); break;
            case "Finals": this.done(); break;
        }
    }

    startMatch() {
        this.behavior.destroyChildren();
        const mode = "vote";
        const match = this.match+1;
        const slate = [];
        for (let i = 0; i <3; i++) {
            slate.push(this.deck.pop());
        }

        this.set({mode, match, slate});
        this.behavior.start({name: "Countdown", count: this.matchTime});
        this.election = this.behavior.start({name: "Election", size: 3});
    }

    endMatch() {
        const mode = "rank";
        const rank = [0,0,0];

        switch (this.election.winner()) {
            default:
            case 0: rank[0] = this.slate[0]; rank[1] = this.slate[1]; rank[2] = this.slate[2]; break;
            case 1: rank[0] = this.slate[1]; rank[1] = this.slate[0]; rank[2] = this.slate[2]; break;
            case 2: rank[0] = this.slate[2]; rank[1] = this.slate[0]; rank[2] = this.slate[1]; break;
        }
        this.results.push(rank[0]);
        this.set({mode, rank});

        if (this.deck.length > 0) {
            this.future(3000).startMatch();
        } else {
            this.future(3000).endRound();
        }

    }
}
Game.register('Game');

//------------------------------------------------------------------------------------------
// -- Countdown ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Countdown extends Behavior {

    get count() {return this._count || 10}
    get synched() {return true}
    get tickRate() { return 1000 }

    onStart() {
        const timer = this.count+1;
        this.actor.set({timer});
    }

    do() {
        const timer = this.actor.timer-1;
        this.actor.set({timer});
        if (timer <= 0) this.succeed();
    }
}
Countdown.register('Countdown');

//------------------------------------------------------------------------------------------
// -- Election -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Election extends Behavior {

    get size() {return this._size || 3}

    onStart() {
        this.votes = new Map();
        this.subscribe("election", "vote", this.onVote);
        this.subscribe("UserManager", "destroy", this.removeUser);
        this.count();
    }

    onVote(data) {
        this.votes.set(data.user, data.pick);
        this.count();
    }

    removeUser(user) {
        this.votes.delete(user);
        this.count();
    }

    count() {
        const tally = new Array(this.size).fill(0);
        this.votes.forEach(n => tally[n]++);
        this.actor.set({tally});
    }

    winner() {
        this.count();
        let victor = 0;
        let max = this.actor.tally[victor];
        this.actor.tally.forEach((v,n) => {
            if (v>max) {
                max = v;
                victor = n;
            }
        });
        return victor;
    }
}
Election.register('Election');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [UserManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!!");
        this.game = Game.create();
    }

}
MyModelRoot.register("MyModelRoot");
