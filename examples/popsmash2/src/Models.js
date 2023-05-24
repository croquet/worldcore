import { AM_Behavioral,  UserManager, ModelRoot,  Actor, mix, ModelService, Behavior, Shuffle} from "@croquet/worldcore";
import { QuestionCount } from "./Questions";
import { CharacterName, CharacterCount } from "./Characters";


//------------------------------------------------------------------------------------------
// -- Game ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Game extends mix(Actor).with(AM_Behavioral) {
    init(options) {
        super.init(options);
        this.question = Math.floor(QuestionCount()*Math.random());
        this.round = "xxx";
        const shuffle = Shuffle(CharacterCount());
        this.slate = [0,0,0];
        this.deck = [];
        for (let n = 0; n<9; n++) this.deck.push(CharacterName(shuffle.pop()));

        this.behavior.start({name: "Round", title: "Preliminaries", slate: this.deck});

        this.publish("game", "start");
    }
}
Game.register('Game');

//------------------------------------------------------------------------------------------
// -- Round --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Round extends Behavior {
    get slate() {return this._slate}
    get title() {return this._title}

    onStart() {
        this.actor.round = this.title;
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
    get count() {return this._count ||21}
    get tickRate() { return 1000 }

    onStart() {
        const vm = this.service("VoteManager");
        vm.reset(3);
        this.actor.slate = this.slate;
        this.publish("game", "mode", "match");
    }

    do() {
        const count = this.count-1;
        this.publish("timer", "tick", count);
        this.set({count});
        if (count <= 0) this.end();
    }

    end() {
        const vm = this.service("VoteManager");
        const n = vm.winner();
        this.result = this.slate[n];
        this.publish("game", "mode", "result");
        this.future(3000).succeed(this.result);
    }

}
Match.register('Match');


//------------------------------------------------------------------------------------------
// -- Timer --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Timer extends Behavior {

    get synched() {return true}
    get count() {return this._count || 30}

    do() {
        const count = this.count-1;
        this.publish("timer", "tick", count);
        this.set({count});
        if (count <= 0) this.succeed();
    }
}
Timer.register('Timer');

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
        this.game = Game.create();
        this.subscribe("hud", "start", this.startGame);
    }

    startGame() {
        if (this.game) this.game.destroy();
        this.game = Game.create();
    }

}
MyModelRoot.register("MyModelRoot");
