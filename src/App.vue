<template>
  <canvas id="bjs">

  </canvas>

</template>


<script lang="ts" setup>
import {onMounted, onUnmounted} from "vue";
import {Engine, MeshBuilder, Scene} from "@babylonjs/core";
import "@babylonjs/inspector"

async function createScene(scene) {
  scene.debugLayer.show().then()
  let box = MeshBuilder.CreateBox("box")
  scene.createDefaultCameraOrLight(true, true, true)
}

onMounted(() => {
  let engine = new Engine(document.querySelector("#bjs") as HTMLCanvasElement)
  let scene = new Scene(engine)

  let renderLoop = function () {
    scene.render()
  }

  createScene(scene).then(value => {
    engine.runRenderLoop(renderLoop)
  })

  onUnmounted(() => {
    scene.dispose()
    engine.dispose()
  })
})

</script>


<style scoped>
#bjs {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
