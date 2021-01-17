/**
 * Extends interfaces in Vue.js
 */

import { GlobalVarGlobalApplication } from "@/models/globalVarGlobal";

declare module 'vue/types/vue' {
  interface Vue {
    $application: GlobalVarGlobalApplication;
  }
}

/*
declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    $application: GlobalVarGlobalApplication;
    $store: Store<IProject>;
  }
}
*/