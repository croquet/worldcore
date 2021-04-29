// Whiteboard Application
// Multi-page white board drawing tool
// Croquet Corporation, 2020

import {Constants, App, Session, Messenger} from "@croquet/croquet";
import { InputManager, UIManager, ModelRoot, ViewRoot, Widget, ToggleWidget, GetNamedView, BoxWidget, ImageWidget, ToggleSet, ButtonWidget, } from "@croquet/worldcore";

import smallBrush from "./assets/pen-small.svg";
import mediumBrush from "./assets/pen-med.svg";
import largeBrush from "./assets/pen-lrg.svg";
import redoIcon from "./assets/redo@3x.svg";
import undoIcon from "./assets/undo@3x.svg";
//import arrowLeftIcon from "./assets/backward@3x.svg";
//import arrowRightIcon from "./assets/forward@3x.svg";
import expandIcon from "./assets/frame.svg";
import homeIcon from "./assets/home@3x.svg";
import cloneIcon from "./assets/copy@3x.svg";
import colorBrushHideIcon from "./assets/tool-grid@3x.svg";

//let compressIcon =  expandIcon;
let colorBrushShowIcon = colorBrushHideIcon;

//import doubleArrowLeftIcon from "./assets/double-arrow-left.png";
//import doubleArrowRightIcon from "./assets/double-arrow-right.png";

/* To Do:
  - Copy is not working on mobile. It may not be possible at present. Try this next:
       https://web.dev/image-support-for-async-clipboard/
  - undo mine/undo all
  - Hide buttons that are non-functional when in mobile.
  - Previous and next pages need to slide into place.
  - Full screen does not work properly on mobile (it does sometimes :-( ))
  - Multi-cursor visual support
  - Page #/pages
  - Buttons leave a slight border after they have been used.
  - Garbage collect incomplete inProcess lines
*/

//------------------ Pseudo Globals-----------------------
// The Constants variable is part of the Croquet model, so
// any object you add to it will automatically become part
// of the snapshot. This both minimizes side effects and
// ensures that any change to these variables forces the
// creation of a new session.

const Q = Constants;

Q.VERSION = 0.22;
Q.THROTTLE_MOUSE = 1000 / 20;     // mouse event throttling
Q.SMALL_BRUSH_SIZE = 1;
Q.MEDIUM_BRUSH_SIZE = 4;
Q.LARGE_BRUSH_SIZE = 16;

// when the hash changes, force a full reload
window.addEventListener('hashchange', function() {
    window.location.reload();
  }, false);

class DrawModel extends ModelRoot {

    init(options, persistentData) { // Note that models are initialized with "init" instead of "constructor"!
        super.init();
        this.pages = []; // holds all of the pages
        this.transferLines = [];
        this.newPage();
        this.listen("start-line", this.startLine);
        this.listen("kill-line", this.killLine);
        this.listen("add-my-line", this.addLines);
        this.listen("undo-line", this.undo);
        this.listen("redo-line", this.redo);
        this.listen("end-of-line", this.savePersistentData);
        //this.listen("previous-page", this.previousPage);
        //this.listen("next-page", this.nextPage);
        this.subscribe(this.sessionId, "view-exit", this.viewExit);

        if (persistentData) {
            this.loadPersistentData(persistentData);
        }
    }

    viewExit(viewId) {
        this.pages.forEach((page) => {
            delete page.inProcessLines[viewId];
        });
    }

    startLine( lineInfo , start){
        window.model = this;
        let line = start === undefined?[]:[start];
        this.page.inProcessLines[lineInfo.viewId]={lineInfo, completed: false, base:0, lines: line};
    }

    killAllLines(){ // someone changed the page - destroy all of the current incomplete lines
        this.transferLines = []; // in process lines need to be transferred to the new page
        Object.values(this.page.inProcessLines).forEach( line=>{
            if(line.completed === false){
                let lastPoint = this.killLine(line.lineInfo.viewId); // terminate the line here and move it to the next
                if(lastPoint) {
                    this.transferLines.push([line.lineInfo, lastPoint]);
                }
            }
        });
    }

