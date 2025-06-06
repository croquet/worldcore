// Worldcore Tutorial 5

// This is the fifth in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to add new properties to actors, how to use random numbers, and how to
// transmit events with say() and listen().

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

StartWorldcore({
    appId: 'io.croquet.worldcore.tutorial05',
    apiKey: '234567_Paste_Your_Own_API_Key_Here_7654321',    // Replace with your apiKey
    name: App.autoSession(),
    password: App.autoPassword(),
    model: MyModelRoot,
    view: MyViewRoot,
});
