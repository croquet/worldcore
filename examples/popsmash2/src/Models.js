import { AM_Behavioral,  UserManager, ModelRoot,  Actor, mix, ModelService, Behavior, Shuffle} from "@croquet/worldcore";
import { Question, QuestionCount } from "./Questions";
import { CharacterName, CharacterCount } from "./Characters";


//------------------------------------------------------------------------------------------
// -- Game ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class Game extends mix(Actor).with(AM_Behavioral) {

    get mode() {return this._mode || "match"}
    get timer() {return this._timer || 0}
    get question() {return this._question || "???"}
    get round() {return this._round || "Preliminaries"}
    get slate() { return this._slate || ["A","B","C"]}
    get tally() { return this._tally|| [0,0,0]}

    reset() {
        console.log("reset");
        this.behavior.destroyChildren();
        const question = Question(Math.floor(QuestionCount()*Math.random()));
        const shuffle = Shuffle(CharacterCount());
        this.deck = [];
        for (let n = 0; n<3; n++) this.deck.push(CharacterName(shuffle.pop()));
        this.set({question, slate:this.deck});
        this.behavior.start({name: "Match", slate: this.deck});
    }
}
Game.register('Game');

//------------------------------------------------------------------------------------------
// -- Round --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Round extends Behavior {
    get slate() {return this._slate}
    get title() {return this._title || "bing"}

    onStart() {
        const round = this.title;
        this.actor.set({round});
        this.result = [];
        const slate = [];
        for (let i = 0; i <3; i++) {
            slate.push(this.slate.pop());
        }
        this.start({name: "Match", slate});
    }

    onSucceed(child,n) {
        this.result.push(n);
        console.log(this.result);
        if (this.slate.length === 0) {
            console.log(this.title);
            console.log(this.result);
            this.succeed(this.result);
            return;
        }
        const slate = [];
        for (let i = 0; i <3; i++) {
            slate.push(this.slate.pop());
        }
        this.start({name: "Match", slate});
    }
}
Round.register('Round');

//------------------------------------------------------------------------------------------
// -- Match --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Match extends Behavior {

    get slate() {return this._slate || [0,0,0]}
    get synched() {return true}
    get tickRate() { return 1000 }

    onStart() {
        this.count = 10;
        this.actor.set({mode: "vote"});
        // const vm = this.service("VoteManager");
        // vm.reset(3);
        this.actor.set({slate: this.slate});
    }

    do() {
        const timer = this.count--;
        this.actor.set({timer});
        if (timer <= 0) this.end();
    }

    end() {
        this.actor.set({mode: "rank"});
        // const vm = this.service("VoteManager");
        // const n = vm.winner();
        // this.result = this.slate[n];
        // this.publish("game", "mode", "result");
        this.succeed(this.result);
    }

}
Match.register('Match');


//------------------------------------------------------------------------------------------
// -- Timer --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// class Timer extends Behavior {

//     get synched() {return true}
//     get count() {return this._count || 30}

//     do() {
//         const count = this.count-1;
//         this.publish("timer", "tick", count);
//         this.set({count});
//         if (count <= 0) this.succeed();
//     }
// }
// Timer.register('Timer');

//------------------------------------------------------------------------------------------
// -- VoteManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class VoteManager extends ModelService {
    init() {
        super.init('VoteManager');
        this.votes = new Map();
        this.tally = [0,0,0];
        this.subscribe("hud", "vote", this.onVote);
        this.subscribe("UserManager", "destroy", this.removeUser);
    }

    reset(count) {
        this.tally = new Array(count).fill(0);
        this.publish("VoteManager", "update", this.tally);
    }

    removeUser(user) {
        this.votes.delete(user);
        this.count();
        this.publish("VoteManager", "update", this.tally);
    }

    onVote(data) {
        this.votes.set(data.user, data.pick);
        this.count();
        this.publish("VoteManager", "update", this.tally);
    }

    count() {
        this.tally.fill(0);
        this.votes.forEach(n => this.tally[n]++);
    }

    winner() {
        this.count();
        let victor = 0;
        let highest = this.tally[victor];
        this.tally.forEach((v,n) => {
            if (v>highest) {
                highest = v;
                victor = n;
            }
        });
        return victor;
    }

}
VoteManager.register('VoteManager');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [UserManager, VoteManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");
        this.game = Game.create({pawn: "GamePawn"});
        this.subscribe("hud", "start", this.startGame);
    }

    startGame() {
        this.game.reset();
    }

}
MyModelRoot.register("MyModelRoot");
