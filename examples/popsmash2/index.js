// Simple Testbed

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

// webpack will replace process.env.NODE_ENV with the actual value
const apiKey = process.env.NODE_ENV === 'production'
    ? '1rN7t58Mo1ani03Djcl4amvdEAnoitB6g3oNxEDrC'
    : '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9';


App.makeWidgetDock({debug: true, stats: true});

StartWorldcore({
    appId: 'io.croquet.popsmash2',
    // apiKey,
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    model: MyModelRoot,
    name: 'test',
    // name: App.autoSession(),
    // password: App.autoPassword(),
    password: "password",
    view: MyViewRoot,
    tps:60
});