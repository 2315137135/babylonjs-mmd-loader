<template>
  <canvas id="bjs">
  </canvas>
</template>


<script lang="ts" setup>
import {onMounted, onUnmounted} from "vue";
import {Color3, DirectionalLight, Engine, MeshBuilder, Scene, Tools, Vector3} from "@babylonjs/core";
import "@babylonjs/inspector"
import {ImportMMDMeshAsync, parseMaterial, parseMesh} from "./lib/mmd-loader.ts";
import {MMDParser} from "mmd-parser";

async function createScene(scene: Scene) {
  scene.debugLayer.show({embedMode: true}).then()
  scene.clearColor = Color3.White().scale(0.7).toColor4()
  scene.ambientColor = Color3.FromHexString("#F3D5DF")
  scene.imageProcessingConfiguration.toneMappingEnabled = true
  let sun = new DirectionalLight("sun", Vector3.FromArray([-1, -2.5, 1.2]), scene)
  sun.intensity = 1.5

  let mesh = await ImportMMDMeshAsync("/mmd", "/miku_v2.pmd", scene)

  let data = await Tools.LoadFileAsync("/vmd/wavefile_v2.vmd", true)
  console.log(new MMDParser.Parser().parseVmd(data));

  scene.createDefaultCamera(true, true, true)
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
