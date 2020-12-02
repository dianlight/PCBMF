import Vue from "vue";
import VueRouter from "vue-router";
import home from "./pages/home.vue";
import wizard from "./pages/wizard.vue";
import wizard_config from "./pages/wizard_config.vue";
import preferencies from "./pages/preferencies.vue";

Vue.use(VueRouter);

export default new VueRouter({
    routes:[
        { path: '/', component: home },
        { path: '/preferencies', component: preferencies },
        { path: '/wizard/', component: wizard, children: [
            {
                path: 'config',
                component: wizard_config,
            }
        ] },
    ]
});
