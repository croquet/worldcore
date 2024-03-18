// Microverse Base

// import { App } from "@croquet/worldcore";
import { StartWorldcore, App } from "@croquet/worldcore";
import { MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";


App.makeWidgetDock({debug: true, stats: true});

StartWorldcore({
    appId: 'io.croquet.physics',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    model: MyModelRoot,
    name: App.autoSession(),
    password: 'password',
    view: MyViewRoot,
});
