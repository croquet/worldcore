/* eslint-disable prefer-const */

import { App, Constants, View, StartWorldcore, mix, ViewRoot, ModelRoot, WebInputManager, Actor, Pawn, AM_MouselookAvatar, PM_MouselookAvatar, GetNamedView, AM_Avatar, PM_Avatar} from "@croquet/worldcore-kernel";
import { THREE, GLTFLoader } from "@croquet/worldcore-three";
//const three = THREE;
//console.log(FontLoader)
//import { BufferGeometryUtils } from 'three/addons/utils/BufferGeometryUtils.js';
import { AudioManagerView } from "./src/AudioManagerView.js";
import { AgoraIOView } from "./src/AgoraIOView.js";
//import { VSimpleTimer, MSimpleTimer } from "./src/simpletimer.js";
import apiKey from "./src/apiKey";

import {vertexShader} from './src/vertexShader.js';
import {fragmentShader} from './src/fragmentShader.js';

import eyeball_glb from "./assets/eyeball.glb";
import explosion from"./assets/textures/explosion.png";
let helvetiker = "./fonts/helvetiker_regular.typeface.json";

import photonSoundSrc from "./assets/sounds/Photon.mp3";
import bounceSoundSrc from "./assets/sounds/MetalBang.mp3";
import rechargeSoundSrc from "./assets/sounds/Recharge.wav";
import explosionSoundSrc from "./assets/sounds/Explosion.wav";
import implosionSoundSrc from "./assets/sounds/Implosion.mp3";
import hitSoundSrc from "./assets/sounds/Hit.wav";
import launchSoundSrc from "./assets/sounds/Launch.mp3";
import shootFailSoundSrc from "./assets/sounds/ShootFail.wav";
import pointSoundSrc from "./assets/sounds/Point.wav";

/*
------------------MazeWars-----------------------
Croquet Corporation, (C) 2020
This is a simple example of a multi-player 3D shooter.
It is loosely based upon the early Maze War game created at NASA Ames in 1973
https://en.wikipedia.org/wiki/Maze_War
This version uses a true 3D rendered world with mouse-look and smooth motion.

------------------TO DO-----------------------
 Scoring:
 When score hits 5 or 10, player is declared winner - new maze created.

 Sound:
 Add sound to avatars when they are moving

 Hit animations:
 Players/missiles should animate when they collide with each other.
 Hit player gets placed overhead in one of the cube towers where they can
 watch the game for a few seconds, then they are repositioned in the maze.
 New players should have 10 seconds +/- of grace before they can be killed.
 Animate hit on eyeball

 Mobile interface

 More fun:
 Make towers into elevators
 Animate eyeball
 Lead player gets a hat.

------------------BUGS-----------------------
 Bug - click in QR code only does the mouse0down. How do I click there?
 Bug - not working in Firefox (pointerLock not working)
 Bug - need access to worldcore vector library

------------------Table of Contents-----------------------
0.   Pseudo Globals
1.   Generators
1.1. Maze Generator
1.2. Missile Generator
1.3. Avatar Generator
1.4. Font Generator
1.5. Sound Generator
2.   Maze Model/View
2.1. MazeModel
2.2. MazeView
2.3  Generate 3D Maze
3.   Players
3.1  verify()
3.2  PlayerActor
3.3  PlayerPawn
4.   Missiles
4.1  MissileActor
4.2  MissilePawn
5.   WidgetDock and Session.join
*/




//------------------ 0. Pseudo Globals-----------------------
// The Constants variable is part of the Croquet model, so
// any object you add to it will automatically become part
// of the snapshot. This both minimizes side effects and
// ensures that any change to these variables forces the
// creation of a new session.
const Q = Constants;

Q.VERSION = 0.53;
// MAZE
// Rows and columns need to be even numbers
Q.MAZE_ROWS = 12; // actually one less cells - this refers to # wall
Q.MAZE_COLUMNS = 12;
Q.CELL_SIZE = 2;
Q.WALL_THICKNESS = 0.1;
Q.WALL_HEIGHT = 1;
Q.COLUMN_RADIUS = 0.1;

// AVATAR
Q.AVATAR_RADIUS = 0.3;
Q.AVATAR_DIST_SQUARED = (Q.AVATAR_RADIUS*2)*(Q.AVATAR_RADIUS*2); // squared distance between two objects
Q.AVATAR_CELL = Q.CELL_SIZE/2 - Q.AVATAR_RADIUS; // treat avatar as point and make walls thicker
Q.WALL_EPSILON = 0.001; // push a bit further from the wall
Q.SPEED = 0.002;

Q.THROTTLE_MOUSE = 1000 / 8;     // mouse event throttling

Q.MULTIPLY_SPEED = 2; // go faster

Q.MISSILE_LIFE = 4000; // lifetime of a missile
// working space variables
let PI_2 = Math.PI / 2;
let gVec = new THREE.Vector3();
let gEuler = new THREE.Euler( 0, 0, 0, 'YXZ' );

