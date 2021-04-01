// World Core Test
//
// Croquet Studios, 2020

import { Session, App, Model, View } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, ActorManager, RenderManager, PawnManager, PlayerManager, RapierPhysicsManager,
    toRad, LoadRapier,m4_scalingRotationTranslation, q_axisAngle, v3_scale, sphericalRandom, TextWidget, GetNamedView } from "@croquet/worldcore";
import { LevelActor } from "./src/Level";
import { CubeSprayActor, CylinderSprayActor, ConeSprayActor } from "./src/Fountain";
import { v3_multiply, v3_sub, v3_rotate, q_conjugate, m4_getRotation, m4_getTranslation, m4_translation, m4_rotation, m4_multiply, v3_add } from "../../src/Vector";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        this.disableFountain = args[0].disableFountain;
        console.log("Starting model!");
        this.seedColors();
        this.level = LevelActor.create();
        this.shots = [];

        this.subscribe("hud", "shoot", this.shoot);
        this.subscribe("hud", "pause", this.pause);
        this.subscribe("hud", "disable", this.disable)

        this.subscribe("pawn", "create", this.createPawn);
        this.subscribe("pawn", "update", this.updatePawn);
        this.subscribe("pawn", "destroy", this.destroyPawn);

        this.subscribe("pawns", "reset", this.reset);

        this.arkit = ARKitModel.create();

        this.createTowers();
    }

    createTowers() {
      this.createTower({height: 4, translation: [-6, 0, 0], scale: [3, 1, 3]})
      this.createTower({height: 3, translation: [-6, 5, 0], scale: [2, 1, 2]})
      this.createTower({height: 2, translation: [-6, 9, 0], scale: [1, 1, 1]})

      this.createTower({height: 4, translation: [6, 0, 0], scale: [3, 1, 3]})
      this.createTower({height: 3, translation: [6, 5, 0], scale: [2, 1, 2]})
      this.createTower({height: 2, translation: [6, 9, 0], scale: [1, 1, 1]})
    }

    createTower({height, translation, scale}) {
      const [x, y, z] = translation
      this.createPilar({height, translation: [x+scale[0], y+1.5, z+scale[0]]});
      this.createPilar({height, translation: [x+scale[0], y+1.5, z-scale[0]]})
      this.createPilar({height, translation: [x-scale[0], y+1.5, z+scale[0]]})
      this.createPilar({height, translation: [x-scale[0], y+1.5, z-scale[0]]})
      this.createPawn({type: "cube", scale: [(2*scale[0]+1), scale[1], (2*scale[2])+1], translation: [x, y+height+1.5, z]});
    }

    createPilar({height, translation}) {
      translation = translation || [0, 1, 0];
      for (let index = 0; index < height; index++) {
        this.createPawn({type: (index%2)? "cube":"cylinder", translation: [translation[0], translation[1] + index, translation[2]]})
      }
    }

    destroyPawns() {
      this.actorManager.actors.forEach((actor, id) => {
        if (!actor._viewId && !actor._isFountain) {
          actor.destroy();
        }
      });
    }
    
    reset() {
      this.destroyPawns();
      this.createTowers();
    }

    createPawn({type, translation, rotation, impulse, torqueImpulse, scale, color}) {
      let p;
      
      switch(type) {
        case "cube":
          p = CubeSprayActor.create({translation, rotation, scale, color});
          break;
        case "cylinder":
          p = CylinderSprayActor.create({translation, rotation, scale, color});
          break;
        case "cone":
          p = ConeSprayActor.create({translation, rotation, scale, color});
          break;
        default:
          p = CubeSprayActor.create({translation, rotation, scale, color});
          break;
      }

      if (torqueImpulse)
        p.applyTorqueImpulse(torqueImpulse);

      if (impulse)
        p.applyImpulse(impulse);
    }
    updatePawn({id, translation, rotation, scale}) {
      
    }
    destroyPawn() {

    }

    destroy() {
        this.level.destroy();
        super.destroy();
    }

    pause(p) {
        this.isPaused = p;
        if (p) {
            this.phyicsManager.pause();
        } else {
            this.phyicsManager.resume();
        }
    }

    disable(d) {
        this.disabled = d;
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.phyicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 15}));
        this.actorManager = this.addManager(ActorManager.create());
    }

    seedColors() {
        this.colors = [];
        for (let i = 0; i < 100; i++ ) {
            this.colors.push([0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1]);
        }
    }

    shoot() {
        if (this.isPaused) return;
        if (this.shots.length >= 5) {
            const doomed = this.shots.shift();
            doomed.destroy();
        }
        let p;
        const r = Math.random();
        if (r < 0.4) {
            p = CubeSprayActor.create({translation: [0, 17, 19]});
        } else if (r < 0.8) {
            p = CylinderSprayActor.create({translation: [0, 17, 19]});
        } else {
            p = ConeSprayActor.create({translation: [0, 17, 19]});
        }


        // if (Math.random() < 0.5) {
        //     p = CubeSprayActor.create({translation: [0, 17, 19]});
        // } else {
        //     p = CylinderSprayActor.create({translation: [0, 17, 19]});
        // }


        // const p = CubeSprayActor.create({translation: [0, 17, 19]});
        const spin = v3_scale(sphericalRandom(),Math.random() * 1.5);
        p.applyTorqueImpulse(spin);
        p.applyImpulse([0, 0, -16]);
        this.shots.push(p);
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.arkit = new ARKitView(this.model.arkit);

        if(!window.hideFountain) {
            this.render.setBackground([0.45, 0.8, 0.8, 1.0]);

            this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
            this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
            this.render.lights.setDirectionalAim([0.2,-1,0.1]);
    
            this.render.camera.setLocation(m4_scalingRotationTranslation(1, q_axisAngle([1,0,0], toRad(-20)), [0,20,30]));
            this.render.camera.setProjection(toRad(60), 1.0, 100000.0);
    
            const ao = this.render.aoShader;
            if (ao) {
                ao.setRadius(0.4);
                ao.density = 0.9;
                ao.falloff = 0.7;
            }
    
    
    
            this.addHud();
    
            this.subscribe("input", " Down", this.shoot);
            this.subscribe("input", "touchTap", this.shoot);
            this.subscribe("input", "pDown", this.pause);
            this.subscribe("input", "dDown", this.disable);
    
            this.subscribe("input", "cheatDown", this.cheat);
        }
    }

    createManagers() {
        if(!window.hideFountain) {
            this.webInput = this.addManager(new WebInputManager());
            this.render = this.addManager(new RenderManager());
            this.ui = this.addManager(new UIManager());
            this.audio = this.addManager(new AudioManager());
        }
        this.pawnManager = this.addManager(new PawnManager());

        if(!window.hideFountain) {
            this.webInput.addChord("cheat", ['q', 't']);
        }
    }

    addHud() {
        this.cheatText = new TextWidget(this.ui.root, {local: [10,10], size: [100,20], text: "Cheat On", point: 12, visible: false, alignX: 'left'});
        this.disableText = new TextWidget(this.ui.root, {local: [10,30], size: [100,20], text: "Shots Disabled", point: 12, visible: false, alignX: 'left'});
    }

    shoot() {
        if(!this.cheatMode && this.model.disabled) return;
        this.publish("hud", "shoot")
    }

    pause() {
        if (!this.cheatMode) return;
        this.paused = !this.paused;
        this.publish("hud", "pause", this.paused)
    }

    disable() {
        if (!this.cheatMode) return;
        this.disabled = !this.disabled;
        this.disableText.set({visible: this.disabled});
        this.publish("hud", "disable", this.disabled)
    }

    cheat() {
        this.cheatMode = !this.cheatMode;
        this.cheatText.set({visible: this.cheatMode});
    }

    update() {
        super.update(...arguments);
        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
            let pawns = [];

            if (false) {
              this.model.actorManager.actors.forEach((actor, id) => {
                pawns.push({
                    id: actor.id,
                    translation: actor.translation,
                    rotation: actor.rotation,
                  });
              });
            }
            else {
              this.pawnManager.pawns.forEach((pawn, id) => {
                if (pawn.actor._viewId != this.viewId) {
                  pawns.push({
                    id,
                    translation: pawn.translation,
                    rotation: pawn.rotation,
                  });
                }
              });
            }

            webkit.messageHandlers.arwebkit.postMessage({
                type: "update pawns",
                pawns,
            });

            this.arkit.users.forEach(user => {
              user.update()
            });
        }
    }

}

