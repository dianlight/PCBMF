<template>
  <x-box>
    <x-button>
      <x-label>Open Gerber Zip...</x-label>
    </x-button>
    <x-button disabled>
      <x-label>Open Gerber File..</x-label>
    </x-button>
    <x-button disabled>
      <x-label>Open Excellion File..</x-label>
    </x-button>
  </x-box>
</template>

<script lang="ts">
import Vue from "vue";
export default Vue.extend({});
</script>

<style scoped>
x-box {
  display: block;
  align-content: center;
  height: 100%;
  width: 100%;
}
x-button {
  height: 20%;
  width: 50%;
  margin-top: 1em;
  margin-left: 25%;
}
</style>