import * as Vue from 'vue';

export const isVue27 = /^2\.7\.*/.test(Vue.version); // whether is Vue2.7

export const isVue3 = /^3\.*/.test(Vue.version);  // whether is Vue3