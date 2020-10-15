// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, ActorManager, PawnManager } from "@croquet/worldcore";
import { GameMaster } from "./src/GameMaster";
import {HUD} from "./src/HUD";
import {MyPlayerManager} from "./src/Player";


//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting pop smash!");
    }

    createManagers() {
        this.playerManager = this.addManager(MyPlayerManager.create());
        this.actorManager = this.addManager(ActorManager.create());
        this.gm = this.addManager(GameMaster.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.ui = this.addManager(new UIManager());
        this.setScale(this.ui.size);
        this.pawnManager = this.addManager(new PawnManager());
        this.hud = this.addManager(new HUD(this.ui.root));
    }

    setScale(xy) {
        const narrow = Math.min(xy[0], xy[1]);
        this.ui.setScale(narrow/800);
    }

}


async function go() {
    App.makeWidgetDock();
    const session = await Session.join(`wctest-${App.autoSession("q")}`, MyModelRoot, MyViewRoot, {tps: "10", autoSleep: 45});
    //const session = await Session.join(`popsmash`, MyModelRoot, MyViewRoot, {tps: "10", autoSleep: 30});
}

go();
