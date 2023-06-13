import {
  AssetContainer,
  ISceneLoaderAsyncResult,
  ISceneLoaderPluginAsync,
  Scene,
  SceneLoader,
  ISceneLoaderProgressEvent
} from '@babylonjs/core';
import { ImportMMDMeshAsync } from './mmd-loader';

export class ModelFileLoader implements ISceneLoaderPluginAsync {
  public name = 'mmd-model';
  public extensions = {
    '.pmd': { isBinary: true },
    '.pmx': { isBinary: true },
  };

  public importMeshAsync(meshesNames: any, scene: Scene, data: ArrayBuffer | string, rootUrl: string, onProgress?: (event: ISceneLoaderProgressEvent) => void, fileName?: string): Promise<ISceneLoaderAsyncResult> {
    console.log(`meshesNames: ${meshesNames}, data: ${Object.prototype.toString.call(data)}, rootUrl: ${rootUrl}, fileName: ${fileName}`);
    return ImportMMDMeshAsync(
      rootUrl,
      fileName || '',
      data,
      scene,
    ).then((mesh) => {
      return {
        meshes: [mesh],
        particleSystems: [],
        skeletons: [],
        animationGroups: [],
        transformNodes: [],
        geometries: [],
        lights: [],
      };
    });
  }

  public loadAsync(scene: Scene, data: string, rootUrl: string): Promise<void> {
    //Get the 3D model
    return this.importMeshAsync(null, scene, data, rootUrl).then(() => {
      // return void
    });
  }

  public loadAssetContainerAsync(scene: Scene, data: string, rootUrl: string): Promise<AssetContainer> {
    return this.importMeshAsync(null, scene, data, rootUrl).then((result) => {
      return new AssetContainer(scene);
    });
  }
}

if (SceneLoader) {
  SceneLoader.RegisterPlugin(new ModelFileLoader());
}
