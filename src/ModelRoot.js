// import { Model } from "@croquet/croquet";
// import { ActorManager} from "./Actor";

// //------------------------------------------------------------------------------------------
// //-- ModelRoot -----------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class ModelRoot extends Model {
//     init() {
//         super.init();
//         this.beWellKnownAs("ModelRoot");
//         // this.managers = new Set();
//         this.services = new Set();
//         // this.createManagers();
//         this.createServices();
//     }

//     // createManagers() {
//     //     this.actorManager = this.addManager(ActorManager.create());
//     // }

//     createServices() {
//         this.actorManager = this.addService(ActorManager);
//     }

//     // addManager(m) {
//     //     this.managers.add(m);
//     //     return m;
//     // }

//     addService(service, options) {
//         const s = service.create(options);
//         this.services.add(s);
//         return s;
//     }
// }
// ModelRoot.register("ModelRoot");
