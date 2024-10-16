<template>
  <div>
    <!-- <div id="three" ref="three" style="height: 300px; width: 100%"></div> -->
    <vue3dLoader
      :height="200"
      :showFps="true"
      filePath="props.file"
      fileType="gltf"
      :mtlPath="[null, '/obj/2.mtl', null]"
      :backgroundColor="0xff00ff"
    ></vue3dLoader>
  </div>
</template>

<script setup lang="ts">
import { vue3dLoader } from "vue-3d-loader";

const props = defineProps<{
  file: { url: string };
}>();
</script>
