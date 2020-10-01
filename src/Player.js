import { Model } from "@croquet/croquet";
import { NamedView } from "./NamedView";
import { RegisterMixin } from "./Mixins";

//------------------------------------------------------------------------------------------
//-- PlayerManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session.

export class PlayerManager extends Model {

    init() {
        super.init();
        this.beWellKnownAs('PlayerManager');
        this.players = new Map();
        this.subscribe(this.sessionId, "view-join", this.join);
        this.subscribe(this.sessionId, "view-exit", this.exit);
    }

    destroy() {
        super.destroy();
        this.players = null;
    }

    join(viewId) {
        if (!PlayerManager.playerType) return;
        const player = PlayerManager.playerType.create({playerId: viewId});
        if (this.players.has(viewId)) console.warn("PlayerManager received duplicate view-join for viewId " + viewId);
        this.players.set(viewId, player);
        this.subscribe(player.id, "playerChanged", this.playerChanged);
        this.listChanged();
    }

    exit(viewId) {
        if (!PlayerManager.playerType) return;
        const player = this.players.get(viewId);
        if (!player) console.warn("PlayerManager received duplicate view-exit for viewId " + viewId);
        this.unsubscribe(player.id, "playerChanged");
        player.destroy();
        this.players.delete(viewId);
        this.listChanged();
    }

    get count() {
        return this.users.size;
    }

    listChanged() {
        this.publish("playerManager", "listChanged");
    }

    playerChanged() {
        this.publish("playerManager", "playerChanged");
    }

}
PlayerManager.register("PlayerManager");


//------------------------------------------------------------------------------------------
//-- Player --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The player actor is automatically created whenever a player joins. You should only ever
// declare one actor as the player actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Player = superclass => class extends superclass {

    static register(...args) {
        super.register(...args);
        if (PlayerManager.playerType) (console.warn("Multiple player actors declared!!"));
        PlayerManager.playerType = this;
    }

    init(pawnType, options) {
        if (options) { this.playerId = options.playerId; }   // The playerId of the player that owns this actor.
        super.init(pawnType, options);
    }

    playerChanged() {
        this.say("playerChanged");
    }

};
RegisterMixin(AM_Player);

//-- Pawn ----------------------------------------------------------------------------------

// It's ok for there to be multiple pawns to be declared as player pawns. This way you can have a player
// pawn with multiple sub-pawns that all can check if they belong to the local player.

export const PM_Player = superclass => class extends superclass {

    // Returns true if the pawn or any parent is owned by the local player.

    get isMyPlayerPawn() {
        let p = this;
        do {
            if (p.actor.playerId === p.viewId) return true;
            p = p.parent;
        } while (p);
        return false;
    }

};
