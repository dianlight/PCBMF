import Vue from "vue";
import VueRouter from "vue-router";
import home from "./pages/home.vue";
import wizard from "./pages/wizard.vue";
import wizard_config from "./pages/wizard_config.vue";
import preferencies from "./pages/preferencies.vue";
import wizard_isolation from "@/vue/pages/wizard_isolation.vue";
import wizard_drill from "@/vue/pages/wizard_drill.vue";
import wizard_outline from "@/vue/pages/wizard_outline.vue";
import wizard_copper_thief from "@/vue/pages/wizard_copper_thief.vue";
import project from "@/vue/pages/project.vue";

Vue.use(VueRouter);

export default new VueRouter({
    routes:[
        { path: '/', component: home },
        { path: '/project/', component: project, children: [
            {
                path: 'config',
                component: wizard_config,
                meta: { step: 0 }
            },
            {
                path: 'isolation',
                component: wizard_isolation,
                meta: { step: 1 }
            },
        ] },
        { path: '/preferencies', component: preferencies },
        { path: '/wizard/', component: wizard, children: [
            {
                path: 'config',
                component: wizard_config,
                meta: { step: 0 }
            },
            {
                path: 'isolation',
                component: wizard_isolation,
                meta: { step: 1 }
            },
            {
                path: 'drill',
                component: wizard_drill,
                meta: { step: 2 }
            },
            {
                path: 'outline',
                component: wizard_outline,
                meta: { step: 3 }
            },
            {
                path: 'copper_thief',
                component: wizard_copper_thief,
                meta: { step: 4 }
            },
        ] },
    ]
});
