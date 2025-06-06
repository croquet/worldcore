import { StartWorldcore, App } from "@croquet/worldcore";
import { MyViewRoot } from "./src/Views.js";
import { MyModelRoot } from "./src/Models.js";


App.makeWidgetDock();

StartWorldcore({
    appId: 'io.croquet.physics',
    apiKey: '234567_Paste_Your_Own_API_Key_Here_7654321',
    model: MyModelRoot,
    view: MyViewRoot,
});