class ARKitUserModel extends Model {
    init({ viewId }) {
      super.init();
      this.modelRoot = this.wellKnownModel("modelRoot");
      this.viewId = viewId;
      this.color = [Math.random(), 1, 1, 1]; /// hsla
      this.colorRGBA = this.hslaToRgba(this.color[0], 1, 0.6, 1);
      this.subscribe(this.viewId, "update", this.onUpdate);
      this.subscribe(this.viewId, "set-uid", this.setUid);
      this.subscribe(this.viewId, "shoot", this.shoot);

      this.subscribe(this.viewId, "grab", this.grab);
      this.subscribe(this.viewId, "release", this.release);

      if (viewId.includes('mobile')) {
        this.cube = CubeSprayActor.create({rigidBodyType: "kinematic", translation: [0, 20, 20], scale: [2, 2, 2], color: this.colorRGBA, _viewId: this.viewId});
      }
    }
    onUpdate({ blendShapes, position, orientation }) {
      this.position = position;
      this.orientation = orientation;
      
      if (blendShapes) {
        this.blendShapes = blendShapes;
      }
      else {
        delete this.blendShapes
      }

      if (this.cube) {
        this.cube.moveTo(position.map(_ => _*(1/0.025)))
        this.cube.rotateTo(orientation)
      }

      if (this.grabbedActor) {
        const position = v3_add(this.position.map(_ => _*(1/0.025)), v3_rotate([0, 0, -3], this.orientation))
        this.grabbedActor.moveTo(position)
        //this.grabbedActor.rotateTo(this.orientation)
      }

      this.publish(this.viewId, "did-update");
    }
    setUid(uid) {
      this.uid = uid;
      this.publish(this.viewId, "did-set-uid");
    }

    hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    hslaToRgba(h, s, l, a){
      var r, g, b;
  
      if(s == 0){
          r = g = b = l; // achromatic
      }else{
          var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          var p = 2 * l - q;
          r = this.hue2rgb(p, q, h + 1/3);
          g = this.hue2rgb(p, q, h);
          b = this.hue2rgb(p, q, h - 1/3);
      }
  
      return [r, g, b, a];
  }

    shoot({position, forward}) {
      if (this.modelRoot.isPaused) return;
      if (this.modelRoot.shots.length >= 5) {
          const doomed = this.modelRoot.shots.shift();
          doomed.destroy();
      }

      const translation = v3_add(position, forward.map(_ => _*1.5))

      let p;
      const r = Math.random();
      if (r < 0.4) {
          p = CubeSprayActor.create({translation, color: this.colorRGBA});
      } else if (r < 0.8) {
          p = CylinderSprayActor.create({translation, color: this.colorRGBA});
      } else {
          p = ConeSprayActor.create({translation, color: this.colorRGBA});
      }

      // if (Math.random() < 0.5) {
      //     p = CubeSprayActor.create({translation: [0, 17, 19]});
      // } else {
      //     p = CylinderSprayActor.create({translation: [0, 17, 19]});
      // }


      // const p = CubeSprayActor.create({translation: [0, 17, 19]});
      const spin = v3_scale(sphericalRandom(),Math.random() * 1.5);
      p.applyTorqueImpulse(spin);

      forward = forward.map(_ => _*40);
      p.applyImpulse(forward);
      this.modelRoot.shots.push(p);
  }

  grab(id) {
    if (!this.grabbedActor) {
      this.grabbedActor = this.modelRoot.actorManager.get(id)
      if (this.grabbedActor) {
        this.addRigidBody("kinematic")
        this.grabbedActor.rotateTo([0, 0, 0, 1])
        this.publish("pawn", "grab", {id, viewId: this.viewId})
      }
    }
  }
  release() {
    if (this.grabbedActor) {
      const {id} = this.grabbedActor
      this.addRigidBody("dynamic")
      delete this.grabbedActor
      delete this.collider
      this.publish("pawn", "release", {id, viewId: this.viewId})
    }
  }

  addRigidBody(type) {
    if (this.grabbedActor) {
      this.grabbedActor.addRigidBody({type})
      switch(this.grabbedActor.constructor) {
        case CubeSprayActor:
          this.grabbedActor.addBoxCollider({
              size: [0.5, 0.5, 0.5],
              density: 1,
              friction: 1,
              restitution: 0.00000001,
          });
          break
        case ConeSprayActor:
          this.grabbedActor.addConeCollider({
              radius: 0.5,
              halfHeight: 0.5,
              density: 3,
              friction: 1,
              restitution: 0.00000001,
          });
          break;
        case CylinderSprayActor:
          this.grabbedActor.addCylinderCollider({
              radius: 0.5,
              halfHeight: 0.5,
              density: 1.5,
              friction: 1,
              restitution: 0.00000001,
          });
          break;
      }
    }
  }

  destroy() {
    super.destroy()

    if (this.cube)
      this.cube.destroy()
  }
}
ARKitUserModel.register("ARKitUser");

class ARKitModel extends Model {
    init() {
        super.init();
        this.users = [];
        this.subscribe(this.sessionId, "view-join", this.onViewJoin);
        this.subscribe(this.sessionId, "view-exit", this.onViewExit);
      }
      getUserByViewId(viewId) {
        return this.users.find(user => user.viewId === viewId);
      }
      getUserIndexByViewId(viewId) {
        return this.users.findIndex(user => user.viewId === viewId);
      }

