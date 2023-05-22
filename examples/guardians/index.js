// GUARDIANS

// This is the first game created for Croquet for Unity.

import { App, StartWorldcore} from "@croquet/worldcore";

import {  MyViewRoot } from "./src/Pawns";
import { MyModelRoot } from "./src/Actors";
import "./src/Avatar";


App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.worldcore.guardians4',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',    // Replace with your apiKey
    name: App.autoSession(),
    password: App.autoPassword(),
    model: MyModelRoot,
    view: MyViewRoot,
});
