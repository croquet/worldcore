// import { View } from "@croquet/croquet";
// import { NamedView, ClearNamedViews } from "./NamedView";
// import { PawnManager} from "./Pawn";
// import { ClearObjectCache } from "./ObjectCache";
// import { ClearViewServices } from "./Root";
// import { toDeg } from "./Vector";

// //------------------------------------------------------------------------------------------
// //-- ViewRoot ------------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export let viewRoot;
// let time0 = 0;
// let time1 = 0;

// export class ViewRoot extends View {

//     constructor(model) {
//         // ClearNamedViews();
//         super(model);
//         this.model = model;
//         viewRoot = this;
//         time0 = 0;
//         time1 = 0;
//         ClearViewServices();

//         ClearObjectCache();
//         // this.managers = new Set();
//         this.services = new Set();
//         // this.createManagers(); // ael - allow subclasses to get in first
//         this.createServices();

//     }

//     // createManagers() {
//     //     // this.pawnManager = this.addManager(new PawnManager(this.model));
//     // }

//     createServices() {
//         this.pawnManager = this.addService(PawnManager);
//     }

//     detach() {
//         // this.managers.forEach(m => m.destroy());
//         this.services.forEach(s => s.destroy());
//         // ClearNamedViews();
//         ClearViewServices();
//         super.detach();
//     }

//     // addManager(m) {
//     //     this.managers.add(m);
//     //     return m;
//     // }

//     addService(service, options) {
//         const s = new service(options);
//         this.services.add(s);
//         return s;
//     }

//     update(time) {
//         time0 = time1;
//         time1 = time;
//         const delta = time1 - time0;
//         // this.managers.forEach(m => { if (m.update) m.update(time, delta); });
//         this.services.forEach(s => { if (s.update) s.update(time, delta); });
//     }

//     // updateOld(time) {
//     //     viewTime0 = viewTime1;
//     //     viewTime1 = time;
//     //     viewDelta = viewTime1 - viewTime0;
//     //     viewDeltas.shift();
//     //     viewDeltas.push(viewDelta);
//     //     this.managers.forEach(m => { if (m.update) m.update(time, viewDelta); });
//     // }

// }

// // Functions that allow pawns and managers to get current view time and delta since last update

// // let viewTime0 = 0;
// // let viewTime1 = 0;
// // let viewDelta = 0;
// // let viewDeltas = new Array(10).fill(15); // Last 10 updates

// export function GetViewTime() { // This is used in throttling ... probably shouldn't be
//     return time1;
// }

// // export function GetViewDelta() {
// //     return viewDelta;
// // }

// // export function GetViewFPS() { // Averaged over last 10 updates
// //     const average = viewDeltas.reduce( (t, v) => t + v ) / viewDeltas.length;
// //     return 1000 / average;
// // }
