// Worldcore Drive

// This is the ninth in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to create a first-person avatar, and switch between different avatars on the fly.

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.worldcore.drive',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',    // Replace with your apiKey
    name: App.autoSession(),
    password: App.autoPassword(),
    model: MyModelRoot,
    view: MyViewRoot,
});
