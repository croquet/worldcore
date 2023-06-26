// GUARDIANS

// This is the first game created for Croquet for Unity.

import { App, StartWorldcore} from "@croquet/worldcore-kernel";

import {  MyViewRoot } from "./src/Pawns";
import { MyModelRoot } from "./src/Actors";
import "./src/Avatar";


// redirect to lobby if not in iframe or session
const inIframe = window.parent !== window;
const url = new URL(window.location.href);
const sessionName = url.searchParams.get("session");
url.pathname = url.pathname.replace(/[^/]*$/, "lobby.html");
App.sessionURL = url.href;
if (!inIframe || !sessionName) window.location.href = App.sessionURL;

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.worldcore.guardians4',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',    // Replace with your apiKey
    name: sessionName,
    password: "none",
    location: true,
    model: MyModelRoot,
    view: MyViewRoot,
});
