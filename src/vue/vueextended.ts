import { GlobalVarGlobal, GlobalVarGlobalApplication, GlobalVarGlobalApplicationProgress } from "@/models/globalVarGlobal";
import Vue from "vue";


export class VueExtended extends Vue implements GlobalVarGlobal {
    $application: GlobalVarGlobalApplication = {
        workers:[] as Worker[],
        progress:{           
        } as GlobalVarGlobalApplicationProgress,
    }
    
}