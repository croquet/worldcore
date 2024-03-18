import { StartWorldcore, App } from "@croquet/worldcore";
import { MyViewRoot } from "./src/Views.js";
import { MyModelRoot } from "./src/Models.js";


App.makeWidgetDock();

StartWorldcore({
    appId: 'io.croquet.physics',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    model: MyModelRoot,
    view: MyViewRoot,
});
