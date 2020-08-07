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
        this.players = null;
    }

    join(viewId) {
        if (!PlayerManager.playerType) return;
        const player = PlayerManager.playerType.create({playerId: viewId});
        this.players.set(viewId, player);
        this.listChanged();
    }

    exit(viewId) {
        this.players.get(viewId).destroy();
        this.players.delete(viewId);
        this.listChanged();
    }

    get count() {
        return this.users.size;
    }

    listChanged() {
        this.publish("playerManager", "playersChanged");
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

};
RegisterMixin(AM_Player);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_Player = superclass => class extends superclass {

    get isMyPlayerPawn() { return (this.actor.playerId === this.viewId); }

};
