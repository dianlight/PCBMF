<template>
  <x-box>
    <x-icon name="mail"></x-icon>
    <x-icon name="delete"></x-icon>
    <x-icon name="settings"></x-icon>
    <x-label>File: {{ currentFile }}</x-label>
  </x-box>
</template>

<script lang='ts'>
import Vue from "vue";
export default Vue.extend({
    computed: {
        currentFile() {
           return this.$store.state.currentFile;
        }
    }
});
</script>

<style scoped>
</style>