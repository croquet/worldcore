// Worldcore Tutorial 7a

// This is the eighth in a series of tutorials illustrating how to build a Worldcore app.
// This along with the following tutorial shows how to create avatars.

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

StartWorldcore({
    appId: 'io.croquet.worldcore.tutorial7a',
    apiKey: '234567_Paste_Your_Own_API_Key_Here_7654321',    // Replace with your apiKey
    name: App.autoSession(),
    password: App.autoPassword(),
    model: MyModelRoot,
    view: MyViewRoot,
});