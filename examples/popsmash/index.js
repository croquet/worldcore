// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, ActorManager, PawnManager } from "@croquet/worldcore";
import { GameMaster, GameMaster2 } from "./src/GameMaster";
import {HUD} from "./src/HUD";
import {MyPlayerManager} from "./src/Player";
import { checkQNickname } from "./src/Names";


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
    constructor(...args) {
        super(...args);
        this.setScale(this.ui.size);
        this.hud = new HUD(this.ui.root);
        // console.log("Size: " + this.ui.size);
        // console.log("Ratio: " + this.ui.ratio);
        this.subscribe("ui", "resize", this.setScale);
    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.ui = this.addManager(new UIManager());
        this.pawnManager = this.addManager(new PawnManager());

    }

    setScale(xy) {
        const narrow = Math.min(xy[0], xy[1]);
        this.ui.setScale(narrow/800);
    }

}


async function go() {
    App.makeWidgetDock();
    await checkQNickname();
    const session = await Session.join(`wctest-${App.autoSession("q")}`, MyModelRoot, MyViewRoot, {tps: "10", autoSleep: 45});
    //const session = await Session.join(`popsmash`, MyModelRoot, MyViewRoot, {tps: "10", autoSleep: 30});
}

go();
