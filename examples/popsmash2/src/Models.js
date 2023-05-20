import { AM_Behavioral,  UserManager, ModelRoot,  Actor, mix, ModelService, Behavior} from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
// -- Game ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Game extends mix(Actor).with(AM_Behavioral) {
}
Game.register('Game');

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
        this.game.behavior.start({name: "Timer", tickRate: 1000, count: 60});
    }

}
MyModelRoot.register("MyModelRoot");
