import Vue from "vue";
import VueRouter from "vue-router";
import home from "./home.vue";

Vue.use(VueRouter);

export default new VueRouter({
    routes:[
        { path: '/', component: home }
    ]
});