      onViewJoin(viewId) {
        let user = this.getUserByViewId(viewId);
        if (!user) {
          user = ARKitUserModel.create({ viewId });
          this.users.push(user);
          this.publish(this.sessionId, "user-join", viewId);
          this.publish(viewId, "user-join");
        }
      }
      onViewExit(viewId) {
        const user = this.getUserByViewId(viewId);
        if (user) {
          user.destroy();
          this.users.splice(this.users.indexOf(user), 1);
          this.publish(this.sessionId, "user-exit", viewId);
        }
      }
}
ARKitModel.register("ARKit");

class ARKitUserView extends View {
    constructor(model) {
      super(model);
      this.model = model;
      this.viewRoot = GetNamedView('ViewRoot');
      

      if (!this.isMyUser) {
        this.subscribe(this.userViewId, "did-update", this.onUpdate);
      }
      else {
        if (window.webkit && webkit.messageHandlers.arwebkit) {
          webkit.messageHandlers.arwebkit.postMessage({
            type: "color",
            color: this.model.color,
          });
        }
      }
    }

    get userViewId() {
      return this.model.viewId;
    }
    get isMyUser() {
      return this.userViewId === this.viewId;
    }

    get uid() {
      return this.model.uid;
    }

    onUpdate() {
      return
      if (window.webkit && window.webkit.messageHandlers.arwebkit) {
        webkit.messageHandlers.arwebkit.postMessage({
          viewId: this.userViewId,
          uid: this.uid,
          color: this.model.color,
          type: "update",
          position: this.model.position,
          orientation: this.model.orientation,
          blendShapes: this.model.blendShapes,
        });
      }
    }

    update() {
      if (window.webkit && window.webkit.messageHandlers.arwebkit && !this.isMyUser) {
        if (this.userViewId.includes("mobile")) {
          this.cube = this.cube || this.viewRoot.pawnManager.get(this.model.cube.id)
          webkit.messageHandlers.arwebkit.postMessage({
            viewId: this.userViewId,
            uid: this.uid,
            color: this.model.color,
            type: "update",
            position: this.cube.translation.map(_ => _*0.025),
            orientation: this.cube.rotation,
            blendShapes: this.model.blendShapes,
          });
        }
      }
    }

    setThrottle(callback, delay, name) {
      this._throttles = this._throttles || {};
      const now = Date.now();
      const throttle = (this._throttles[name] = this._throttles[name] || {
        timestamp: now,
      });
      clearTimeout(throttle.timeoutId);
      const timeSinceTimestamp = now - throttle.timestamp;
      if (timeSinceTimestamp >= delay) {
        throttle.timestamp = now;
        callback();
      } else {
        throttle.timeoutId = setTimeout(() => {
          throttle.timestamp = Date.now();
          callback();
        }, delay - timeSinceTimestamp);
      }
    }
  }

class ARKitView extends View {
    constructor(model) {
        super(model);
        this.model = model;

        this.users = [];
        if (this.userModel) {
          this.onJoin();
        } else {
          this.subscribe(this.viewId, "user-join", this.onJoin);
        }
      }
      getUserModelByViewId(viewId) {
        return this.model.getUserByViewId(viewId);
      }
      get userModel() {
        return this.getUserModelByViewId(this.viewId);
      }
      getUserByViewId(viewId) {
        return this.users.find(user => user.userViewId === viewId);
      }
      get user() {
        return this.getUserByViewId(this.viewId);
      }
      onJoin() {
        console.log("Joined");

        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
          webkit.messageHandlers.arwebkit.postMessage({
            type: "viewId",
            viewId: this.viewId,
          });
        }

        this.subscribe(this.sessionId, "user-join", this.onUserJoin);
        this.subscribe(this.sessionId, "user-exit", this.onUserExit);
        this.model.users.forEach(userModel =>
          this.onUserJoin(userModel.viewId)
        );

        window.addEventListener("didupdatearframe", this.onARFrame.bind(this));

        window.addEventListener(
          "didaddarfaceanchor",
          this.onARFaceAnchor.bind(this)
        );
        window.addEventListener(
          "didupdatearfaceanchor",
          this.onARFaceAnchor.bind(this)
        );
        window.addEventListener(
          "shoot",
          this.shoot.bind(this)
        );

        window.addEventListener(
          "grab",
          this.grab.bind(this)
        );
        window.addEventListener(
          "release",
          this.release.bind(this)
        );

        window.addEventListener(
          "reset",
          this.reset.bind(this)
        );

