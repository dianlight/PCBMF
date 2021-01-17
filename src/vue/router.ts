import Vue from "vue";
import VueRouter, { NavigationGuard } from "vue-router";
import home from "./pages/home.vue";
import wizard from "./pages/wizard.vue";
import projectConfig from "./pages/project_config.vue";
import preferencies from "./pages/preferencies.vue";
//import wizard_isolation from "@/vue/pages/wizard_isolation.vue";
//import wizard_drill from "@/vue/pages/wizard_drill.vue";
//import wizard_outline from "@/vue/pages/wizard_outline.vue";
//import wizard_copper_thief from "@/vue/pages/wizard_copper_thief.vue";
import project from "@/vue/pages/project.vue";
import store from "./store/store";

Vue.use(VueRouter);

const router = new VueRouter({
    routes: [
        { path: '/', component: home },
        { path: '/project', component: project },
        { path: '/preferencies', component: preferencies },
        {
            path: '/wizard/', component: wizard, children: [
                {
                    path: 'config',
                    component: projectConfig,
                    meta: { step: 0 }
                },
                /*
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
                */
            ]
        },
    ]
});

// LocalForage hook
const waitForStorageToBeReady:NavigationGuard<Vue> = async (to, from, next) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await (store as unknown as any).restored;
    next()
};

router.beforeEach(waitForStorageToBeReady);

export default router;  
