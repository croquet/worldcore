const { Model, View } = require("@croquet/croquet");

/*------------------ Timer ---------------------------
 Timer is a simple Croquet Model time object that publishes at regular intervals.
 options:
      total: total milliseconds run until self destruct. Forever if total is not specified or is 0
      delta: interval to each  action being executed = if not specified or 0, no intervals action messages are published
      noTrigger: if true, you must call SimpleTimer.trigger() directly
      scope: event scope to listen for, should be unique 

*  You cannot subscribe twice to the same scope/event pair. Either reuse the ones you are using, or unsubscribe and resubscribe.

 Example of use:

  startTimer(){
        this.subscribe("test-timer", "timer-start", t=>console.log("Started at: ", t.time, "percent: ", 100*t.percent, "%"));
        this.subscribe("test-timer", "timer-tick", t=>console.log("Progress is ", t.time, "percent: ", 100*tt.percent, "%"));
        this.subscribe("test-timer", "timer-end", t=>console.log("Complete at: ", t.time, "percent: ", 100*tt.percent, "%"));
        this.st = new VSimpleTimer();  // or this.st = MSimpleTimer.create();
        this.st.trigger({scope:"test-timer", total: 5000, delta: 990});
  }

 The console will display:
    Started at:  0 percent:  0 %
    Progress is  990 percent:  19.8 %
    Progress is  1980 percent:  39.6 %
    Progress is  2970 percent:  59.4 %
    Progress is  3960 percent:  79.2 %
    Progress is  4950 percent:  99 %
    Complete at:  5000 percent:  100 %
*/

export class MSimpleTimer extends Model{

    trigger( options ){
        this.total = options.total;
        this.delta = options.delta || 20;
        this.scope = options.scope || "simple=timer";
        this.subscribe( this.scope, "end-timer", this.endTimer ); // terminate the timer early with endTimer message
        this.publish(this.scope, "timer-start", {time: 0, percent: 0}); // let everyone know we started the timer
        if(this.total) this.future(this.total+1).endTimer(); // if total is 0, then this timer never terminates unless it receives an "end-timer" message
        if(this.delta) this.future(this.delta).tick(this.delta); // if delta is 0, then this is just for the endTimer()
    }
  
    tick( myTime ){
      if( !this.doomed ){ 
        this.publish(this.scope, "timer-tick", {time:myTime, percent: this.total?myTime/this.total:0});
        if(myTime+this.delta < this.total) this.future(this.delta).tick( myTime+this.delta ); // endTime has the last tick
      }
    }
  
    endTimer() {
      this.doomed = true;
      this.publish( this.scope, "timer-tick", {time: this.total, percent: 1 }); // always returns the total value even if terminated prematurely
      this.publish( this.scope, "timer-end", {time: this.total, percent: 1 }); // always returns the total value even if terminated prematurely
      this.destroy();
    }
  }

  MSimpleTimer.register("MSimpleTimer");


  export class VSimpleTimer extends View{

    trigger( options ){
        this.total = options.total;
        this.delta = options.delta || 20;
        this.scope = options.scope || "simple=timer";
        this.subscribe( this.scope, "end-timer", this.endTimer ); // terminate the timer early with endTimer message
        this.publish(this.scope, "timer-start", {time: 0, percent: 0}); // let everyone know we started the timer
        if(this.total) this.future(this.total+1).endTimer(); // if total is 0, then this timer never terminates unless it receives an "end-timer" message
        if(this.delta) this.future(this.delta).tick(this.delta); // if delta is 0, then this is just for the endTimer()
    }
  
    tick( myTime ){
      if( !this.doomed ){ 
        this.publish(this.scope, "timer-tick", {time:myTime, percent: this.total?myTime/this.total:0});
        if(myTime+this.delta <= this.total) this.future(this.delta).tick( myTime+this.delta ); // endTime has the last tick
      }
    }
  
    endTimer() {
      this.doomed = true;
      this.publish( this.scope, "timer-tick", {time: this.total, percent: 1 }); // always returns the total value even if terminated prematurely
      this.publish( this.scope, "timer-end", {time: this.total, percent: 1 }); // always returns the total value even if terminated prematurely
      this.detach();
    }
  }