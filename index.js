import Vue from 'vue';
import App from './App.vue';

import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";
window.moment = moment;

const root = new Vue({
    render: createElement => createElement(App)
}).$mount('#app')