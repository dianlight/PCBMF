<template>
        <el-container>
            <el-header><statusbar/></el-header>
            <!--el-aside></el-aside-->
            <el-main><router-view></router-view></el-main>
        </el-container>
</template>

<script lang='ts'>
import Vue from "vue";
import statusbar from "./statusbar.vue";
export default Vue.extend({
    computed: {
        currentFile() {
           return this.$store.state.currentFile;
        }
    },
    components: {
           statusbar,
    }    

});
</script>

<style scoped>
.el-container {
    height: 100%;
    min-height: 100%;
}
.el-main {
    min-height: 100%;
}
</style>