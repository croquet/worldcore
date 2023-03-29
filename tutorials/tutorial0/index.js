// Worldcore Tutorial 0

// This is the first in a series of tutorials illustrating how to build a Worldcore app. It
// shows how to set up your model root and view root, and how to create an object in the world.

import { App, StartWorldcore} from "@croquet/worldcore";

import { MyViewRoot } from "./src/Views";
import { MyModelRoot } from "./src/Models";

// To start a Worldcore session, you need to provide it with an appId and apiKey. You can get
// an apiKey of your own by signing up as a registered developer.
//
// You can provide any name and password you want. The autoSession and autoPassword utilities
// supply unique values for these fields.
//
// You also need to give Worldcore the class names of your model root and view root. These two classes
// own all the other models and views in your application.

StartWorldcore({
    appId: 'io.croquet.worldcore.tutorial0',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',    // Replace with your apiKey
    name: App.autoSession(),
    password: App.autoPassword(),
    model: MyModelRoot,
    view: MyViewRoot,
});