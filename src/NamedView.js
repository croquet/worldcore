// import { View } from "@croquet/croquet";
// import { viewRoot } from "./ViewRoot";

// const namedViews = new Map();

// export function ClearNamedViews() {
//     namedViews.clear();
// }

// export function GetNamedView(name) {
//     return namedViews.get(name);
// }

// // Obsolete ... switch over to View Services

// export class NamedView extends View {
//     constructor(name, model) {
//         super(model);
//         this.name = name;
//         this.model = model;
//         if (!name) console.error("All named views must have public names!");
//         else this.registerName();
//     }

//     registerName() {
//         namedViews.set(this.name, this);
//     }

//     reattach() {
//         super.reattach();
//         this.registerName();
//     }

//     destroy() {
//         this.detach();
//     }

//     detach() {
//         super.detach();
//         namedViews.delete(this.name);
//     }
// }

// // This lets a view get directly to a well-known model.

// // export function GetNamedModel(name) {
// //     return GetNamedView("ViewRoot").model.wellKnownModel(name);
// // }

// // export function GetNamedModel(name) {
// //     return viewRoot.model.wellKnownModel(name);
// // }
