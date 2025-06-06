// Worldcore Drive 2

// This is the ninth in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to create a first-person avatar, and switch between different avatars on the fly.

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

StartWorldcore({
    appId: 'io.croquet.worldcore.drive2',
    apiKey: '234567_Paste_Your_Own_API_Key_Here_7654321',    // Replace with your apiKey
    name: App.autoSession(),
    password: App.autoPassword(),
    model: MyModelRoot,
    view: MyViewRoot,
});