        this.subscribe("pawn", "grab", this.onGrab)
        this.subscribe("pawn", "release", this.onRelease)

        this.throttleRate = 1000 / 12;

        this.checkWhetherToJoinVoiceChat();

        window.addEventListener("didjoinchannel", event => {
          const { uid } = event.detail;
          this.publish(this.viewId, "set-uid", uid);
          console.log("got uid", uid)
        });
      } 
      
      checkWhetherToJoinVoiceChat() {
        if (this.users.length > 1 && window.webkit && window.webkit.messageHandlers.arwebkit) {
          console.log("joining spatial chat");
          webkit.messageHandlers.arwebkit.postMessage({
            type: "join",
            channelId: this.sessionId
          });
        }
      }

      onUserJoin(viewId) {
        console.log(`user with viewId ${viewId} joined`);
        let user = this.getUserByViewId(viewId);
        if (!user) {
          const userModel = this.getUserModelByViewId(viewId);
          if (userModel) {
            user = new ARKitUserView(userModel);
            this.users.push(user);
            this.checkWhetherToJoinVoiceChat();
          }
        }
      }
      onUserExit(viewId) {
        const user = this.getUserByViewId(viewId);
        if (user) {
          user.detach();
          this.users.splice(this.users.indexOf(user), 1);
          if (window.webkit && window.webkit.messageHandlers.arwebkit) {
            webkit.messageHandlers.arwebkit.postMessage({
              viewId,
              type: "exit"
            });
          }
          if (this.users.length < 2 && window.webkit && window.webkit.messageHandlers.arwebkit) {
            console.log("leave agora channel")
            webkit.messageHandlers.arwebkit.postMessage({
              type: "leave",
            });
          }
        }
      }

      setThrottle(callback, delay, name) {
        this._throttles = this._throttles || {};
        const now = Date.now();
        const throttle = (this._throttles[name] = this._throttles[name] || {
          timestamp: now
        });
        clearTimeout(throttle.timeoutId);
        const timeSinceTimestamp = now - throttle.timestamp;
        if (timeSinceTimestamp >= delay) {
          throttle.timestamp = now;
          callback();
        } else {
          throttle.timeoutId = setTimeout(() => {
            throttle.timestamp = Date.now();
            callback();
          }, delay - timeSinceTimestamp);
        }
      }

      onARFrame(event) {
        const { position, orientation } = event.detail;
        this.setThrottle(
          () => {
            this.publish(this.viewId, "update", { position, orientation });
          },
          this.throttleRate,
          "update"
        );
      }

      onARFaceAnchor(event) {
        const { blendShapes, position, orientation } = event.detail;
        this.setThrottle(
          () => {
            this.publish(this.viewId, "update", {position, orientation, blendShapes});
          },
          this.throttleRate,
          "update"
        );
      }

      shoot(event) {
        const {position, forward} = event.detail;
        this.publish(this.viewId, "shoot", {position, forward});
      }

      grab(event) {
        console.log("grab from iOS");
        const {id} = event.detail;
        this.publish(this.viewId, "grab", id);
      }
      release(event) {
        console.log("release from iOS")
        this.publish(this.viewId, "release");
      }
      reset() {
        console.log("reset");
        this.publish("pawns", "reset");
      }

      onGrab({id, viewId}) {
        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
          console.log("on grab")
          webkit.messageHandlers.arwebkit.postMessage({
            viewId,
            type: "grab",
            id,
          });
        }
      }
      onRelease({id, viewId}) {
        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
          console.log("on release")
          webkit.messageHandlers.arwebkit.postMessage({
            viewId,
            type: "release",
            id
          });
        }
      }
}

window.hideFountain = Boolean(window.webkit && window.webkit.messageHandlers.arwebkit);

const getCurrentTimeInterval = () => Math.floor((new Date()).getTime() / (1000 * 60 * 3));
const initTimeInterval = getCurrentTimeInterval();
setInterval(() => {
  const currentTimeInterval = getCurrentTimeInterval();
  if (currentTimeInterval !== initTimeInterval) {
    window.location = window.location;
  }
}, 1000);

window.AudioContext = window.AudioContext || window.webkitAudioContext;
async function go() {
    await LoadRapier();
    App.makeWidgetDock();
    //const session = await Session.join(`fountain-${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: 30});
    const session = await Session.join(`croquet-ar-chat-${initTimeInterval}`, MyModelRoot, MyViewRoot, {tps: 30, autoSleep: true, options: {disableFountain: true}, debug: ["snapshot"], viewIdDebugSuffix: window.hideFountain? 'mobile':''});
    window.session = session;
}

go();