    killLine( viewId ){ // doubleTouch events require the startLine to be stopped or canceled.
        if(this.page.inProcessLines[viewId].lines.length>0){
            let lines = this.page.inProcessLines[viewId];
            lines.completed = true;
            this.page.completeLines.push(lines);
            return lines.lines[lines.lines.length - 1]; // return the last drawn point
        }
        delete this.page.inProcessLines[viewId];
        return null;
    }

    addLines(lineData){
        let viewId = lineData.viewId;
        let pLines = this.page.inProcessLines[viewId];
        let from, to;
        if(pLines){ // should always exist, but might not
            from = pLines.base = Math.max(0,pLines.lines.length-1);
            pLines.lines = pLines.lines.concat(lineData.line);
            to = pLines.lines.length;
            if(lineData.done) { // line is complete
                pLines.completed = true;
                this.page.completeLines.push(pLines);
            }
            this.say("add-your-line", [viewId, from, to]);
        }
    }

    undo(){
        //console.log("undo", this.page.completeLines);
        if(this.page.completeLines.length){
            this.page.undoLines.push(this.page.completeLines.pop());
            this.say("redraw-all");
            this.savePersistentData();
        }
    }

    redo(){
        //console.log("redo", this.page.completeLines);
        if(this.page.undoLines.length){
            this.page.completeLines.push(this.page.undoLines.pop());
            this.say("redraw-all");
            this.savePersistentData();
        }
    }

    previousPage(){
        //console.log("previousPage");
        if(this.currentPage>0){
            this.killAllLines(); // terminate all in-process lines
            this.currentPage--;
            this.say("page-change", this.currentPage);
            this.page = this.pages[this.currentPage];
            this.transferLines.forEach(line=>this.startLine(line[0], line[1])); //restart in-process lines on new page
            this.say("redraw-all");
            this.savePersistentData();
        }
    }

    nextPage(loading){
        //console.log("nextPage");
        if(this.currentPage<this.pages.length-1){
            this.killAllLines(); // terminate all in-process lines
            this.currentPage++;
            this.say("page-change", this.currentPage);
            this.page = this.pages[this.currentPage];
            this.transferLines.forEach(line=>this.startLine(line[0], line[1])); //restart in-process lines on new page
        } else this.newPage();
        this.say("redraw-all");
        if (!loading) this.savePersistentData();
    }

    newPage(optLines){
        if (optLines) {
            let page = {inProcessLines: {}, completeLines: optLines, undoLines: []};
            this.page = page;
            this.pages = [page];
            this.currentPage = 0;
            this.transferLines = [];
            this.say("page-change", this.currentPage);
            this.say("redraw-all");
            return;
        }
        if(this.page === undefined || this.page.completeLines.length>0){
            if(this.page !== undefined)this.killAllLines(); // terminate all in-process lines
            this.page = {inProcessLines: {}, completeLines: [], undoLines: []};
            this.pages.push(this.page);
            this.currentPage = this.pages.length-1;
            this.transferLines.forEach(line=>this.startLine(line[0], line[1])); //restart in-process lines on new page
            this.say("page-change", this.currentPage);
        }
    }

    savePersistentData() {
        // saving persistent data is a heavy operation - involving
        // gathering all necessary data, stringifying and hashing
        // it, polling all clients to decide who's going to upload,
        // then compressing, encrypting and uploading the data,
        // then informing the reflector of the upload URL.
        // here we throttle to requesting a new persistence capture
        // 60s after the first triggering operation (on the guess
        // that in this app, one operation is likely to signal the
        // start of a batch).
        // after a successful capture, the next trigger will schedule
        // the next delayed capture.
        const DELAY = 60000;
        const now = this.now();
        const last = this.lastPersist || -1;
        const next = this.nextPersist || -1;

        // if a future time is already recorded (and is still in
        // the future), nothing needs to be done.
        if (next > now) return;

        // in theory a new trigger can arrive at exactly the same
        // teatime as a future() message, but after that message has
        // already been processed.  in that case, drop through so
        // the app's state will be captured again (after a further
        // delay).
        if (next === now && last !== now) {
            this.lastPersist = now;
            this.throttledSavePersistentData();
            return;
        }

        // schedule delayed capture
        const timeToNext = DELAY;
        this.nextPersist = now + timeToNext;
        this.future(timeToNext).savePersistentData();
    }

