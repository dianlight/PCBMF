import Vue from "vue";
import VueRouter from "vue-router";
import home from "./pages/home.vue";
import wizard from "./pages/wizard.vue";
import wizard_config from "./pages/wizard_config.vue";

Vue.use(VueRouter);

export default new VueRouter({
    routes:[
        { path: '/', component: home },
        { path: '/wizard/', component: wizard, children: [
            {
                path: 'config',
                component: wizard_config,
            }
        ] },
    ]
});
