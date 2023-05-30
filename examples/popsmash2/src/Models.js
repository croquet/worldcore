import { AM_Behavioral,  UserManager, ModelRoot,  Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel} from "@croquet/worldcore";
import { Question, QuestionCount } from "./Questions";
import { CharacterName, CharacterCount } from "./Characters";


//------------------------------------------------------------------------------------------
// -- Game ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class Game extends mix(Actor).with(AM_Behavioral) {

    get mode() {return this._mode || "match"}
    get timer() {return this._timer || 0}
    get question() {return this._question || "81 pop-culture characters face off in a single-elimination tournament. There can be only one!"}
    get round() {return this._round || "PopSmash!"}
    get match() {return this._match || 0}
    get matchCount() {return this._matchCount || 0}
    get slate() { return this._slate || ["Pick A"," Pick B"," Pick C"]}
    get winner() { return this._winner || 0}
    get tally() { return this._tally|| [0,0,0]}
    get running() { return this._running }

    reset() {
        console.log("reset");
        this.behavior.destroyChildren();
        const question = Question(Math.floor(QuestionCount()*Math.random()));
        const shuffle = Shuffle(CharacterCount());
        this.deck = [];
        for (let n = 0; n<81; n++) this.deck.push(CharacterName(shuffle.pop()));
        this.set({question, running: true});

        const End = {name: "SetBehavior", running: false, round: "The Winner!"};

        const behaviors = ["Preliminaries", "Quarterfinals","Semifinals","Finals", End];
        this.behavior.start({name: "SequenceBehavior", behaviors});
    }
}
Game.register('Game');


//------------------------------------------------------------------------------------------
// -- Round --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Round extends Behavior {
    get slate() {return this.actor.deck}
    get title() {return this._title || "???"}

    onStart() {
        const round = this.title;
        const match = 0;
        const matchCount = this.slate.length/3;
        this.actor.set({round, match, matchCount});
        this.result = [];
        this.nextMatch();
    }

    nextMatch() {
        this.destroyChildren();
        const slate = [];
        for (let i = 0; i <3; i++) {
            slate.push(this.slate.pop());
        }
        const match = this.actor.match+1;
        this.actor.set({match});
        this.start({name: "Match", slate});
    }

    onSucceed(child,n) {
        this.result.push(n);
        if (this.slate.length === 0) {
            this.actor.deck = this.result.reverse();
            this.future(3000).end();
            return;
        }
        this.future(3000).nextMatch();
    }

    end() {
        console.log("round end!");
        this.succeed();
    }

}
Round.register('Round');

class Preliminaries extends Round { get title() {return "Preliminaries"} } Preliminaries.register('Preliminaries');
class Quarterfinals extends Round { get title() {return "Quarterfinals"} } Quarterfinals.register('Quarterfinals');
class Semifinals extends Round { get title() {return "Semifinals"} } Semifinals.register('Semifinals');
class Finals extends Round { get title() {return "Finals"} } Finals.register('Finals');

//------------------------------------------------------------------------------------------
// -- Match --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Match extends Behavior {

    get slate() {return this._slate || [0,0,0]}
    get synched() {return true}
    get tickRate() { return 1000 }

    onStart() {
        this.count = 20;
        this.election = this.start({name: "Election", size: 3});
        this.actor.set({mode: "vote", winner: 0, slate: this.slate});
    }

    do() {
        const timer = this.count--;
        this.actor.set({timer});
        if (timer <= 0) this.end();
    }

    end() {
        const winner = this.election.winner();
        this.actor.set({winner, mode: "rank"});
        this.succeed(this.slate[winner]);
    }

}
Match.register('Match');

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
        this.game = Game.create({pawn: "GamePawn"});
        this.subscribe("hud", "start", this.startGame);
    }

    startGame() {
        this.game.reset();
    }

}
MyModelRoot.register("MyModelRoot");
