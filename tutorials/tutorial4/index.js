// Worldcore Tutorial 4

// This is the fifth in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to add new properties to actors, how to use random numbers, and hot to
// transmit events with say() and listen().

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

StartWorldcore({
    appId: 'io.croquet.worldcore.tutorial4',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',    // Replace with your apiKey
    name: App.autoSession(),
    password: App.autoPassword(),
    model: MyModelRoot,
    view: MyViewRoot,
});