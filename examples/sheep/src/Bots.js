import { ModelService, Actor, mix, AM_Spatial, AM_Behavioral, Constants, RegisterMixin, v3_distance, AM_OnNavGrid  } from "@croquet/worldcore";
import { packKey } from "./Paths";

//------------------------------------------------------------------------------------------
//-- Flockable -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

 // Mixin to allow actors to belong to flocks.


//  export const AM_Flockable = superclass => class extends superclass {

//     get flock() { return this._flock }

//     init(options) {
//         super.init(options);
//         this.aim = [0,0,0];
//     }

//     destroy() {
//         super.destroy();
//         if (this.flock) this.flock.leave(this);
//     }

//     flockSet(flock, old) {
//         if (old) old.leave(this);
//         if (flock) flock.join(this);
//     }

// }
// RegisterMixin(AM_Flockable);

// //------------------------------------------------------------------------------------------
// //-- BotManager ----------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// export class BotManager extends ModelService {
//     init() {
//         super.init("BotManager");
//         this.bots = new Set();
//         this.bins = new Map();
//     }

//     addToBin(key,bot) {
//         let bin = this.bins.get(key);
//         if (!bin) {
//             bin = new Set();
//             this.bins.set(key, bin);
//         }
//         bin.add(bot);
//         bot.bin = bin;
//     }
//     removeFromBin(key,bot) {
//         const bin = this.bins.get(key);
//         if (bin) bin.delete(bot);
//         bot.bin = null;
//     }

//     destroyAll() {
//         const doomed = new Set(this.bots);
//         doomed.forEach(bot => bot.destroy());
//     }


// }
// BotManager.register("BotManager");

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid, AM_Behavioral) {

    init(options) {
        super.init(options);
        this.spread = this.behavior.start({name: "SpreadBehavior", radius: 0.5});
        this.subscribe("hud", "go", this.go);
    }

    go(target) {
        // console.log("go!");
        target[1] = 0;
        if (this.ggg){
            this.ggg.destroy()
            this.ggg = null;
        }

        const speed = 16 + 4 * Math.random();

        this.ggg = this.behavior.start({name: "PathToBehavior", target, speed, noise:1, radius:3});
    }

}
BotActor.register("BotActor");

// export class BotActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

//     init(options) {
//         super.init(options);
//         const bm = this.service("BotManager");
//         bm.bots.add(this);
//         // this.spread = this.behavior.start({name: "SpreadBehavior", radius: 0.5});
//         this.subscribe("hud", "go", this.go);
//     }

//     destroy() {
//         super.destroy();
//         const bm = this.service("BotManager");
//         // bm.removeFromBin(this);
//         bm.bots.delete(this);
//     }

//     get tags() {  return this.__tags || new Set(); }

//     addTag(tag) {
//         if(!this.__tags) this.__tags = new Set();
//         this.tags.add(tag);
//     }

//     removeTag(tag) {
//         if(!this.tags) return;
//         this.tags.delete(tag);
//     }

//     tagsSet(tags) {
//         for (const tag of tags) this.addTag(tag);
//     }

//     translationSet(t) {
//         const oldKey = this.key;
//         const x = Math.floor(t[0]/Constants.scale);
//         const z = Math.floor(t[2]/Constants.scale);
//         this.xz = [x,z];
//         this.key = packKey(x,1,z);
//         if(this.key !== oldKey) {
//             const bm = this.service("BotManager");
//             bm.removeFromBin(oldKey,this);
//             bm.addToBin(this.key,this);
//         }

//         const paths = this.service("Paths");
//         if (!paths.nodes.has(this.key)) {
//             console.log("off grid");
//             // this.destroy();
//         }
//     }

//     neighbors(radius, tag) {
//         radius = Math.floor(radius);
//         const bm = this.service("BotManager");
//         const paths = this.service("Paths");
//         const out = [];
//         paths.ping(this.key, (node, range) => {
//             if (range>radius) return true;
//             const nodeKey = node.key;
//             const bin = bm.bins.get(nodeKey);
//             if (!bin || bin.size == 0) return false;
//             for (const bot of bin) {
//                 if (bot == this) continue;
//                 if (bot.tags.has(tag)) out.push(bot);
//                 // out.push(bot);
//             }
//         });
//         return out;
//     }

//     close(radius,tag) {
//         const neighbors = this.neighbors(radius, tag);
//         return neighbors.sort((a,b) => {
//             const aDistance = v3_distance(this.translation, a.translation);
//             const bDistance = v3_distance(this.translation, b.translation);
//             return aDistance-bDistance;
//         });
//     }

//     closest(radius,tag) {
//         const a = this.close(radius, tag);
//         if (a.length>0) return a[0];
//         return null;
//     }

//     go(target) {
//         // console.log("g");
//         target[1] = 0;
//         if (this.ggg){
//             this.ggg.destroy()
//             this.ggg = null;
//         }

//         const speed = 8 + 2 * Math.random();
//         this.ggg = this.behavior.start({name: "WalkToBehavior", destination: target, speed, radius:4});
//     }

//     // doSpread() {
//     //     console.log("spread");
//     //     this.spread = this.behavior.start({name: "SpreadBehavior", radius: 1});
//     // }



// }
// BotActor.register("BotActor");
