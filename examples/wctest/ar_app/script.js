import Model from './croquet/model/Model.js';
import View from './croquet/view/View.js';

Croquet.Session.join(`webXR`, Model, View, {tps: 0, autoSleep: false}).then(session => {
    window.session = session;
});