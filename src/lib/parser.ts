import { MMDModelData } from 'mmd-parser';
import { Vector3 } from '@babylonjs/core';

export interface ParsedIK {
  target: number;
  effector: number;
  iteration: number;
  maxAngle: number;
  links: Array<{
    index: number;
    enabled: boolean;
    limitation?: Vector3;
    rotationMin?: Vector3;
    rotationMax?: Vector3;
  }>;
}

export const parseIKs = (data: MMDModelData) => {
  // iks
  const result: ParsedIK[] = [];

  if (data.metadata.format === 'pmd') {
    const ikCount = data.metadata.ikCount as number;
    for (let i = 0; i < ikCount; i++) {
      const iks = data.iks || [];
      const ik = iks[i];
      const parsedLinks = ik.links.map(ikLink => {
        const index = ikLink.index;
        const limitation = data.bones[index].name.indexOf('ひざ') >= 0 ? new Vector3(1.0, 0.0, 0.0) : undefined;
        return { index, enabled: true, limitation };
      });
      const param: ParsedIK = {
        target: ik.target,
        effector: ik.effector,
        iteration: ik.iteration,
        maxAngle: ik.maxAngle * 4,
        links: parsedLinks
      };
      result.push(param);
    }
  } else {
    const boneCount = data.metadata.boneCount as number;
    for (let i = 0; i < boneCount; i++) {
      const ik = data.bones[i].ik;
      if (ik === undefined) continue;
      const param: ParsedIK = {
        target: i,
        effector: ik.effector,
        iteration: ik.iteration,
        maxAngle: ik.maxAngle,
        links: []
      };
      for (let j = 0, jl = ik.links.length; j < jl; j++) {
        const link: ParsedIK['links'][number] = {
          index: ik.links[j].index,
          enabled: true
        };
        param.links.push(link);
      }
      result.push(param);
    }
  }

  return result;
};