    throttledSavePersistentData() {
        let func = () => {
            let page = this.pages[0];
            let completeLines = page.completeLines;
            return {lines: completeLines, version: "whiteboard-nopages"};
        };
        this.persistSession(func);
    }

    loadPersistentData(data){
        if (data.version && data.version === "whiteboard-nopages") {
            this.loadPersitentDataForPage(data);
            return;
        }
        let {pages, currentPage} = data;
        this.pages = pages;
        this.currentPage = currentPage - 1;
        this.nextPage(true);
    }

    loadPersitentDataForPage(data) {
        let lines = data.lines;
        this.newPage(lines);
    }

    say(event, data) {
        this.publish(this.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.id, event, callback);
    }

}

// Register our model class with the serializer
DrawModel.register("DrawModel");

//------------------------------------------------------------------------------------------
// Define our view. MyView listens for click events on the window. If it receives one, it
// broadcasts a reset event. It also listens for update events from the model. If it receives
// one, it updates the counter on the screen with the current count.
//------------------------------------------------------------------------------------------

class DrawView extends ViewRoot {

    constructor(model) { // The view gets a reference to the model when the session starts.
        super(model);
        this.model = model;

        if (window.parent !== window) {
            // assume that we're embedded in Greenlight
            Messenger.setReceiver(this);
            Messenger.send("appReady");
            Messenger.on("appInfoRequest", () => {
                // feb 2021: as a quick fix for wanting whiteboard
                // always to appear in a transparent miniBrowser,
                // GL pays attention to a "transparent" flag in the
                // appInfo.  each user's whiteboard will cause a
                // beTransparent event to be sent on initialisation,
                // but the duplication is harmless.
                Messenger.send("appInfo", { appName: "whiteboard", label: "whiteboard", iconName: "whiteboard.svgIcon", urlTemplate: "../whiteboard/?q=${q}", transparent: true });
            });
            Messenger.startPublishingPointerMove();
        }

        this.webInput = this.addManager(new InputManager(model));

        this.ui = this.addManager(new UIManager(model));
        let hud = new HUD();
        this.ui.root.addChild(hud);

        this.setupWebInputManager();
        this.canvas0 = document.getElementById('c0');
        this.canvas1 = document.getElementById('c1');
        this.ctx = [];
        this.ctx[0] = this.canvas0.getContext('2d');
        this.ctx[1] = this.canvas1.getContext('2d');
        this.canvas0.style.position = this.canvas1.style.position = 'absolute';
        this.canvas0.style.left = this.canvas1.style.left = 0 + 'px';
        this.canvas0.style.top = this.canvas1.style.top = 0 + 'px';

        this.ctx[0].lineJoin = this.ctx[0].lineCap = this.ctx[1].lineJoin = this.ctx[1].lineCap = 'round';

        this.onWindowResize();
        this.isDrawing = false;
        this.lineInfo = {viewId: this.viewId, lineIndex:0, lineWidth: 0, shadowBlur: 0, color: '#000000', layer:0};
        this.setBrushSize(4);
        this.line = [];
        this.subscribe("hud", "edit-color", this.setColor);
        this.subscribe("hud", "brush-size", this.setBrushSize);
        this.subscribe("hud", "undo-line", this.undo);
        this.subscribe("hud", "redo-line", this.redo);
        this.subscribe("hud", "previous-page", ()=>this.say("previous-page"));
        this.subscribe("hud", "next-page", ()=>this.say("next-page"));
        this.subscribe("hud", "open-full-screen", this.openFullscreen);
        this.subscribe("hud", "close-full-screen", this.closeFullscreen);
        this.subscribe("hud", "copy-image", this.copyToClipboard);
        this.subscribe("hud", "go-home", ()=>this.resetPose());
        this.listen("add-your-line", this.hearLine);
        this.listen("redraw-all", this.redrawAll);
        this.listen("page-change", this.doPageChange);
        this.redrawAll();

        // switch to using resetPose to ensure offset is correct
        // this.scale = 1;
        // this.offset = [0,0];
        this.resetPose();

        this.lastTime = 0;
        this.lastScale = 1;
        this.startScale = 1;
        this.currentPage = this.model.currentPage;
        this.lastxy = [0,0];
        this.countHit = 0;
        this.countMiss = 0;
        // this.future(1000).showHits();  // test framerate of updates
    }

