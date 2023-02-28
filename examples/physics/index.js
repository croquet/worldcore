// Microverse Base

import { App } from "@croquet/worldcore";
import { StartWorldcore } from "@croquet/worldcore";
import { MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";


App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.physics',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'Physics',
    password: 'password',
    model: MyModelRoot,
    name: App.autoSession(),
    view: MyViewRoot,
    tps:60
});