import { Actor, Pawn, mix, AM_Player, PM_Player, PlayerManager } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// MyPlayerManager
//------------------------------------------------------------------------------------------

export class MyPlayerManager extends PlayerManager {

    get playerCount() {
        this.players.size;
    }

    get joinedCount() {
        let n = 0;
        this.players.forEach(player => { if (player.isJoined) n++; });
        return n;
    }

    get pickedCount() {
        let n = 0;
        this.players.forEach(player => { if (player.isJoined && player.hasPicked) n++; });
        return n;
    }

    get votedCount() {
        let n = 0;
        this.players.forEach(player => { if (player.isJoined && player.hasVoted) n++; });
        return n;
    }

}
MyPlayerManager.register('MyPlayerManager');

//------------------------------------------------------------------------------------------
// PlayerActor
//------------------------------------------------------------------------------------------

class PlayerActor extends mix(Actor).with(AM_Player) {
    init(options) {
        super.init("PlayerPawn", options);
        this.name = null;
        this.score = 0
        this.picks = [-1,-1,-1];
        this.vote = 'x';
        this.listen("setName", name => {this.name = name; this.playerChanged();});
        this.listen("setPicks", picks => {this.picks = picks; this.playerChanged();});
        this.listen("setVote", vote => {this.vote = vote; this.playerChanged();});
    }

    get isJoined() {
        return this.name;
    }

    get hasPicked() {
        return this.picks[0] >= 0 && this.picks[1] >= 0 && this.picks[2] >= 0;
    }

    get hasVoted() {
        return this.vote !== 'x';
    }

}
PlayerActor.register('PlayerActor');

//------------------------------------------------------------------------------------------
// PlayerPawn
//------------------------------------------------------------------------------------------

let playerPawn;

export function MyPlayerPawn() {return playerPawn;}

class PlayerPawn extends mix(Pawn).with(PM_Player) {
    constructor(...args) {
        super(...args);
        if (this.isMyPlayerPawn) playerPawn = this;
    }

    destroy() {
        if (this.isMyPlayerPawn) playerPawn = null;
        super.destroy();
    }

    setName(name) { this.say("setName", name); }

    setPicks(picks) {this.say("setPicks", picks);}
    setVote(vote) {this.say("setVote", vote);}

}
PlayerPawn.register('PlayerPawn');
