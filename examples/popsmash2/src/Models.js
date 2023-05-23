import { AM_Behavioral,  UserManager, ModelRoot,  Actor, mix, ModelService, Behavior, Shuffle} from "@croquet/worldcore";
import { QuestionCount } from "./Questions";
import { CharacterCount } from "./Characters";


//------------------------------------------------------------------------------------------
// -- Game ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Game extends mix(Actor).with(AM_Behavioral) {
    init(options) {
        super.init(options);
        this.question = Math.floor(QuestionCount()*Math.random());
        const shuffle = Shuffle(CharacterCount());
        this.slate = [];
        for (let n = 0; n<81; n++) this.slate.push(shuffle.pop());
        console.log(this.slate);

        this.publish("game", "start");
    }
}
Game.register('Game');

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
    }

    onVote(data) {
        this.votes.set(data.user, data.pick);
        this.count();
    }

    count() {
        this.tally.fill(0);
        this.votes.forEach(n => this.tally[n]++);
        this.publish("VoteManager", "update", this.tally);
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
        this.game.behavior.start({name: "Timer", tickRate: 1000, count: 61});
    }

}
MyModelRoot.register("MyModelRoot");
