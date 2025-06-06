// Sheep demo

import { App, StartWorldcore} from "@croquet/worldcore";
import * as BEHAVIORS from "./src/Behaviors";
import * as VIEWS from "./src/Views";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

// webpack will replace process.env.NODE_ENV with the actual value
const apiKey = process.env.NODE_ENV === 'production'
    ? '234567_Paste_Your_Own_API_Key_Here_7654321'  // prod key
    : '234567_Paste_Your_Own_API_Key_Here_7654321'; // dev key


App.makeWidgetDock({debug: true, stats: true});

StartWorldcore({
    appId: 'io.croquet.sheep',
    apiKey,
    model: MyModelRoot,
    name: 'sheep',
    // name: App.autoSession(),
    // password: App.autoPassword(),
    password: "password",
    view: MyViewRoot,
    tps:60
});