// need access to vector library
function v3_sqrMag(v) { // Squared magnitude
  return (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
//------------------ 1. GENERATORS -----------------------

//------------------ 1.1. MAZE GENERATOR -----------------------
// This generates a (mostly) braided maze. That is a kind of maze that has no dead ends. This actually does have dead ends
// on the edges, but I decided to leave it as is.

class MazeGenerator {

  constructor(width, height) {
    this.map = [];
    this.DIRECTIONS = {
      'N' : { dy: -1, opposite: 'S' },
      'S' : { dy:  1, opposite: 'N' },
      'E' : { dx:  1, opposite: 'W' },
      'W' : { dx: -1, opposite: 'E' }
    };
    this.WIDTH = width || 20;
    this.HEIGHT = height || 20;
    this.prefill();
    this.carve(this.WIDTH/2, this.HEIGHT/2, 'N');
    //console.log(this.output()); // if braid making holes?
    this.braid();
    this.clean();
    console.log("New Maze");
    console.log(this.output());
  }

  // initialize it with all walls on
  prefill() {
    for (let x = 0; x < this.WIDTH; x++) {
      this.map[x] = [];
      for (let y = 0; y < this.HEIGHT; y++) {
        this.map[x][y] = {};
      }
    }
  }

  // shuffle which direction to search
  shuffle(o) {
    for (let j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  // carve away a wall - don't go anywhere we have already been
  carve(x0, y0, direction) {

    let x1 = x0 + (this.DIRECTIONS[direction].dx || 0),
        y1 = y0 + (this.DIRECTIONS[direction].dy || 0);

    if (x1 === 0 || x1 === this.WIDTH || y1 === 0 || y1 === this.HEIGHT) {
      return;
    }

    if ( this.map[x1][y1].seen ) {
      return;
    }

    this.map[x0][y0][ direction ] = true;
    this.map[x1][y1][ this.DIRECTIONS[direction].opposite ] = true;
    this.map[x1][y1].seen = true;

    let directions = this.shuffle([ 'N', 'S', 'E', 'W' ]);
    for (let i = 0; i < directions.length; i++) {
      this.carve(x1, y1, directions[i]);
    }
  }

  // remove cull-de-sacs. This is incomplete, a few may remain along the edges
  braid() {
    for (let y = 2; y < this.HEIGHT-1; y++) {
      for (let x = 2; x < this.WIDTH-1; x++) {

        if (x>1 && !(this.map[x][y].S || this.map[x][y].E || this.map[x][y].N)) {
          this.map[x][y].E = true;
          this.map[x+1][y].W = true;
        }
        if (y>1 && !(this.map[x][y].E || this.map[x][y].N || this.map[x][y].W)) {
          this.map[x][y].N = true;
          this.map[x][y-1].S = true;
        }
        if (!(this.map[x][y].N || this.map[x][y].W || this.map[x][y].S)) {
          this.map[x][y].W = true;
          this.map[x-1][y].E = true;
        }
        if (!(this.map[x][y].W || this.map[x][y].S || this.map[x][y].W)) {
          this.map[x][y].S = true;
          this.map[x][y+1].N = true;
        }
      }
    }
  }

  // dump most of the data - don't need it anymore
  clean() {// remove N and W
    for (let y = 0; y < this.HEIGHT; y++) {
      for (let x = 0; x < this.WIDTH; x++) {
        //delete this.map[x][y].N;
        //delete this.map[x][y].W;
        delete this.map[x][y].seen;
      }
    }
  }

  // this lets me see the maze in the console
  output() {
    let output = '\n';
    for (let y = 0; y < this.HEIGHT; y++) {
      for (let x = 0; x < this.WIDTH; x++) {
        if (x>0)output += ( this.map[x][y].S ? ' ' : '_' );
        output += ( this.map[x][y].E ? ' ' : y===0?' ':'!' );
      }
      output += '\n';
    }
    output = output.replace(/_ /g, '__');
    return output;
  }
}

//------------------ 1.2. Missile Generator -----------------------
// 3D shader-based missile
class Missile3DGenerator {
  constructor() {
   let explosionTexture = new THREE.TextureLoader().load( explosion );
   let material = new THREE.ShaderMaterial( {
     uniforms: {
       tExplosion: {
         type: "t",
         value: explosionTexture
       },
       time: {
         type: "f",
         value: 0.0
       }
     },
     vertexShader: vertexShader(),
     fragmentShader: fragmentShader()

    } );

    this.missile3D = new THREE.Mesh(
           new THREE.IcosahedronGeometry( 20, 4 ),
           material
    );
    this.missile3D.scale.set(0.012, 0.012, 0.012);
  }

  generate() {
    return this.missile3D.clone();
  }
}

let missileGenerator;

//------------------ 1.3. Avatar Generator -----------------------
// 3D avatar model

class Avatar3DGenerator {
  constructor() {
    this.eyeConstruct();
 }

  async eyeConstruct() {
  const loader = new GLTFLoader();
    loader.load( eyeball_glb, async function ( gltf ) {
      this.avatar3D = gltf.scene;
    } );
  }

  generate(isAvatar) {
    //console.log("Avatar3DGenerator.generate() :", isAvatar)
    let geometry = new THREE.CircleGeometry( Q.AVATAR_RADIUS, 32 );
    let material = new THREE.MeshBasicMaterial( { color: 0x111111, opacity: 0.25, transparent: true } );
    let shadow = new THREE.Mesh( geometry, material );
    shadow.rotation.x = -Math.PI/2;
    shadow.position.y = 0.001-Q.WALL_HEIGHT/2;
    let object = new THREE.Group();
    object.add(this.avatar3D.clone());
    let avatar = new THREE.Group();
    avatar.add( object );
    avatar.eyeball = object;
    avatar.add( shadow );
    if (isAvatar)avatar.eyeball.add(this.reticle());
    //console.log(avatar);
    return avatar;
  }
}

let avatarGenerator;

//------------------ 1.4. Font Generator -----------------------
class Font3DGenerator{
  constructor(){
    // XYZZY - OK, npm actually loads the font itself when we use require(). Nuts...
    var fontLoader = new FontLoader();
    this.font = fontLoader.parse(helvetiker);
  }

  generate(message, color){
    let material = new THREE.MeshBasicMaterial( {
      color: color,
      transparent: true,
      opacity: 0.8,
      //side: THREE.DoubleSide
    } );

    let shapes = this.font.generateShapes( message, 1 );
    let geometry = new THREE.ShapeBufferGeometry( shapes );
    geometry.computeBoundingBox();
    let xMid = - 0.5 * ( geometry.boundingBox.max.x + geometry.boundingBox.min.x );
    geometry.translate( xMid, 0, 0 );
    let rval = new THREE.Mesh( geometry, material );
    return(rval);
  }
}

let fontGenerator;
//------------------ 1.5. Sound Generator -----------------------
// 3D sound player
let soundSwitch = false; // turn sound on and off
let volume = 1;

const maxSound = 16;
const listener = new THREE.AudioListener();
const soundList = {};
const soundLoops = [];
const loopSoundVolume = 0.25;

export const playSound = function() {
    const audioLoader = new THREE.AudioLoader();

    function play(soundURL, parent3D, force, loop = false) {

        if (!force && !soundSwitch) return;
        if (soundList[soundURL]) playSoundOnce(soundList[soundURL], parent3D, force, loop);
        else {
            audioLoader.load( soundURL, buffer => {
                soundList[soundURL] = {buffer, count:0};
                playSoundOnce(soundList[soundURL], parent3D, force, loop);
            });
        }
    }
    return play;
}();

class MyAudio extends THREE.PositionalAudio {
    updateMatrixWorld(force) {
        if(isNaN(this.parent.matrixWorld.elements[0])) 
            {   console.log(this);
                debugger;
            }
        // this.parent.updateMatrix();
        //console.log("Matrix: ", this.matrix, this);
        super.updateMatrixWorld(force);
    }
}

function playSoundOnce(sound, parent3D, force, loop = false) {
    if (!force && sound.count>maxSound) return;
    sound.count++;
    let mySound;
    if (parent3D) {
        mySound = new THREE.PositionalAudio( listener );  // listener is a global
        //mySound = new MyAudio( listener );  // listener is a global
        mySound.setRefDistance( 8 );
        mySound.setVolume( volume );
    }
    else {
        mySound = new THREE.Audio( listener );
        mySound.setVolume( volume * loopSoundVolume );
        soundLoops.push(mySound);
    }

    mySound.setBuffer( sound.buffer );
    mySound.setLoop(loop);
    if (parent3D) {
        parent3D.add(mySound);
        parent3D.mySound = mySound;
        mySound.onEnded = ()=> { sound.count--; mySound.removeFromParent(); };
    }
    mySound.play();

}
//------------------ 2. MAZE MODEL/VIEW -----------------
// The main container classes. Establish the "world" that
// we are playing in. Manages creation of the actual play
// space, the players/avatars and the missiles.

//------------------ 2.1. MAZE MODEL -----------------------
// Everything happens here.

class MazeModel extends ModelRoot {
    init(options) {
        super.init(options);
        this.map = new MazeGenerator(Q.MAZE_ROWS, Q.MAZE_COLUMNS).map;
        // set up players
        this.players = {};
        this.subscribe( this.sessionId, "view-join", this.addPlayer );
        this.subscribe( this.sessionId, "view-exit", this.removePlayer );
        this.subscribe( "missile", "missile-shoot", this.fireMissile );
        this.subscribe( "maze", "new-maze", this.newMaze );
        this.subscribe( "model", "announce", this.announce );
        this.future(120000).changeMaze();
    }


    // make an announcement to everyone
    announce( ann ){
        this.publish("everyone", "global-announce", ann);
    }

    // really mess with the game players
    changeMaze(){
      this.announce({text: "A new maze has been created!", time: 6000});
      this.publish("maze", "new-maze");
      this.future(120000).changeMaze();
    }

    // Add and remove players
    addPlayer( viewId ) {
        //console.log("MazeModel.addPlayer(",viewId,")");
        if (this.players[viewId]) { console.warn("player already exists for joining user", viewId); return; }
        const player = PlayerActor.create(this);
        this.players[viewId] = player;
        this.publish(this.id, 'player-added', player);
    }

    removePlayer( id ) {
        //console.log("MazeModel.removePlayer(",id,")");
        const player = this.players[id];
        if (!player) { console.warn("player not found for leaving user", id); return; }
        delete this.players[id];
        player.destroy();
    }

    fireMissile( missilePose ) {
      const missile = MissileActor.create( this );
      //console.log("MazeModel.fireMissile() ", missile);
      missile.setPose( missilePose );
      this.publish("missile", "missile-added", missile.id);
    }

    newMaze(){
      this.map = new MazeGenerator(Q.MAZE_ROWS, Q.MAZE_COLUMNS).map;
      this.publish(this.id, "construct-new-maze");
    }
}

MazeModel.register("MazeModel");

//------------------ 2.2. MAZE View -----------------------
// Manages the 3D world and the UI.

class MazeView extends ViewRoot  {

    constructor(model) {
        super(model);
        this.setupWebInputManager();
        this.setUpScene();
        this.setupPlayers(model);
        // construct the maze
        this.constructMaze(model.map);
        let d = Q.CELL_SIZE*(Q.MAZE_ROWS-1.5)/2; d = Math.sqrt(2*d*d);
        this.constructCompass(d, Q.CELL_SIZE/2);

        this.audioManager = new AudioManagerView(model);

        // mouse throttle
        this.lastTime = 0;
        this.startTime = (new Date()).getTime();
        this.subscribe(model.id, "construct-new-maze", this.newMaze);
    }

    //------------------ Setup the 3D Scene -----------------------
    // one-time function to set up Three.js, with a simple lit scene
    setUpScene() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color( 0xaa4444 );
      this.scene.fog = new THREE.FogExp2( 0xaa4444, 0.0525 );
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const light = new THREE.PointLight(0xffffff, 1);
      light.position.set(50, 50, 50);
      this.scene.add(light);
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
      const threeCanvas = document.getElementById("three");
      this.renderer = new THREE.WebGLRenderer({ canvas: threeCanvas });
      this.renderer.setClearColor(0xaa4444);

      //window.addEventListener('resize', onWindowResize, false);
      this.onWindowResize();
    }

      // function that the app must invoke when ready to render the scene
      // on each animation frame.
      sceneRender() { this.renderer.render(this.scene, this.camera); }

      onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }

    //------------------ Create Players -----------------------
    setupPlayers(model) {
      Object.values(model.players).forEach(player => this.attachPlayer(player));
      this.subscribe(model.id, 'player-added', this.attachPlayer);
      this.subscribe("missile", "missile-added", this.attachMissile);
    }

    detach() {
      super.detach();
      this.audioManager.detach();

      let child;
      if (this.element) { // why would element not exist?
        while (child = this.element.firstChild) this.element.removeChild(child);
      }
    }

    // A new player has joined
    attachPlayer(player) {
     // console.log(player);
      // grab the pawn associated with this player.id
      const pawn = GetNamedView("PawnManager").get(player.id);
      //console.log("MazeView.attachPlayer(", player.id,")");
      pawn.install(this, this.scene, this.camera);
      // grab our own avatar
      if (this.model.players[this.viewId] === player) {
        this.setUserPlayer(player);
      }
    }

    // THIS is our avatar
    setUserPlayer(player) {
      this.pAvatar = GetNamedView("PawnManager").get(player.id);
      this.pAvatar.setAvatar();
//      this.pAvatar.isAvatar = true;
//      this.pAvatar.subscribe(this.pAvatar.actor.id, 'canShoot', () => {
//        this.pAvatar.hud.startShoot(0);
//        this.publish('audio', 'create', {
//            src : rechargeSoundSrc, // change source later
//            translation : this.pAvatar.actor.translation,
//            euler : this.pAvatar.actor.euler,
//            autoplay : true,
//        });
//      })
//      this.pAvatar.setHUD( this.camera );
    }

    attachMissile(missileID) {
      //console.log("MazeView.attachMissile() ", missileID);
      const missilePawn = GetNamedView("PawnManager").get(missileID);
      missilePawn.install( this.scene );
    }

//------------------ Setup WebInput Interface -----------------------
    setupWebInputManager() {
      this.webManager = new WebInputManager();
      this.subscribe("input", "resize", this.onWindowResize);
      this.subscribe("input", "mouse0Down", this.onMouse0Down); // input
      this.subscribe("input", "mouse0Up", this.onMouse0Up); // input
      this.subscribe("input", "mouseDelta", this.onMouseDelta);
      this.subscribe("input", "keyDown", this.onKeyDown);
      this.subscribe("input", "keyUp", this.onKeyUp);
      this.subscribe("input", "pointerLock", this.onPointerLock);
    }

    onMouse0Down() {
      if( this.webManager.inPointerLock )
        this.pAvatar.shootMissile()
      else
        this.webManager.enterPointerLock();
    }

    onMouse0Up() {
      // console.log("mouse0Up");
    }

    onMouseDelta(xy) {
      if (this.webManager.inPointerLock || this.inLoadTest) {
        // immediate:
        gEuler.setFromQuaternion( this.pAvatar.pawn3D.eyeball.quaternion );
        gEuler.y -= xy[0] * 0.002;
        gEuler.x += xy[1] * 0.002;
        gEuler.x = Math.max( 0.01- PI_2, Math.min( PI_2-0.01, gEuler.x ) ); // avoid gimbal lock
        this.pAvatar.pawn3D.eyeball.quaternion.setFromEuler( gEuler );

        // published:
        let t = (new Date()).getTime();
        if (t-this.lastTime>Q.THROTTLE_MOUSE) {
          let q = this.pAvatar.pawn3D.eyeball.quaternion;
          this.pAvatar.rotateTo([q.x, q.y, q.z, q.w]);
          this.lastTime = t;
        }
      }
    }

    onKeyDown(event) {
      if (this.pAvatar) {
        switch (event.key.toLowerCase()) {
          case 'w': this.pAvatar.setSpeed(Q.SPEED); break;
          case 's':  this.pAvatar.setSpeed( -Q.SPEED); break;
          case 'a': this.pAvatar.setStrafeSpeed( Q.SPEED ); break;
          case 'd': this.pAvatar.setStrafeSpeed( -Q.SPEED ); break;
          case 'shift': this.pAvatar.setMultiplySpeed( Q.MULTIPLY_SPEED); break;
          case '=': this.pAvatar.showState(); break;
          //case '~': this.pAvatar.say( "relocate" ); break; // xyzzy definitely remove this before deployment - it can be used as a cheat
          case 'm': this.publish("maze", "new-maze"); break;
          case '?': this.loadTest(); break;
          case 'v': this.publish('agora.io', 'toggle'); break;
          //case '+': this.pAvatar.addScore( "test" );
          // case 't': this.testTimer(); break;
          // no default 
        }
      }
    }

    loadTest(){
      if(this.inLoadTest)this.inLoadTest = false;
      else {
        this.inLoadTest = true;
        this.doLoadTest();
      }
    }

    doLoadTest(){
      this.onMouseXY([0,0,4-Math.floor(Math.random()*9), 4-Math.floor(Math.random()*9)]);
      if(this.inLoadTest)this.future(10).doLoadTest();
    }

    onKeyUp(event) {
      if (this.pAvatar) {
        switch (event.key.toLowerCase()) {
          case 'w':
          case 's': this.pAvatar.setSpeed( 0 ); break;
          case 'a':
          case 'd': this.pAvatar.setStrafeSpeed( 0 ); break;
          case 'shift': this.pAvatar.setMultiplySpeed( 1 ); break;
          // no default 
        }

      }
    }

    onPointerLock( iPL ) {
      if(iPL)
        blocker.style.display = 'none';
      else
        blocker.style.display = '';
    }

//------------------ 2.3 GENERATE 3D MAZE-----------------------

    newMaze(){
      this.hideMaze(1);
    }

    hideMaze(val){
      val -= .1;
      this.fadeMaze(val);

      if(val < 0) {
              // remove the old maze walls
        this.walls.geometry.dispose();
        this.walls.material.dispose();
        this.scene.remove(this.walls);
        // construct the new maze walls
        this.constructWalls(this.model.map);
        this.showMaze( 0 );
      }else this.future(100).hideMaze(val);
    }

    showMaze(val){
      if(val>=1)this.fadeMaze(1); // make sure the fade is 1
      else {
        val += 0.1;
        this.fadeMaze( val );
        this.future(100).showMaze(val);
      }
    }

    fadeMaze(val){
      this.walls.material.transparent = val!==1;
      this.walls.material.opacity = val;
    }


    // construct the maze based upon the computed maze from the map created in the model

    constructMaze(map){
      this.constructFoundation();
      this.constructWalls(map);
    }

    constructWalls(map){
      let eastWallGeometry = new THREE.BoxBufferGeometry( Q.WALL_THICKNESS, Q.WALL_HEIGHT, Q.CELL_SIZE-Q.COLUMN_RADIUS, 1, 2, 4 );
      let southWallGeometry = new THREE.BoxBufferGeometry( Q.CELL_SIZE-Q.COLUMN_RADIUS, Q.WALL_HEIGHT, Q.WALL_THICKNESS,4,1,2);
      let wallMaterial = new THREE.MeshStandardMaterial( {color: 0xAAAACC, roughness: 0.7, metalness:0.8  } );
      let walls = [];

      for (let y = 0; y < Q.MAZE_ROWS; y++) {
        for (let x = 0; x < Q.MAZE_COLUMNS; x++) {

          // south walls
            if (!map[x][y].S && x>0) {
              let wl = southWallGeometry.clone();
              wl.translate( x*Q.CELL_SIZE - Q.CELL_SIZE/2, 0, y*Q.CELL_SIZE);
              walls.push( wl );
            }

          // east walls
            if (!map[x][y].E && y>0) {
              let wl = eastWallGeometry.clone();
              wl.translate( x*Q.CELL_SIZE, 0, (y+1)*Q.CELL_SIZE - 3*Q.CELL_SIZE/2);
              walls.push( wl );
            }

      }
    }
    this.scene.add(this.walls = new THREE.Mesh( BufferGeometryUtils.mergeBufferGeometries(walls), wallMaterial ));

    }
    constructFoundation(map) {

      //let columnGeometry = new THREE.BoxBufferGeometry( Q.COLUMN_RADIUS*2, Q.WALL_HEIGHT, Q.COLUMN_RADIUS*2);
      let columnGeometry = new THREE.CylinderBufferGeometry( Q.WALL_THICKNESS/2, Q.WALL_THICKNESS/2, Q.WALL_HEIGHT, 16, 2);
      let columnMaterial = new THREE.MeshStandardMaterial( {color: 0x666666, roughness: 0.7 } );
      let floorGeometry = new THREE.PlaneBufferGeometry(Q.CELL_SIZE-2*Q.COLUMN_RADIUS, Q.CELL_SIZE-2*Q.COLUMN_RADIUS, 4, 4);
      let floorMaterial = new THREE.MeshStandardMaterial( {color: 0x999999, roughness: 0.7 } );

      let columns = [];
      let floors = [];
      //let walls = [];

      for (let y = 0; y < Q.MAZE_ROWS; y++) {
          for (let x = 0; x < Q.MAZE_COLUMNS; x++) {

            // columns
              let cg = columnGeometry.clone();
              cg.translate(x*Q.CELL_SIZE, 0, y*Q.CELL_SIZE);
              columns.push(cg);

            // floor
              if (x<Q.MAZE_COLUMNS-1 && y<Q.MAZE_ROWS-1) {
                let fl = floorGeometry.clone();
                fl.rotateX(-PI_2);
                fl.translate( x*Q.CELL_SIZE+Q.CELL_SIZE/2, -Q.CELL_SIZE/4, y*Q.CELL_SIZE+Q.CELL_SIZE/2);
                floors.push(fl);
              }
        }
      }
      this.scene.add(new THREE.Mesh( BufferGeometryUtils.mergeBufferGeometries(columns), columnMaterial ));
      this.scene.add(new THREE.Mesh( BufferGeometryUtils.mergeBufferGeometries(floors), floorMaterial ));
     }

    constructCompass(_distance, _size) {
      let compass = new THREE.Group();
      let distY = Q.CELL_SIZE*3;
      let offset = Q.CELL_SIZE/2;
      let cubeGeo = new THREE.BoxGeometry(Q.CELL_SIZE,Q.CELL_SIZE,Q.CELL_SIZE, 1,1,1);
      let edgeGeo = [
        new THREE.BoxBufferGeometry( // x-axis
          Q.CELL_SIZE,
          Q.COLUMN_RADIUS*2,
          Q.COLUMN_RADIUS*2),
        new THREE.BoxBufferGeometry( // y-axis - this covers all four corners
          Q.COLUMN_RADIUS*2,
          Q.CELL_SIZE + Q.COLUMN_RADIUS*2,
          Q.COLUMN_RADIUS*2),
        new THREE.BoxBufferGeometry(  // z-axis
          Q.COLUMN_RADIUS*2,
          Q.COLUMN_RADIUS*2,
          Q.CELL_SIZE)

      ];
      let edgeMat = new THREE.MeshStandardMaterial( {color: 0x666666, roughness: 0.7 } );

      let cube;
      cube = this.constructCube(
        cubeGeo, new THREE.Vector3(offset,distY,offset), 0x44AAAA, edgeGeo, edgeMat);
      compass.add( cube );
      cube = this.constructCube(
        cubeGeo, new THREE.Vector3(offset, distY, Q.CELL_SIZE*(Q.MAZE_COLUMNS-1)-offset), 0xAA2222, edgeGeo, edgeMat);
      compass.add( cube );
      cube = this.constructCube(
        cubeGeo, new THREE.Vector3(Q.CELL_SIZE*(Q.MAZE_COLUMNS-1)-offset, distY, Q.CELL_SIZE*(Q.MAZE_COLUMNS-1)-offset), 0x228822, edgeGeo, edgeMat);
      compass.add( cube );
      cube = this.constructCube(
        cubeGeo, new THREE.Vector3(Q.CELL_SIZE*(Q.MAZE_COLUMNS-1)-offset, distY,offset), 0x888822, edgeGeo, edgeMat);
      compass.add( cube );
      this.compass = compass;
      this.scene.add( compass );
    }

    constructCube(geo, pos, color, edgeGeo, edgeMat) {
      let d = Q.CELL_SIZE/2;
      let mat = new THREE.MeshStandardMaterial({color, emissive: color,  emissiveIntensity: 1, roughness: 0.7});
      let cube = new THREE.Mesh( geo, mat);

      let edges = [];

      edges.push( edgeGeo[0].clone().translate( 0,-d,-d));
      edges.push( edgeGeo[0].clone().translate( 0,-d, d));
      edges.push( edgeGeo[0].clone().translate( 0, d, d));
      edges.push( edgeGeo[0].clone().translate( 0, d,-d));

      edges.push( edgeGeo[1].clone().translate(-d, 0,-d));
      edges.push( edgeGeo[1].clone().translate(-d, 0, d));
      edges.push( edgeGeo[1].clone().translate( d, 0, d));
      edges.push( edgeGeo[1].clone().translate( d, 0,-d));

      edges.push( edgeGeo[2].clone().translate(-d,-d, 0));
      edges.push( edgeGeo[2].clone().translate(-d, d, 0));
      edges.push( edgeGeo[2].clone().translate( d, d, 0));
      edges.push( edgeGeo[2].clone().translate( d,-d, 0));

      cube.position.copy(pos);
      cube.add(new THREE.Mesh( BufferGeometryUtils.mergeBufferGeometries(edges), edgeMat ));
      return cube;
    }

    update(time) {
      // let emissive = Math.sin(this.startTime-(new Date()).getTime());
     // this.compass.children.forEach(cube=>cube.material.emissiveIntensity = emissive);

      super.update(time);
      this.sceneRender();
    }
}

//------------------ 3. Players -----------------------
// Player Actor & Pawn - this is the avatar/player.
// It uses the MouseLook mixin.

//----------------- 3.1 Verify---------------------
// shared verify function
function verify(loc, lastLoc, map) {
  let x = loc[0];
  let y = loc[1];
  let z = loc[2];
  let xCell = Math.floor(x/Q.CELL_SIZE)+1;
  let zCell = Math.floor(z/Q.CELL_SIZE)+1;

  if ( xCell>=0 && xCell < Q.MAZE_COLUMNS && zCell>=0 && zCell < Q.MAZE_ROWS ) { //off the map
    let cell = map[xCell][zCell];

    // where are we within the cell?
    let offsetX = 1+x - xCell*Q.CELL_SIZE;
    let offsetZ = 1+z - zCell*Q.CELL_SIZE;

    if (!cell.S && offsetZ > Q.AVATAR_CELL)z -= Q.WALL_EPSILON + offsetZ - Q.AVATAR_CELL;
    else if (!cell.N && offsetZ < -Q.AVATAR_CELL) z -= offsetZ  + Q.AVATAR_CELL - Q.WALL_EPSILON;
    if (!cell.E && offsetX > Q.AVATAR_CELL) x -= Q.WALL_EPSILON + offsetX - Q.AVATAR_CELL;
    else if (!cell.W && offsetX < -Q.AVATAR_CELL) x -= offsetX + Q.AVATAR_CELL - Q.WALL_EPSILON;

  } else {  }// if we find ourselves off the map, then jump back 
  return [x, y, z];
}

//----------------- 3.2 PlayerActor ---------------------
class PlayerActor extends mix(Actor).with(AM_MouselookAvatar) {
  init( mazeModel ) {
    super.init('PlayerPawn');
    //console.log("PlayerActor.init(", this.id,")" );
    this.mazeModel = mazeModel;
    this.relocate();
    this.listen("IShotTheMissile", this.iShotTheMissile);
    this.listen("relocate", this.relocate);
    this.canShoot = true;
    this.myName = this.generateName();
  }


//(c) by Thomas Konings
//Random Name Generator for Javascript

capFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

generateName(){
var name1 = ["abandoned","able","absolute","adorable","adventurous","academic","acceptable","acclaimed","accomplished","accurate","aching","acidic","acrobatic","active","actual","adept","admirable","admired","adolescent","adorable","adored","advanced","afraid","affectionate","aged","aggravating","aggressive","agile","agitated","agonizing","agreeable","ajar","alarmed","alarming","alert","alienated","alive","all","altruistic","amazing","ambitious","ample","amused","amusing","anchored","ancient","angelic","angry","anguished","animated","annual","another","antique","anxious","any","apprehensive","appropriate","apt","arctic","arid","aromatic","artistic","ashamed","assured","astonishing","athletic","attached","attentive","attractive","austere","authentic","authorized","automatic","avaricious","average","aware","awesome","awful","awkward","babyish","bad","back","baggy","bare","barren","basic","beautiful","belated","beloved","beneficial","better","best","bewitched","big","big-hearted","biodegradable","bite-sized","bitter","black","black-and-white","bland","blank","blaring","bleak","blind","blissful","blond","blue","blushing","bogus","boiling","bold","bony","boring","bossy","both","bouncy","bountiful","bowed","brave","breakable","brief","bright","brilliant","brisk","broken","bronze","brown","bruised","bubbly","bulky","bumpy","buoyant","burdensome","burly","bustling","busy","buttery","buzzing","calculating","calm","candid","canine","capital","carefree","careful","careless","caring","cautious","cavernous","celebrated","charming","cheap","cheerful","cheery","chief","chilly","chubby","circular","classic","clean","clear","clear-cut","clever","close","closed","cloudy","clueless","clumsy","cluttered","coarse","cold","colorful","colorless","colossal","comfortable","common","compassionate","competent","complete","complex","complicated","composed","concerned","concrete","confused","conscious","considerate","constant","content","conventional","cooked","cool","cooperative","coordinated","corny","corrupt","costly","courageous","courteous","crafty","crazy","creamy","creative","creepy","criminal","crisp","critical","crooked","crowded","cruel","crushing","cuddly","cultivated","cultured","cumbersome","curly","curvy","cute","cylindrical","damaged","damp","dangerous","dapper","daring","darling","dark","dazzling","dead","deadly","deafening","dear","dearest","decent","decimal","decisive","deep","defenseless","defensive","defiant","deficient","definite","definitive","delayed","delectable","delicious","delightful","delirious","demanding","dense","dental","dependable","dependent","descriptive","deserted","detailed","determined","devoted","different","difficult","digital","diligent","dim","dimpled","dimwitted","direct","disastrous","discrete","disfigured","disgusting","disloyal","dismal","distant","downright","dreary","dirty","disguised","dishonest","dismal","distant","distinct","distorted","dizzy","dopey","doting","double","downright","drab","drafty","dramatic","dreary","droopy","dry","dual","dull","dutiful","each","eager","earnest","early","easy","easy-going","ecstatic","edible","educated","elaborate","elastic","elated","elderly","electric","elegant","elementary","elliptical","embarrassed","embellished","eminent","emotional","empty","enchanted","enchanting","energetic","enlightened","enormous","enraged","entire","envious","equal","equatorial","essential","esteemed","ethical","euphoric","even","evergreen","everlasting","every","evil","exalted","excellent","exemplary","exhausted","excitable","excited","exciting","exotic","expensive","experienced","expert","extraneous","extroverted","extra-large","extra-small","fabulous","failing","faint","fair","faithful","fake","false","familiar","famous","fancy","fantastic","far","faraway","far-flung","far-off","fast","fat","fatal","fatherly","favorable","favorite","fearful","fearless","feisty","feline","female","feminine","few","fickle","filthy","fine","finished","firm","first","firsthand","fitting","fixed","flaky","flamboyant","flashy","flat","flawed","flawless","flickering","flimsy","flippant","flowery","fluffy","fluid","flustered","focused","fond","foolhardy","foolish","forceful","forked","formal","forsaken","forthright","fortunate","fragrant","frail","frank","frayed","free","French","fresh","frequent","friendly","frightened","frightening","frigid","frilly","frizzy","frivolous","front","frosty","frozen","frugal","fruitful","full","fumbling","functional","funny","fussy","fuzzy","gargantuan","gaseous","general","generous","gentle","genuine","giant","giddy","gigantic","gifted","giving","glamorous","glaring","glass","gleaming","gleeful","glistening","glittering","gloomy","glorious","glossy","glum","golden","good","good-natured","gorgeous","graceful","gracious","grand","grandiose","granular","grateful","grave","gray","great","greedy","green","gregarious","grim","grimy","gripping","grizzled","gross","grotesque","grouchy","grounded","growing","growling","grown","grubby","gruesome","grumpy","guilty","gullible","gummy","hairy","half","handmade","handsome","handy","happy","happy-go-lucky","hard","hard-to-find","harmful","harmless","harmonious","harsh","hasty","hateful","haunting","healthy","heartfelt","hearty","heavenly","heavy","hefty","helpful","helpless","hidden","hideous","high","high-level","hilarious","hoarse","hollow","homely","honest","honorable","honored","hopeful","horrible","hospitable","hot","huge","humble","humiliating","humming","humongous","hungry","hurtful","husky","icky","icy","ideal","idealistic","identical","idle","idiotic","idolized","ignorant","ill","illegal","ill-fated","ill-informed","illiterate","illustrious","imaginary","imaginative","immaculate","immaterial","immediate","immense","impassioned","impeccable","impartial","imperfect","imperturbable","impish","impolite","important","impossible","impractical","impressionable","impressive","improbable","impure","inborn","incomparable","incompatible","incomplete","inconsequential","incredible","indelible","inexperienced","indolent","infamous","infantile","infatuated","inferior","infinite","informal","innocent","insecure","insidious","insignificant","insistent","instructive","insubstantial","intelligent","intent","intentional","interesting","internal","international","intrepid","ironclad","irresponsible","irritating","itchy","jaded","jagged","jam-packed","jaunty","jealous","jittery","joint","jolly","jovial","joyful","joyous","jubilant","judicious","juicy","jumbo","junior","jumpy","juvenile","kaleidoscopic","keen","key","kind","kindhearted","kindly","klutzy","knobby","knotty","knowledgeable","knowing","known","kooky","kosher","lame","lanky","large","last","lasting","late","lavish","lawful","lazy","leading","lean","leafy","left","legal","legitimate","light","lighthearted","likable","likely","limited","limp","limping","linear","lined","liquid","little","live","lively","livid","loathsome","lone","lonely","long","long-term","loose","lopsided","lost","loud","lovable","lovely","loving","low","loyal","lucky","lumbering","luminous","lumpy","lustrous","luxurious","mad","made-up","magnificent","majestic","major","male","mammoth","married","marvelous","masculine","massive","mature","meager","mealy","mean","measly","meaty","medical","mediocre","medium","meek","mellow","melodic","memorable","menacing","merry","messy","metallic","mild","milky","mindless","miniature","minor","minty","miserable","miserly","misguided","misty","mixed","modern","modest","moist","monstrous","monthly","monumental","moral","mortified","motherly","motionless","mountainous","muddy","muffled","multicolored","mundane","murky","mushy","musty","muted","mysterious","naive","narrow","nasty","natural","naughty","nautical","near","neat","necessary","needy","negative","neglected","negligible","neighboring","nervous","new","next","nice","nifty","nimble","nippy","nocturnal","noisy","nonstop","normal","notable","noted","noteworthy","novel","noxious","numb","nutritious","nutty","obedient","obese","oblong","oily","oblong","obvious","occasional","odd","oddball","offbeat","offensive","official","old","old-fashioned","only","open","optimal","optimistic","opulent","orange","orderly","organic","ornate","ornery","ordinary","original","other","our","outlying","outgoing","outlandish","outrageous","outstanding","oval","overcooked","overdue","overjoyed","overlooked","palatable","pale","paltry","parallel","parched","partial","passionate","past","pastel","peaceful","peppery","perfect","perfumed","periodic","perky","personal","pertinent","pesky","pessimistic","petty","phony","physical","piercing","pink","pitiful","plain","plaintive","plastic","playful","pleasant","pleased","pleasing","plump","plush","polished","polite","political","pointed","pointless","poised","poor","popular","portly","posh","positive","possible","potable","powerful","powerless","practical","precious","present","prestigious","pretty","precious","previous","pricey","prickly","primary","prime","pristine","private","prize","probable","productive","profitable","profuse","proper","proud","prudent","punctual","pungent","puny","pure","purple","pushy","putrid","puzzled","puzzling","quaint","qualified","quarrelsome","quarterly","queasy","querulous","questionable","quick","quick-witted","quiet","quintessential","quirky","quixotic","quizzical","radiant","ragged","rapid","rare","rash","raw","recent","reckless","rectangular","ready","real","realistic","reasonable","red","reflecting","regal","regular","reliable","relieved","remarkable","remorseful","remote","repentant","required","respectful","responsible","repulsive","revolving","rewarding","rich","rigid","right","ringed","ripe","roasted","robust","rosy","rotating","rotten","rough","round","rowdy","royal","rubbery","rundown","ruddy","rude","runny","rural","rusty","sad","safe","salty","same","sandy","sane","sarcastic","sardonic","satisfied","scaly","scarce","scared","scary","scented","scholarly","scientific","scornful","scratchy","scrawny","second","secondary","second-hand","secret","self-assured","self-reliant","selfish","sentimental","separate","serene","serious","serpentine","several","severe","shabby","shadowy","shady","shallow","shameful","shameless","sharp","shimmering","shiny","shocked","shocking","shoddy","short","short-term","showy","shrill","shy","sick","silent","silky","silly","silver","similar","simple","simplistic","sinful","single","sizzling","skeletal","skinny","sleepy","slight","slim","slimy","slippery","slow","slushy","small","smart","smoggy","smooth","smug","snappy","snarling","sneaky","sniveling","snoopy","sociable","soft","soggy","solid","somber","some","spherical","sophisticated","sore","sorrowful","soulful","soupy","sour","Spanish","sparkling","sparse","specific","spectacular","speedy","spicy","spiffy","spirited","spiteful","splendid","spotless","spotted","spry","square","squeaky","squiggly","stable","staid","stained","stale","standard","starchy","stark","starry","steep","sticky","stiff","stimulating","stingy","stormy","straight","strange","steel","strict","strident","striking","striped","strong","studious","stunning","stupendous","stupid","sturdy","stylish","subdued","submissive","substantial","subtle","suburban","sudden","sugary","sunny","super","superb","superficial","superior","supportive","sure-footed","surprised","suspicious","svelte","sweaty","sweet","sweltering","swift","sympathetic","tall","talkative","tame","tan","tangible","tart","tasty","tattered","taut","tedious","teeming","tempting","tender","tense","tepid","terrible","terrific","testy","thankful","that","these","thick","thin","third","thirsty","this","thorough","thorny","those","thoughtful","threadbare","thrifty","thunderous","tidy","tight","timely","tinted","tiny","tired","torn","total","tough","traumatic","treasured","tremendous","tragic","trained","tremendous","triangular","tricky","trifling","trim","trivial","troubled","true","trusting","trustworthy","trusty","truthful","tubby","turbulent","twin","ugly","ultimate","unacceptable","unaware","uncomfortable","uncommon","unconscious","understated","unequaled","uneven","unfinished","unfit","unfolded","unfortunate","unhappy","unhealthy","uniform","unimportant","unique","united","unkempt","unknown","unlawful","unlined","unlucky","unnatural","unpleasant","unrealistic","unripe","unruly","unselfish","unsightly","unsteady","unsung","untidy","untimely","untried","untrue","unused","unusual","unwelcome","unwieldy","unwilling","unwitting","unwritten","upbeat","upright","upset","urban","usable","used","useful","useless","utilized","utter","vacant","vague","vain","valid","valuable","vapid","variable","vast","velvety","venerated","vengeful","verifiable","vibrant","vicious","victorious","vigilant","vigorous","villainous","violet","violent","virtual","virtuous","visible","vital","vivacious","vivid","voluminous","wan","warlike","warm","warmhearted","warped","wary","wasteful","watchful","waterlogged","watery","wavy","wealthy","weak","weary","webbed","wee","weekly","weepy","weighty","weird","welcome","well-documented","well-groomed","well-informed","well-lit","well-made","well-off","well-to-do","well-worn","wet","which","whimsical","whirlwind","whispered","white","whole","whopping","wicked","wide","wide-eyed","wiggly","wild","willing","wilted","winding","windy","winged","wiry","wise","witty","wobbly","woeful","wonderful","wooden","woozy","wordy","worldly","worn","worried","worrisome","worse","worst","worthless","worthwhile","worthy","wrathful","wretched","writhing","wrong","wry","yawning","yearly","yellow","yellowish","young","youthful","yummy","zany","zealous","zesty","zigzag","rocky"];

var name2 = ["people","history","way","art","world","information","map","family","government","health","system","computer","meat","year","thanks","music","person","reading","method","data","food","understanding","theory","law","bird","literature","problem","software","control","knowledge","power","ability","economics","love","internet","television","science","library","nature","fact","product","idea","temperature","investment","area","society","activity","story","industry","media","thing","oven","community","definition","safety","quality","development","language","management","player","variety","video","week","security","country","exam","movie","organization","equipment","physics","analysis","policy","series","thought","basis","boyfriend","direction","strategy","technology","army","camera","freedom","paper","environment","child","instance","month","truth","marketing","university","writing","article","department","difference","goal","news","audience","fishing","growth","income","marriage","user","combination","failure","meaning","medicine","philosophy","teacher","communication","night","chemistry","disease","disk","energy","nation","road","role","soup","advertising","location","success","addition","apartment","education","math","moment","painting","politics","attention","decision","event","property","shopping","student","wood","competition","distribution","entertainment","office","population","president","unit","category","cigarette","context","introduction","opportunity","performance","driver","flight","length","magazine","newspaper","relationship","teaching","cell","dealer","debate","finding","lake","member","message","phone","scene","appearance","association","concept","customer","death","discussion","housing","inflation","insurance","mood","woman","advice","blood","effort","expression","importance","opinion","payment","reality","responsibility","situation","skill","statement","wealth","application","city","county","depth","estate","foundation","grandmother","heart","perspective","photo","recipe","studio","topic","collection","depression","imagination","passion","percentage","resource","setting","ad","agency","college","connection","criticism","debt","description","memory","patience","secretary","solution","administration","aspect","attitude","director","personality","psychology","recommendation","response","selection","storage","version","alcohol","argument","complaint","contract","emphasis","highway","loss","membership","possession","preparation","steak","union","agreement","cancer","currency","employment","engineering","entry","interaction","limit","mixture","preference","region","republic","seat","tradition","virus","actor","classroom","delivery","device","difficulty","drama","election","engine","football","guidance","hotel","match","owner","priority","protection","suggestion","tension","variation","anxiety","atmosphere","awareness","bread","climate","comparison","confusion","construction","elevator","emotion","employee","employer","guest","height","leadership","mall","manager","operation","recording","respect","sample","transportation","boring","charity","cousin","disaster","editor","efficiency","excitement","extent","feedback","guitar","homework","leader","mom","outcome","permission","presentation","promotion","reflection","refrigerator","resolution","revenue","session","singer","tennis","basket","bonus","cabinet","childhood","church","clothes","coffee","dinner","drawing","hair","hearing","initiative","judgment","lab","measurement","mode","mud","orange","poetry","police","possibility","procedure","queen","ratio","relation","restaurant","satisfaction","sector","signature","significance","song","tooth","town","vehicle","volume","wife","accident","airport","appointment","arrival","assumption","baseball","chapter","committee","conversation","database","enthusiasm","error","explanation","farmer","gate","girl","hall","historian","hospital","injury","instruction","maintenance","manufacturer","meal","perception","pie","poem","presence","proposal","reception","replacement","revolution","river","son","speech","tea","village","warning","winner","worker","writer","assistance","breath","buyer","chest","chocolate","conclusion","contribution","cookie","courage","desk","drawer","establishment","examination","garbage","grocery","honey","impression","improvement","independence","insect","inspection","inspector","king","ladder","menu","penalty","piano","potato","profession","professor","quantity","reaction","requirement","salad","sister","supermarket","tongue","weakness","wedding","affair","ambition","analyst","apple","assignment","assistant","bathroom","bedroom","beer","birthday","celebration","championship","cheek","client","consequence","departure","diamond","dirt","ear","fortune","friendship","funeral","gene","girlfriend","hat","indication","intention","lady","midnight","negotiation","obligation","passenger","pizza","platform","poet","pollution","recognition","reputation","shirt","speaker","stranger","surgery","sympathy","tale","throat","trainer","uncle","youth","time","work","film","water","money","example","while","business","study","game","life","form","air","day","place","number","part","field","fish","back","process","heat","hand","experience","job","book","end","point","type","home","economy","value","body","market","guide","interest","state","radio","course","company","price","size","card","list","mind","trade","line","care","group","risk","word","fat","force","key","light","training","name","school","top","amount","level","order","practice","research","sense","service","piece","web","boss","sport","fun","house","page","term","test","answer","sound","focus","matter","kind","soil","board","oil","picture","access","garden","range","rate","reason","future","site","demand","exercise","image","case","cause","coast","action","age","bad","boat","record","result","section","building","mouse","cash","class","period","plan","store","tax","side","subject","space","rule","stock","weather","chance","figure","man","model","source","beginning","earth","program","chicken","design","feature","head","material","purpose","question","rock","salt","act","birth","car","dog","object","scale","sun","note","profit","rent","speed","style","war","bank","craft","half","inside","outside","standard","bus","exchange","eye","fire","position","pressure","stress","advantage","benefit","box","frame","issue","step","cycle","face","item","metal","paint","review","room","screen","structure","view","account","ball","discipline","medium","share","balance","bit","black","bottom","choice","gift","impact","machine","shape","tool","wind","address","average","career","culture","morning","pot","sign","table","task","condition","contact","credit","egg","hope","ice","network","north","square","attempt","date","effect","link","post","star","voice","capital","challenge","friend","self","shot","brush","couple","exit","front","function","lack","living","plant","plastic","spot","summer","taste","theme","track","wing","brain","button","click","desire","foot","gas","influence","notice","rain","wall","base","damage","distance","feeling","pair","savings","staff","sugar","target","text","animal","author","budget","discount","file","ground","lesson","minute","officer","phase","reference","register","sky","stage","stick","title","trouble","bowl","bridge","campaign","character","club","edge","evidence","fan","letter","lock","maximum","novel","option","pack","park","quarter","skin","sort","weight","baby","background","carry","dish","factor","fruit","glass","joint","master","muscle","red","strength","traffic","trip","vegetable","appeal","chart","gear","ideal","kitchen","land","log","mother","net","party","principle","relative","sale","season","signal","spirit","street","tree","wave","belt","bench","commission","copy","drop","minimum","path","progress","project","sea","south","status","stuff","ticket","tour","angle","blue","breakfast","confidence","daughter","degree","doctor","dot","dream","duty","essay","father","fee","finance","hour","juice","luck","milk","mouth","peace","pipe","stable","storm","substance","team","trick","afternoon","bat","beach","blank","catch","chain","consideration","cream","crew","detail","gold","interview","kid","mark","mission","pain","pleasure","score","screw","sex","shop","shower","suit","tone","window","agent","band","bath","block","bone","calendar","candidate","cap","coat","contest","corner","court","cup","district","door","east","finger","garage","guarantee","hole","hook","implement","layer","lecture","lie","manner","meeting","nose","parking","partner","profile","rice","routine","schedule","swimming","telephone","tip","winter","airline","bag","battle","bed","bill","bother","cake","code","curve","designer","dimension","dress","ease","emergency","evening","extension","farm","fight","gap","grade","holiday","horror","horse","host","husband","loan","mistake","mountain","nail","noise","occasion","package","patient","pause","phrase","proof","race","relief","sand","sentence","shoulder","smoke","stomach","string","tourist","towel","vacation","west","wheel","wine","arm","aside","associate","bet","blow","border","branch","breast","brother","buddy","bunch","chip","coach","cross","document","draft","dust","expert","floor","god","golf","habit","iron","judge","knife","landscape","league","mail","mess","native","opening","parent","pattern","pin","pool","pound","request","salary","shame","shelter","shoe","silver","tackle","tank","trust","assist","bake","bar","bell","bike","blame","boy","brick","chair","closet","clue","collar","comment","conference","devil","diet","fear","fuel","glove","jacket","lunch","monitor","mortgage","nurse","pace","panic","peak","plane","reward","row","sandwich","shock","spite","spray","surprise","till","transition","weekend","welcome","yard","alarm","bend","bicycle","bite","blind","bottle","cable","candle","clerk","cloud","concert","counter","flower","grandfather","harm","knee","lawyer","leather","load","mirror","neck","pension","plate","purple","ruin","ship","skirt","slice","snow","specialist","stroke","switch","trash","tune","zone","anger","award","bid","bitter","boot","bug","camp","candy","carpet","cat","champion","channel","clock","comfort","cow","crack","engineer","entrance","fault","grass","guy","hell","highlight","incident","island","joke","jury","leg","lip","mate","motor","nerve","passage","pen","pride","priest","prize","promise","resident","resort","ring","roof","rope","sail","scheme","script","sock","station","toe","tower","truck","witness","can","will","other","use","make","good","look","help","go","great","being","still","public","read","keep","start","give","human","local","general","specific","long","play","feel","high","put","common","set","change","simple","past","big","possible","particular","major","personal","current","national","cut","natural","physical","show","try","check","second","call","move","pay","let","increase","single","individual","turn","ask","buy","guard","hold","main","offer","potential","professional","international","travel","cook","alternative","special","working","whole","dance","excuse","cold","commercial","low","purchase","deal","primary","worth","fall","necessary","positive","produce","search","present","spend","talk","creative","tell","cost","drive","green","support","glad","remove","return","run","complex","due","effective","middle","regular","reserve","independent","leave","original","reach","rest","serve","watch","beautiful","charge","active","break","negative","safe","stay","visit","visual","affect","cover","report","rise","walk","white","junior","pick","unique","classic","final","lift","mix","private","stop","teach","western","concern","familiar","fly","official","broad","comfortable","gain","rich","save","stand","young","heavy","lead","listen","valuable","worry","handle","leading","meet","release","sell","finish","normal","press","ride","secret","spread","spring","tough","wait","brown","deep","display","flow","hit","objective","shoot","touch","cancel","chemical","cry","dump","extreme","push","conflict","eat","fill","formal","jump","kick","opposite","pass","pitch","remote","total","treat","vast","abuse","beat","burn","deposit","print","raise","sleep","somewhere","advance","consist","dark","double","draw","equal","fix","hire","internal","join","kill","sensitive","tap","win","attack","claim","constant","drag","drink","guess","minor","pull","raw","soft","solid","wear","weird","wonder","annual","count","dead","doubt","feed","forever","impress","repeat","round","sing","slide","strip","wish","combine","command","dig","divide","equivalent","hang","hunt","initial","march","mention","spiritual","survey","tie","adult","brief","crazy","escape","gather","hate","prior","repair","rough","sad","scratch","sick","strike","employ","external","hurt","illegal","laugh","lay","mobile","nasty","ordinary","respond","royal","senior","split","strain","struggle","swim","train","upper","wash","yellow","convert","crash","dependent","fold","funny","grab","hide","miss","permit","quote","recover","resolve","roll","sink","slip","spare","suspect","sweet","swing","twist","upstairs","usual","abroad","brave","calm","concentrate","estimate","grand","male","mine","prompt","quiet","refuse","regret","reveal","rush","shake","shift","shine","steal","suck","surround","bear","brilliant","dare","dear","delay","drunk","female","hurry","inevitable","invite","kiss","neat","pop","punch","quit","reply","representative","resist","rip","rub","silly","smile","spell","stretch","stupid","tear","temporary","tomorrow","wake","wrap","yesterday","Thomas","Tom","Lieuwe"];

var name = this.capFirst(name1[this.getRandomInt(0, name1.length + 1)]) + ' ' + this.capFirst(name2[this.getRandomInt(0, name2.length + 1)]);
return name;

}

  iShotTheMissile() {
    this.canShoot = false;
    this.future(Q.MISSILE_LIFE).iCanShootTheMissile();
  }

  iCanShootTheMissile() {
      this.canShoot = true;
      this.publish(this.id, 'canShoot');
    }

  verify(loc, lastLoc) {
    return verify(loc, lastLoc, this.map);
  }

  get map() { return this.mazeModel.map; }

  relocate() {
    let x = Math.floor((Q.MAZE_ROWS-1)*Math.random());
    let z = Math.floor((Q.MAZE_COLUMNS-1)*Math.random());
 // x=z=1; // makes it easier to test
    // place the player into a random cell
    x = x*Q.CELL_SIZE+Q.CELL_SIZE/2;
    z = z*Q.CELL_SIZE+Q.CELL_SIZE/2;

    this.setTranslation( [x, 0, z] );
  }

  missileHit( byWhom ) {
      //console.log("missileId", this.id, byWhom);
      if(this.id !== byWhom )this.publish( byWhom, "missile-score", this.myName );
      else this.publish("model", "announce", {text: this.myName+" just shot themselves!"})
      this.publish(this.id, 'missile-hit', {
          translation : this.translation.slice(),
      });
      this.relocate();
    }

  //replicated show state message to ensure teatime is working properly
  onShowState() {
      super.onShowState();
      let loc = this.translation;
      let x = loc[0];
      //let y = loc[1];
      let z = loc[2];
      let xCell = Math.floor(x/Q.CELL_SIZE)+1;
      let zCell = Math.floor(z/Q.CELL_SIZE)+1;
      let offsetX = 1+x - xCell*Q.CELL_SIZE;
      let offsetZ = 1+z - zCell*Q.CELL_SIZE;
      let cell = this.map[xCell][zCell];
      console.log("PlayerActor: ", this);
      console.log("cell: ", xCell, zCell);
      console.log("offset: ", offsetX, offsetZ);
      console.log("map cell: ", cell);
      if (!cell.S && offsetZ > Q.AVATAR_CELL)console.log("In South wall!");
      else if (!cell.N && offsetZ < -Q.AVATAR_CELL) console.log("In North wall!");
      if (!cell.E && offsetX > Q.AVATAR_CELL) console.log("In East wall!");
      else if (!cell.W && offsetX < -Q.AVATAR_CELL) console.log("In West wall!");
  }
}

PlayerActor.register("PlayerActor");

//----------------- 3.3 PlayerPawn ---------------------
class PlayerPawn extends mix(Pawn).with(PM_MouselookAvatar) {
  constructor(actor) {
      super(actor);
      this.isAvatar = false; // prove it isn't later
      this.subscribe("local", "avatar-translation", this.showName );
      this.subscribe('missile', 'missile-added', this.hearMissile);
      this.isDestroyed = false; // sometimes install AFTER we destroy...bad

      this.subscribe(this.actor.id, 'missile-hit', (_) => {
        const {translation} = _;

        this.publish('audio', 'create', {
            src : hitSoundSrc, // change source later
            translation : translation,
            autoplay : true,
            gain : 0.4,
            isSpatial : !this.isAvatar,
        });
      });
      this.nameChanged = false;
      // this.future(10000).announceNameChange(); // user will be able to change their name
  }

  // construct the 3D model and place into the scene
  // TODO: Make one model and reuse the geometry and material.
  install(view, scene, camera) {
    //console.log("PlayerPawn.install(",this.actor.id,")");
    if (!this.isDestroyed) {
      this.view = view;
      this.camera= camera;
      this.pawn3D = avatarGenerator.generate(this.isAvatar);
      this.pawn3D.position.set(this.translation[0], this.translation[1], this.translation[2]);
      this.pawn3D.eyeball.quaternion.set(this.rotation[0], this.rotation[1], this.rotation[2], this.rotation[3]);
      this.name3D = new THREE.Group();
      let n3D = fontGenerator.generate(this.actor.myName, 0xcccccc);
      n3D.scale.set(0.04,0.04,0.04);
      this.name3D.add(n3D);
      this.name3D.position.y = 0.25;
      this.pawn3D.add(this.name3D);
      scene.add( this.pawn3D );
    }
    else this.pawn3D = null;
  }

  showName(loc){
    let dx = this.translation[0]-loc[0];
    let dz = this.translation[2]-loc[2];
    let angle = Math.atan2(dx,dz);
    if(this.name3D)this.name3D.rotation.y = angle+Math.PI;
    //console.log(dx, dz, angle);
  }

  setAvatar( ){
    this.isAvatar = true;
    this.unsubscribe("local", "avatar-translation"); // avatar already knows where it is
    this.publish( "model", "announce", {text: this.actor.myName+" has just joined!", time: 6000});
    this.setHUD( this.camera );
    this.subscribe("everyone", "global-announce", this.doAnnounce); // ONLY the Avatar should subscibe to announcements
    this.subscribe(this.actor.id, "missile-score", this.addScore);
    this.score = 0;
    this.subscribe(this.actor.id, 'canShoot', () => {
      this.hud.startShoot(0);
      this.publish('audio', 'create', {
          src : rechargeSoundSrc, // change source later
          translation : this.actor.translation,
          euler : this.actor.euler,
          autoplay : true,
      });
    });

    this.agoraIO = new AgoraIOView(this.model);
    this.subscribe('agora.io', 'toggle', () => {
        if(!this.agoraIO.joined) {
            if(!this.agoraIO.joining)
                this.agoraIO.init({
                    channel : this.sessionId,
                    modelId : this.actor.id,
                });
        }
        else
            this.agoraIO.leave();
    });
    this.subscribe('agora.io', 'onjoin', () => {
        this.publish("model", "announce", {text: this.actor.myName+" just joined voice chat!"});
    });
    this.subscribe('agora.io', 'onleave', () => {
        this.publish("model", "announce", {text: this.actor.myName+" just left voice chat!"});
    });

    this.subscribe(this.actor.id, 'agora.io-onactivespeaker', () => {
        this.publish("model", "announce", {text: this.actor.myName+" is talking"});
    });
   }

   detach() {
       if(this.agoraIO)
        this.agoraIO.detach();

       super.detach();
   }

   announceNameChange(){
     if(this.nameChanged) return;
     this.doAnnounce({ text: this.actor.myName+": Press ENTER to change your name", time: 4000});
     this.future(30000).announceNameChange();
   }

  doAnnounce(ann){this.hud.doAnnounce(ann); }

  addScore( targetName ){
    this.score++;
    this.hud.updateScore(targetName, this.score);
    this.publish( "model", "announce", {text: this.actor.myName + " just shot " + targetName, time:4000} );
    this.publish('audio', 'create', {
        src : pointSoundSrc,
        autoplay : true,
        isSpatial : false,
        volume : 0.5,
    });
  }

  shootMissile(){
    //console.log("BANG!", this.pAvatar.actor.id);
    // this uses the pawn's translation and orientation rather than the actor's
    if (this.actor.canShoot) {
        this.hud.stopShoot(0); // show user we can't shoot
        this.say("IShotTheMissile");
        this.publish('missile', 'missile-shoot', {
            playerID: this.actor.id,
            translation: this.translation,
            rotation: this.pawn3D.eyeball.quaternion.toArray(),
            euler: this.pawn3D.eyeball.rotation.toArray()
        });
      }
      else {
        this.publish('audio', 'create', {
            src : shootFailSoundSrc,
            translation : this.actor.translation,
            euler : this.actor.euler,
            autoplay : true,
            isSpatial : false,
            volume : 0.5,
        });
      }
  }

  setHUD(camera) {
    this.camera = camera;
    this.hud = new PlayerHUD();
    this.hud.install(this, camera);
    this.refresh(); // set my initial sound position
  }

  destroy() {
      // the pawn3D is a clone, so only the mesh need be destroyed.
      // We need to remove it from the scene however
      //console.log("PlayerPawn.destroy() :", this.actor.id);
      if (this.pawn3D && !this.pawn3D.parent)console.log("TROUBLE IN PlayerPawn.destroy()!", this.pawn3D);
      else console.log("NO PROBLEM!!!  PlayerPawn.destroy()", this.pawn3D);
      if (this.pawn3D) this.pawn3D.parent.remove(this.pawn3D);
      this.pawn3D = null;
      this.isDestroyed = true; // make sure we don't add his model to the scene after he is destroyed
      super.destroy();
  }

  // update position
  refresh() {
    if (this.pawn3D) {
      //console.log(this.actor.id, this.translation);
      let loc = this.translation;
      let q = this.rotation;
      this.pawn3D.position.set(loc[0], loc[1], loc[2]);

      if (!this.isAvatar) {
        this.pawn3D.eyeball.quaternion.set(q[0], q[1], q[2], q[3]);
        this.publish(this.actor.id, 'refresh', {
          translation : this.translation,
            euler : this.pawn3D.eyeball.rotation,
        });
      }
      else { // only update position for listening if it is the avatar
        this.publish("local", "avatar-translation", loc);
        this.publish('audio', 'set-listener', {
          translation : this.translation,
          euler : this.pawn3D.eyeball.rotation,
        });
      }
    }
  }

  verify(loc, lastLoc) {
    let myLoc;
    if (this.isAvatar) {
      myLoc =  verify(loc, lastLoc, this.actor.map);

      let aLoc = this.actor.translation;
      if (Math.abs(myLoc[0] - aLoc[0])>Q.WALL_THICKNESS*2.5 ||
      Math.abs(myLoc[2] -aLoc[2])>Q.WALL_THICKNESS*2.5) {
        console.log("============ M & V too far away from each other");
        myLoc[0] = aLoc[0];
        myLoc[2] = aLoc[2];
      }
    } else myLoc = loc;
    return myLoc;
  }

  // I heard a shot!
  hearMissile(missileID) {
    //console.log("PlayerPawn.hearMissile(): ", missileID);
    const missile = GetNamedView("PawnManager").get(missileID).actor;
    let translation = missile.translation;
    let euler = missile.euler;
    let playerID = missile.playerID;
    if (this.isAvatar) {// only the avatar can hear anything.
      if (true && playerID !== this.actor.id) { // don't play if this avatar shot the missile for now (testing)
        // 
        //this.publish('audio', 'create', {
        //      src : photonSoundSrc,
        //     translation,
        //      euler,
        //      autoplay : true,
        //      isSpatial : true,
        //});
        // 
      }
    }
  }
}

PlayerPawn.register('PlayerPawn');


//----------------- 3.4 PlayerHUD ---------------------

class PlayerHUD extends View{

  install(avatar, camera){
    camera.position.set(0,0,0);
    camera.rotation.y = Math.PI;
    this.avatar3D = avatar.pawn3D;
    // console.log("PlayerHUD", this.avatar3D, this.avatar3D.eyeball);
    this.cross = this.reticle();
    this.avatar3D.eyeball.add(this.cross);
    this.avatar3D.eyeball.add(camera);
    //this.subscribe('missile-' = avatar.id, , "timer-start", this)
    this.scores = [];
    this.frontScore = this.getScoreText(0);
    //this.frontScore.rotation.y = Math.PI;
    this.scoreContainer = new THREE.Group();
    this.scoreContainer.position.set(0, 0.065, 0.11);
    this.scoreContainer.rotation.y = Math.PI;
    this.scoreContainer.add(this.frontScore);
    this.avatar3D.eyeball.add( this.scoreContainer );
    this.announceQueue = [];
  }


  doAnnounce(ann){
    if(this.announcing)this.announceQueue.push(ann); // show it later
    else{
        this.announcing = true;
        this.announceTime = ann.time || 4000;
        this.announce = fontGenerator.generate( ann.text.toString() ,0xffff00 );
        this.announce.scale.set(0.005, 0.005, 0.005);
        this.announce.material.transparent = 0;
        this.announce.material.opacity = 0;
        this.announce.position.set(0, -0.075, 0.11);
        this.announce.rotation.y = Math.PI;
        this.avatar3D.eyeball.add( this.announce );
        this.showAnnounce(0);
    }
  }

  showAnnounce(val){
    val = val+0.1;
    if(val>=1){
      val = 1;
      this.future(this.announceQueue.length===0?this.announceTime:this.announceTime/2).hideAnnounce(0);
    } else {
    this.announce.material.opacity = val;
    this.future(20).showAnnounce(val);
    }
  }

  hideAnnounce(val){
    val = val+0.1;
    if(val>=1){ // remove and eliminate the announcement
      this.avatar3D.eyeball.remove(this.announce);
      this.announce.material.dispose();
      this.announce.geometry.dispose();
      this.announcing = false;
      if(this.announceQueue.length>0)this.future(0).doAnnounce(this.announceQueue.pop());
    } else {
      this.announce.material.opacity = 1-val;
      this.future(20).hideAnnounce(val);
    }
  }

  // spin reticle to green cross to show we can shoot
  startShoot(delta){
    if(delta>1)delta = 1;
    this.cross.rotation.z = (1-delta)*Math.PI/4;
    this.elements.forEach( element => {
      element.material.color.r = (1-delta)*255;
      element.material.color.g = delta * 255;
    })
    if(delta<1)this.future(10).startShoot(delta+0.1);
  }

  // spin reticle to red cross to show that we can NOT shoot
  stopShoot(delta){
    if(delta>1)delta = 1;
    this.cross.rotation.z = delta*Math.PI/4;
    this.elements.forEach( element => {
      element.material.color.g = (1-delta)*255;
      element.material.color.r = delta * 255;
    })
    if(delta<1)this.future(10).stopShoot(delta+0.1);
  }

  // spin the score around y-axis to show new score
  updateScore(targetName, score){
    this.backScore = this.getScoreText( score ); // this is currently on the other side
    this.backScore.rotation.y = Math.PI;
    this.scoreContainer.add(this.backScore);
    this.future(500).spinScore(0);
  }

  spinScore(delta){
    delta = delta + 0.1;
    if(delta >= 1){
      this.scoreContainer.rotation.y = Math.PI; // original position
      this.scoreContainer.remove(this.frontScore); // remove these
      this.scoreContainer.remove(this.backScore);
      this.frontScore = this.backScore;
      this.frontScore.rotation.y = 0;
      this.scoreContainer.add(this.frontScore);
    }else{
      this.scoreContainer.rotation.y = Math.PI+delta*Math.PI;
      this.future(50).spinScore(delta);
    }
  }

  getScoreText( score ){
    if( this.scores[score] ) return this.scores[score];
    let score3D = fontGenerator.generate( score.toString() ,0xffff00 );
    score3D.scale.set(0.015, 0.015, 0.015);
    this.scores[score] = score3D;
    return this.scores[score];
  }

  reticle() {
    let group = new THREE.Group();
    group.position.z = 0.11;
    let ht = 0.005;
    let offset = (ht+0.002)/2;

    this.elements = [];

    let geometry = new THREE.PlaneBufferGeometry(ht/10, ht);
    let material = new THREE.MeshBasicMaterial( {color: 0x00FF00, metalness:0.8, transparent: true, opacity: 0.6} );
    let cross = new THREE.Mesh(geometry, material);
    cross.rotation.y = Math.PI;
    cross.position.y = -offset;
    group.add(cross);
    this.elements.push(cross);

    cross = cross.clone();
    cross.position.y = offset;
    group.add(cross);
    this.elements.push(cross);

    geometry = new THREE.PlaneBufferGeometry(ht, ht/10);
    cross = new THREE.Mesh(geometry, material);
    cross.rotation.y = Math.PI;
    cross.position.x = -offset;
    group.add(cross);

    this.elements.push(cross);
    cross = cross.clone();
    cross.position.x = offset;
    group.add(cross);
    this.elements.push(cross);
    return group;
  }

  setReticle( tdata ){

  }
}

//------------------ 4. Missiles ------------------------
// Missile Actor & Pawn.
// It uses the Avatar mixins.
//
// -------- Steps to create and hear the missile ---------
// MazeView.mouse0Down() event publishes "missile-shoot"
// MazeModel subscribes to "missile-shoot" with MazeModel.fireMissile();
// MazeModel.fireMissile() constructs MissileActor and publishes "missile-added"
// MissilePawn is automatically constructed.
// PlayerPawn subscribes to "missile-added" with PlayerPawn.hearMissile() and plays missile sound
// MazeView also subscribes to "missile-added" with MazeView.attachMissile();
// Missile is destroyed either when it collides with another object (including another missile) or
// when it times out. It destroys itself by calling the MissileActor.missileHit function that
// in turn sends this.future(0).publish("missile", "missile-destroy", this.id).
// The avatars also have a missileHit function that relocates the player on the maze (for now).


//------------------ 4.1 MissileActor -----------------------

class MissileActor extends mix(Actor).with(AM_Avatar) {
  init( mazeModel ) {
    //console.log("MissileActor.init() ", this.id, mazeModel );
    super.init('MissilePawn');
    this.mazeModel = mazeModel;
    this.future(Q.MISSILE_LIFE).missileHit();
    this.selfLethal = false;
    this.subscribe( this.id, 'bounce', () => this.selfLethal = true );  // missile is lethal to shooter only after it bounces
  }

  get map() { return this.mazeModel.map; }

  setPose( pose ) {
    //console.log("MissileActor.setPose(): ", pose)
    this.playerID = pose.playerID;
    this.initialLoc = this.translation = pose.translation;
    this.euler = pose.euler;
    this.rotation = pose.rotation;
  }

  verify(loc, _lastLoc) {
    let map = this.map;
    let x = loc[0];
    let y = loc[1];
    let z = loc[2];
    let xCell = Math.floor(x/Q.CELL_SIZE)+1;
    let zCell = Math.floor(z/Q.CELL_SIZE)+1;
    let yCell = Q.AVATAR_RADIUS-Q.WALL_HEIGHT/2;

    if ( y < yCell ) y = yCell;
    //else if (y>Q.WALL_HEIGHT/2)y=Q.WALL_HEIGHT/2;

    if(y<=Q.WALL_HEIGHT/2){ // stop bouncing
      if ( xCell>=0 && xCell < Q.MAZE_COLUMNS && zCell>=0 && zCell < Q.MAZE_ROWS ) { //off the map
        let cell = map[xCell][zCell];

        // where are we within the cell?
        let offsetX = 1+x - xCell*Q.CELL_SIZE;
        let offsetZ = 1+z - zCell*Q.CELL_SIZE;

        if (!cell.S && offsetZ > Q.AVATAR_CELL) {
          z -= Q.WALL_EPSILON + offsetZ - Q.AVATAR_CELL;
          this.velocity[2]=-this.velocity[2];
          this.publish(this.id, 'bounce');
        }
        else if (!cell.N && offsetZ < -Q.AVATAR_CELL) {
          z -= offsetZ  + Q.AVATAR_CELL - Q.WALL_EPSILON;
          this.velocity[2] = -this.velocity[2];
          this.publish(this.id, 'bounce');
        }
        if (!cell.E && offsetX > Q.AVATAR_CELL) {
          x -= Q.WALL_EPSILON + offsetX - Q.AVATAR_CELL;
          this.velocity[0] = -this.velocity[0];
          this.publish(this.id, 'bounce');
        }
        else if (!cell.W && offsetX < -Q.AVATAR_CELL) {
          x -= offsetX + Q.AVATAR_CELL - Q.WALL_EPSILON;
          this.velocity[0] = -this.velocity[0];
          this.publish(this.id, 'bounce');
        }
        // test for collisions
        let actors = this.wellKnownModel('ActorManager').actors;
        actors.forEach(actor => this.testCollision(actor));

      } // else { this.missileHit(); }// if we find ourselves off the map, then destroy ourselves
    }
    return [x, y, z];
  }

  testCollision(actor) {
    if (actor.id === this.id) return; // missile can't kill itself
    if (actor.id === this.playerID && !this.selfLethal) return; // missile has not bounced, so can't kill shooting player
    let aLoc = actor.translation;
    let mLoc = this.translation;
    let d = [aLoc[0]-mLoc[0], aLoc[1]-mLoc[1], aLoc[2]-mLoc[2]];
    if (Q.AVATAR_DIST_SQUARED > v3_sqrMag(d)) {
        actor.missileHit( this.playerID );
        this.missileHit( );
        this.hit = true;
    }
  }

  missileHit() {this.destroy();} //this.future(0).publish("missile", "missile-destroy", this.id); }
}
MissileActor.register("MissileActor");

//------------------ 4.2 MissilePawn -----------------------
class MissilePawn extends mix(Pawn).with(PM_Avatar) {

  install( scene ) {
    this.missile = missileGenerator.generate();
    let pointLight = new THREE.PointLight(0xff8844, 1, 4, 2);
    this.missile.add( pointLight );
    this.missile.pointLight = pointLight;

    let loc = this.actor.translation;
    let rot = this.actor.euler;
    this.missile.position.set(loc[0], loc[1], loc[2]);
    this.missile.rotation.set(rot[0], rot[1], rot[2]);
    scene.add(this.missile);
    this.start = Date.now();
    gVec = this.missile.getWorldDirection(gVec).multiplyScalar(0.005);
    this.moveTo(loc);
    this.setVelocity([gVec.x, gVec.y, gVec.z]);

    this.publish('audio', 'create', {
        src : launchSoundSrc,
        translation : this.actor.translation,
        euler : this.actor.euler,
        autoplay : true,
        isSpatial : true,
        gain : 0.3,
    });

    this.publish('audio', 'create', {
        src : photonSoundSrc,
        translation : this.actor.translation,
        euler : this.actor.euler,
        autoplay : true,
        isSpatial : true,
        gain : 0.3,
        callback : index => {
            this.audioIndex = index;
        }
    });

    this.subscribe(this.actor.id, 'bounce', () => {

        this.publish('audio', 'create', {
            src : bounceSoundSrc,
            translation : this.actor.translation,
            euler : this.actor.euler,
            autoplay : true,
            isSpatial : true,
        });
    });
  }

  refresh() {
    if (this.missile) {
      let loc = this.actor.translation;
      this.missile.position.set(loc[0], loc[1], loc[2]);

      if(this.audioIndex !== undefined) {
        this.publish('audio', 'update', {
            index : this.audioIndex,
            translation : this.actor.translation,
            euler : this.actor.rotation,
        });
      }
    }
  }

  update(time) {
    super.update(time);
    if (this.missile) {
      let tt = Date.now() - this.start;
      this.missile.material.uniforms[ 'time' ].value = .00025 * tt;
      this.missile.pointLight.intensity = 0.25+ 0.75* Math.sin(tt*0.020)*Math.cos(tt*0.007);
    }
  }

  destroy() {
    super.destroy();
    //console.log("MissilePawn.destroy() doomed:", this.actor.doomed, this.missile);
    if (this.missile) this.missile.parent.remove(this.missile);
    this.missile = null;
    this.publish('audio', 'create', {
        src : this.actor.hit? explosionSoundSrc:implosionSoundSrc,
        translation : this.actor.translation,
        euler : this.actor.euler,
        autoplay : true,
        isSpatial : true,
    });

    this.publish('audio', 'stop', {
        index : this.audioIndex,
    });
  }

}

MissilePawn.register('MissilePawn');

//----------------- 5. WidgetDock and Session.join ---------------------

async function go() {
  App.messages = true;
  App.makeWidgetDock({badge: true, qrcode: true});
  missileGenerator = new Missile3DGenerator();
  avatarGenerator = new Avatar3DGenerator();
  fontGenerator = new Font3DGenerator();
  const url = new URL(window.location.href);
  const sessionName = url.searchParams.get("session");

  StartWorldcore({
    ...apiKey,
    appId: 'io.croquet.mazewars', // <-- feel free to change
    //name: sessionName,
    password: "none",
    location: true,
    model: MazeModel,
    view: MazeView,
  });
}
go();
/**/
