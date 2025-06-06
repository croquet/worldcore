// Idle MMO

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

// webpack will replace process.env.NODE_ENV with the actual value
const apiKey = process.env.NODE_ENV === 'production'
    ? '234567_Paste_Your_Own_API_Key_Here_7654321'  // prod key
    : '234567_Paste_Your_Own_API_Key_Here_7654321'; // dev key


App.makeWidgetDock({debug: true, stats: true});

StartWorldcore({
    appId: 'io.croquet.idle',
    apiKey,
    model: MyModelRoot,
    name: 'everyone',
    // name: App.autoSession(),
    // password: App.autoPassword(),
    password: "password",
    view: MyViewRoot,
    autoSleep: 0,
    tps:"10x5"
});
