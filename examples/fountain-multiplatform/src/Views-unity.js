// Worldcore with Rapier and Unity
//
// Croquet Corporation, 2023

/* global MyModelRoot */

const { StartWorldcore } = globalThis.Worldcore;
const { theGameEngineBridge, GameViewRoot, GameWorldPawn, GamePawn } = globalThis.Game_Views;

globalThis.timedLog("start of fountain views-unity");

//------------------------------------------------------------------------------------------
//-- FountainPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FountainPawn extends GameWorldPawn {
    constructor(...args) {
        super(...args);

        this.gameSubscribe('screenTap', () => this.doShoot());
        this.gameSubscribe('screenDouble', () => this.reset());
    }

    reset() {
        this.publish('ui', 'reset');
    }

    doShoot() {
        globalThis.timedLog("shoot");
        this.publish('ui', 'shoot');
    }
}
globalThis.FountainPawn = FountainPawn;

//------------------------------------------------------------------------------------------
//-- SprayPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayPawn extends GamePawn {
    // just has to exist, because in at least the THREE version it is specialised
}
globalThis.SprayPawn = SprayPawn;


const STEP_DELAY = 26; // aiming to ensure that there will be a new 50ms update on every other step
let stepHandler = null;
let stepCount = 0;
globalThis.timerClient.setInterval(() => {
    performance.mark(`STEP${++stepCount}`);
    if (stepHandler) stepHandler();
}, STEP_DELAY);

let session; // $$$
async function startSession(model, view) {
    // console.profile();
    // setTimeout(() => console.profileEnd(), 10000);
    await theGameEngineBridge.readyP;
    const { apiKey, appName } = theGameEngineBridge;
    globalThis.timedLog("bridge ready");
    const appId = `io.croquet.game.${appName}`;
    const name = `game-${appName}`;
    const password = 'password';
    session = await StartWorldcore({
        appId,
        apiKey,
        name,
        password,
        step: 'manual',
        tps: 20, // i.e., 50ms.  we simulate every 52ms, and we want teatime to have advanced for every simulation call (the theory being that it's ok sometimes to execute two teatime-spaced Rapier steps within one simulation call, but bad to sometimes have a gap of two simulation calls between Rapier steps).  NB: can't use a multiplier, because we can't rely on timeouts.
        autoSleep: false,
        expectedSimFPS: 0, // 0 => don't attempt to load-balance simulation
        debug: ['session', 'messages', 'hashing'],
        model,
        view,
        progressReporter: ratio => {
            globalThis.timedLog(`join progress: ${ratio}`);
            theGameEngineBridge.sendCommand('joinProgress', String(ratio));
        }
    });
    let lastStep = 0;
    stepHandler = () => {
        const now = Date.now();
        // don't try to service ticks that have bunched up
        if (now - lastStep < STEP_DELAY / 2) return;
        lastStep = now;
        session.step(now);
    };
    globalThis.timedLog("session ready");
    theGameEngineBridge.announceTeatime(session.view.realm.vm.time);
    theGameEngineBridge.sendCommand('croquetSessionReady');

    // tell Unity to record three categories of log (out of "info", "session", "diagnostics", "debug", "verbose"), and to send them across the bridge to be reported in the Croquet console.
    theGameEngineBridge.sendCommand('setLogOptions', 'info,session,diagnostics,routeToCroquet');
    // but no diagnostic measures (only "update" available right now), because that's a lot of messages for not much info.
    // theGameEngineBridge.sendCommand('setMeasureOptions', 'update');
}

startSession(MyModelRoot, GameViewRoot);