    /* Get the documentElement (<html>) to display the page in fullscreen */

    showHits(){
        if(this.countHit+this.countMiss>0){
            console.log("-------------------");
            console.log("total: ", this.countHit+this.countMiss);
            console.log("hit: ", this.countHit);
            console.log("miss: ", this.countMiss);
            this.countHit = 0; this.countMiss = 0;
        }
        this.future(1000).showHits();
    }

    /* View in fullscreen */
    openFullscreen() {
        var elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
        }
    }

    /* Close fullscreen */
    closeFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    }

    say(event, data) {
        this.publish(this.model.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.model.id, event, callback);
    }

    undo(){this.say("undo-line");}

    redo(){this.say("redo-line");}

    setupWebInputManager() {
        this.subscribe("ui", "resize", this.onWindowResize);
        this.subscribe("ui", "pointerDown", this.onMouse0Down); // input
        this.subscribe("ui", "pointerUp", this.onMouse0Up); // input
        // this.subscribe("input", "mouse2Down", this.onMouse2Down); // input
        // this.subscribe("input", "mouse2Up", this.onMouse2Up); // input
        this.subscribe("ui", "pointerMove", this.onMouseXY);
        this.subscribe("ui", "wheel", this.onMouseWheel);
      //  this.subscribe(document,'touchcancel', this.onTouchCancel);
        this.subscribe("input", "keyDown", this.onKeyDown);
        this.subscribe("input", "keyUp", this.onKeyUp);
        //this.subscribe("input", "keyUp", this.onKeyUp);
    }

    onWindowResize() {
       // this is unused at the moment.
    }

    doPageChange(newPage){
        // console.log("page-change", this.currentPage, newPage);
        this.currentPage = newPage;
    }

    resetPose(){
        this.scale = 1;
        this.offset  =  [8,8];
        let width = this.canvas0.width;
        let height = this.canvas0.height;
        this.canvas0.style.width = this.canvas1.style.width = width + 'px';
        this.canvas0.style.height = this.canvas1.style.height = height + 'px';
        this.canvas0.style.position = this.canvas1.style.position = 'absolute';
        this.canvas0.style.left = this.canvas1.style.left = 8 + 'px';
        this.canvas0.style.top = this.canvas1.style.top = 8 + 'px';
    }

    setColor(hex){
        this.lineInfo.color = hex;
    }

    setBrushSize(sz){
        // console.log("setBrushSize", sz)
        this.lineInfo.lineWidth = 0.60*sz;
        this.lineInfo.shadowBlur = 0.605*sz;
    }

    redrawAll() {
       //console.log("I am redrawing")

        this.ctx[0].fillStyle = 'rgba(0,0,0,0)'; //"#000000"; //white
        this.ctx[0].clearRect(0, 0, this.canvas0.width, this.canvas0.height);
        this.ctx[1].fillStyle = 'rgba(0,0,0,0)'; //"#000000"; //white
        this.ctx[1].clearRect(0, 0, this.canvas1.width, this.canvas1.height);

        let lines;

        lines = this.model.page.completeLines;
        lines.forEach(line=>{
            if(line.lines.length>0){ // should always be true...
                this.setupLine(line.lineInfo);
                this.ctx[this.layer].beginPath();
                this.ctx[this.layer].moveTo(line.lines[0][0], line.lines[0][1]);
                for(let i = 0; i<line.lines.length; i++){
                    this.ctx[this.layer].lineTo(line.lines[i][0], line.lines[i][1]);
                }
                this.ctx[this.layer].stroke();
            }
        });

        lines = this.model.page.inProcessLines;
        Object.values(lines).forEach(line=>{
            if(!line.completed && line.lines.length>0){
                this.setupLine(line.lineInfo);
                this.ctx[this.layer].beginPath();
                this.ctx[this.layer].moveTo(line.lines[0][0], line.lines[0][1]);
                for(let i = 0; i<line.lines.length; i++){
                    this.ctx[this.layer].lineTo(line.lines[i][0], line.lines[i][1]);
                }
                this.ctx[this.layer].stroke();
            }
        });
    }

    onKeyDown(event){
        if(event.key === "Shift")this.shift = true;
        if(event.key === "Control")this.control = true;
        // console.log("onKeyDown", this.shift, this.control, event)
        if(this.control){
            switch(event.key){
                case 'z': this.undo(); break;
                case 'y': this.redo(); break;
                case ']': this.say("next-page"); break;
                case '[': this.say("previous-page"); break;
                case 'c': this.copyToClipboard(); break;
            }
        }
    }

    onKeyUp(event){
        if(event.key === "Control")this.control = false;
        if(event.key === "Shift")this.shift = false;
        // console.log("keyUp", this.shift, this.control, event)
    }

    // copy image out of canvas.
    // no way to paste back in of course unless I canibalize PIX
    selectText(element) {
        let doc = document;
        if (doc.body.createTextRange) {
            let range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if (window.getSelection) {
            let selection = window.getSelection();
            let range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    //this should probably just copy the part of the image that is actually being used.
    copyToClipboard(){
        var img = document.createElement('img');
        img.src = this.canvas0.toDataURL();

        var div = document.createElement('div');
        div.contentEditable = true;
        div.appendChild(img);
        document.body.appendChild(div);

        // do copy
        this.selectText(div);
        document.execCommand('Copy');
        document.body.removeChild(div);
    }

    toLocal(evt){
        let xy = evt.xy;
        let r = this.canvas0.getBoundingClientRect();
        let is = 1/this.scale;
        return[is*(xy[0]-r.x), is*(xy[1]-r.y)];
    }

    onMouse0Down(evt){
        // console.log("mouse0Down", xy);
        let xy = this.toLocal(evt);
        this.isDrawing = true;
        this.lastxy = xy;
        this.startScale = this.scale;
        this.addToLine(xy);
        this.layer = this.lineInfo.layer = this.shift?1:0;
        this.say("start-line", this.lineInfo);
    }

    onMouse0Up(evt){
        let xy = evt.xy;
        // console.log("mouse0up", xy);
        if(this.isDrawing){
            xy[0]++;             // iOS does not draw a single point is moveTo and lineTo are the same, so need to force them to be different.
            xy = this.toLocal(evt);
            this.isDrawing = false;
            this.addToLine(xy);
            this.sayLine(true);
        }
    }

    onMouseXY(evt){
        let xy = evt.xy;
        // console.log("mouseXY", xy);
        if(this.isDrawing){
           // console.log("isDrawing")
            xy = this.toLocal(evt);
            this.addToLine(xy); // draw immediately
            let t = (new Date()).getTime();
            if (t-this.lastTime>Q.THROTTLE_MOUSE) {
                this.lastTime = t;
                this.sayLine(false);
                this.countHit++;
            } else this.countMiss++;
        }
        this.lastxy = xy;
     }

    onMouseWheel(_delta){
        /* @@ feb 2021: disable zoom
        this.lastxy =  this.toLocal(this.wheelxy);
        this.setPose(this.scale-(delta * 0.0002));
        */
    }

    // turned off the shadowblur
    setupLine(lineInfo){ // prep for drawing this line
        //console.log("setupLine", lineInfo)
        this.layer = lineInfo.layer;
        this.ctx[this.layer].lineWidth = lineInfo.lineWidth;
        //this.ctx[this.layer].shadowBlur = lineInfo.shadowBlur;
        this.ctx[this.layer].strokeStyle = lineInfo.color;
        //this.ctx[this.layer].shadowColor = lineInfo.color;
    }

    addToLine(xy){
        this.line.push(xy);
        if(this.lastXY){
            this.setupLine(this.lineInfo);
            this.ctx[this.layer].beginPath();
            this.ctx[this.layer].moveTo(this.lastXY[0], this.lastXY[1]);
            //this.quadraticLine(this.ctx, this.lastXY,xy);
            this.ctx[this.layer].lineTo(xy[0], xy[1]);
            this.ctx[this.layer].stroke();
        }
        this.lastXY = xy;
    }

    quadraticLine(ctx, p0, p1 ){ // nope - don't do this
/*
         ctx.moveTo((points[0].x), points[0].y);

        for(var i = 0; i < points.length-1; i ++)
        {
          var x_mid = (points[i].x + points[i+1].x) / 2;
          var y_mid = (points[i].y + points[i+1].y) / 2;
          var cp_x1 = (x_mid + points[i].x) / 2;
          var cp_x2 = (x_mid + points[i+1].x) / 2;
          ctx.quadraticCurveTo(cp_x1, points[i].y ,x_mid, y_mid);
          ctx.quadraticCurveTo(cp_x2, points[i+1].y ,points[i+1].x,points[i+1].y);
        }
*/
        var x_mid = (p0[0]+p1[0])/2;
        var y_mid = (p0[1]+p1[1])/2;
        var cp_x1 = (x_mid+p0[0])/2;
        var cp_x2 = (x_mid+p1[0])/2;
        ctx.quadraticCurveTo(cp_x1, p0[1] ,x_mid, y_mid);
        ctx.quadraticCurveTo(cp_x2, p1[1] ,p1[0],p1[1]);
    }

    hearLine(range){
        let viewId = range[0];
        let from = range[1];
        let to = range[2];
        if(viewId!==this.viewId){
            let pLines = this.model.page.inProcessLines[viewId];
            //this value may be gone by this time
            if(pLines){
                //console.log(pLines);

                let lineInfo = pLines.lineInfo;
                this.setupLine( lineInfo );
                this.ctx[this.layer].beginPath();
                //console.log(pLines.base, pLines.lines.length);
                let lines = pLines.lines;
                // and this may not be here
                let fromP = lines[from];
                if (!fromP) {
                    // console.log("pLine has been changed");
                    // console.log(lines, from, viewId);
                    return;
                }
                this.ctx[this.layer].moveTo(fromP[0], fromP[1]);
                for(let i = from+1; i<to; i++){
                    let toP = lines[i];
                    if (!toP) {
                        console.log("value exceededs the range");
                        return;
                    }
                    //console.log(pLines.base, pLines.lines.length, i)
                    this.ctx[this.layer].lineTo(toP[0], toP[1]);
                }
                this.ctx[this.layer].stroke();
            }
        }
    }

    sayLine(bool){
        // share the line with everyone
        // goes here
        this.say("add-my-line", {viewId: this.viewId, line:this.line, done:bool});
        if(bool){ // end of the line...
            this.lastXY = null;
            this.say("end-of-line");
        }
        this.line = []; //reset for the next line
        //console.log("sayLine")
    }
}

let tx =10, ty = 85;
export const Colors = [
    [[tx,ty], "#1A1A1A"],              // Black
    [[tx+35,ty], "#808080"],           // Med Gray
    [[tx+70,ty], "#D0D0D0"],           // Light Gray

    [[tx,ty+35], "#F04A3E"],           // Red
    [[tx+35,ty+35], "#F09132"],        // Orange
    [[tx+70,ty+35], "#FFDA29"],        // Yellow

    [[tx,ty+70], "#71D2F0"],           // Sky Blue
    [[tx+35,ty+70], "#2BA341"],        // Grass Green
    [[tx+70,ty+70], "#CCF078"],        // Spring Green

    [[tx,ty+105], "#406BE3"],          // Deep Blue
    [[tx+35,ty+105], "#B835CC"],       // Violet
    [[tx+70,ty+105], "#FFFFFF"],       // White

];

export class HUD extends Widget {
    constructor() {
        super();
        this.set({autoSize:[1,1]});
        this.toolScreen = new Widget(this, {autoSize:[1,1], zIndex:1});
        //this.toolScreen.autoSize = [1,1];
        this.buildToolScreen();
        this.addChild(this.toolScreen);
        this.colorBrushHUD = new ColorBrushHUD();
        this.addChild(this.colorBrushHUD.toolScreen);
        //console.log(this.toolScreen)
    }

    destroy() {
        super.destroy();
        this.toolScreen.destroy();
    }

    makeButton(icon, options, action){
        let button = new ButtonWidget(this.toolScreen,options);
        button.setLabel(new ImageWidget(this.button, {size:options.size, border:[2,2,2,2], color:[1,1,1]}));
        button.label.loadFromURL(icon);
        button.onClick = action;
        button.normal.set({color:[0.9, 0.9, 0.9]});
        button.hilite.set({color:[0.8, 0.8, 0.8]});
        button.pressed.set({color:[0.5, 0.5, 0.5]});
        return button;
    }

    makeToggle(icon1, icon2, options, action1, action2){
        this.toggle = new ToggleWidget(this.toolScreen, options);
        this.toggle.setLabelOn(new ImageWidget(this.toggle, {size:options.size, color:[1,1,1]}));
        this.toggle.labelOn.loadFromURL(icon1);
        this.toggle.setLabelOff(new ImageWidget(this.toggle,{size:options.size, color:[1,1,1]}));
        this.toggle.labelOff.loadFromURL(icon2);
        this.toggle.onToggleOn = action1;
        this.toggle.onToggleOff = action2;
        return this.toggle;
    }

    buildToolScreen() {

        this.viewRoot = GetNamedView('ViewRoot');

        /*
        let fullscreenButton = this.makeToggle(compressIcon, expandIcon, {local: [-20, 10], size: [35,35], anchor:[1,0], pivot:[1,0]},
            () => this.publish("hud", "open-full-screen"),
            () => this.publish("hud", "close-full-screen"));
        */

        //let pp = this.makeButton(arrowLeftIcon, {local:[-20, 10], size:[35,35], anchor:[0.5,0], pivot:[1,0]}, () => this.publish("hud", "previous-page"));
        //let np = this.makeButton(arrowRightIcon, {local:[20, 10], size:[35,35], anchor:[0.5,0]}, () => this.publish("hud", "next-page"));

        this.makeButton(undoIcon, {local:[tx, 10], size:[30,30]}, () => this.publish("hud", "undo-line"));
        this.makeButton(redoIcon, {local:[tx+70,10], size:[30,30]}, () => this.publish("hud", "redo-line"));
        this.makeButton(homeIcon, {local:[tx+35, 10], size:[30,30]}, () => this.publish("hud", "go-home"));
        this.makeButton(cloneIcon, {local:[tx+70, 45], size:[30,30]}, () => this.viewRoot.copyToClipboard()); //this.publish("hud", "copy-image"));
        this.makeToggle(colorBrushShowIcon, colorBrushHideIcon, {local:[tx,45], size:[30,30]}, ()=>this.colorBrushHUD.toolScreen.hide(), ()=>this.colorBrushHUD.toolScreen.show());

        /*
        XYZZY - not quite working
        this.pageNumber = new TextWidget( this.toolScreen);
        this.pageNumber.setLocal([40,250]);
        this.pageNumber.setText( ""+ (this.viewRoot.model.currentPage+1));
        this.subscribe("hud", "page-change", (pageNum)=>this.pageNumber.setText(""+(pageNum+1)));
        */

    }

}

// xyzzy - this is wrong. Rename toolScreen to colorToolScreen and move all this back under HUD

export class ColorBrushHUD extends Widget{

    constructor(){
        super();
        this.set({autoSize:[1,1]});
        this.toolScreen = new Widget(null, {clip:true, autosize:[1,1], size:[500,500]});
        //this.toolScreen.autoSize = [1,1];
        this.buildColorTools();
        this.addChild(this.toolScreen);
    }

    buildColorTools(){
        this.firstColor = true;
        this.firstBrush = true;
        this.colorSet = new ToggleSet();
        this.brushSet = new ToggleSet();

        Colors.forEach(color=>this.makeColorToggle(color));

        this.makeBrushToggle(smallBrush, [tx,ty+150], Q.SMALL_BRUSH_SIZE, false);
        this.makeBrushToggle(mediumBrush, [tx+35,ty+150], Q.MEDIUM_BRUSH_SIZE, true);
        this.makeBrushToggle(largeBrush, [tx+70,ty+150], Q.LARGE_BRUSH_SIZE, false);
    }

    makeColorToggle(color){
        const toggle = new ToggleWidget(this.toolScreen,{local: color[0], size:[30,30]});
        this.setColorDefaults(toggle, color[1]);
        this.colorSet.add(toggle);
        if(this.firstColor)this.colorSet.pick(toggle);
        this.firstColor = false;
    }

    makeBrushToggle(icon, loc, size, active){
        const toggle = new ToggleWidget(this.toolScreen, {local:loc, size:[30,30]});
        toggle.normalOn.set({color:[0.9, 0.9, 0.9]});
        toggle.normalOff.set({color:[0.1, 0.1, 0.1]});
        toggle.hiliteOn.set({color:[0.8, 0.8, 0.8]});
        toggle.hiliteOff.set({color:[0.3, 0.3, 0.3]});
        toggle.pressedOn.set({color:[0.5, 0.5, 0.5]});
        toggle.pressedOff.set({color:[0.5, 0.5, 0.5]});
        toggle.setLabelOn(new ImageWidget(toggle, {size:[30,30], border:[2,2,2,2]}));
        toggle.labelOn.loadFromURL(icon);
        toggle.setLabelOff(new ImageWidget(toggle, {size:[30,30], border:[2,2,2,2]}));
        toggle.labelOff.loadFromURL(icon);
        toggle.onToggleOn = () => this.setBrushSize(size);
        this.brushSet.add(toggle);
        if(active){
            this.brushSet.pick(toggle);
        }
    }

    convertHex2Color(hex){
        if(hex[0]==='#')hex=hex.slice(1,7);
        var aRgbHex = hex.match(/.{1,2}/g);
        var aRgb = [
            parseInt(aRgbHex[0], 16)/255.0,
            parseInt(aRgbHex[1], 16)/255.0,
            parseInt(aRgbHex[2], 16)/255.0
        ];
        return aRgb;
    }

    setColorDefaults(toggle, color) {
        let colorArray = this.convertHex2Color(color);
        let gray = this.convertHex2Color("#CCCCCC");
        let darkgray = this.convertHex2Color("#888888");
        toggle.normalOn.set({color:gray});
        toggle.normalOff.set({color:darkgray});
        toggle.hiliteOn.set({color:[0.8, 0.8, 0.8]});
        toggle.hiliteOff.set({color:[0.3, 0.3, 0.3]});
        toggle.pressedOn.set({color:[0.5, 0.5, 0.5]});
        toggle.pressedOff.set({color:[0.5, 0.5, 0.5]});
        toggle.setLabelOn(new BoxWidget(toggle, {size:[30,30], border:[2,2,2,2], color:colorArray}));
        toggle.setLabelOff(new BoxWidget(toggle, {size:[30,30], border:[1,1,1,1], color:colorArray}));
        toggle.onToggleOn = () => {
            this.setEditColor(color);
        };

    }

    setEditColor(c) {
        // console.log("setEditColor", c);
        this.publish("hud", "edit-color", c);
    }

    setBrushSize(s){
        // console.log("setBrushSize", s);
        this.publish("hud", "brush-size", s);
    }
}

//------------------------------------------------------------------------------------------
// Join the Teatime session and spawn our model and view.
//------------------------------------------------------------------------------------------

//----------------- 5. WidgetDock and Session.join ---------------------

function go() {
    App.messages = true;
    App.makeWidgetDock({badge: true, qrcode: true});

    const joinArgs = {
        appId: 'io.croquet.whiteboard',
        name: App.autoSession(),
        password: 'dummy-pass',
        model: DrawModel,
        view: DrawView,
        tps: 1
        };
    Session.join(joinArgs);
}
go();
