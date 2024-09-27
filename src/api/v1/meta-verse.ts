import { postMeta, putMeta } from "./meta";
import { postVerse, putVerse } from "./verse";
import { postMetaResource } from "./meta-resource";
import { v4 as uuidv4 } from "uuid";

interface Resource {
  id: number;
  name: string;
  image_id: number;
  info: string;
}

interface Meta {
  id: number;
}

interface Verse {
  id: number;
}

const initVerse = async (type: string, name: string, resource: Resource) => {
  const json = {
    name,
    description: "通过模型[" + resource.name + "]创建的简单场景。",
    course: -1,
  };

  const data = {
    name,
    info: JSON.stringify(json),
    image_id: resource.image_id,
    uuid: uuidv4(),
    version: 3,
  };
  const response = await postVerse(data);
  return response.data;
};

const initMeta = async (type: string, verse: Verse, resource: Resource) => {
  const data = {
    name: `${type}:${resource.name}`,
    verse_id: verse.id,
    image_id: resource.image_id,
  };
  const response = await postMeta(data);
  return response.data;
};

const updateMeta = async (type: string, meta: Meta, resource: Resource) => {
  const info = JSON.parse(resource.info);
  const r = 0.5 / info.size.y;
  const scale = { x: r, y: r, z: r };
  const position = {
    x: -info.center.x * r,
    y: -info.center.y * r,
    z: -info.center.z * r,
  };
  const data = {
    type: "MetaRoot",
    parameters: {
      uuid: uuidv4(),
    },
    children: {
      entities: [
        {
          type,
          parameters: {
            uuid: uuidv4(),
            name: "expression",
            transform: {
              position,
              rotate: { x: 0, y: 0, z: 0 },
              scale,
            },
            active: true,
            resource: resource.id,
          },
          children: {
            entities: [],
            components: [],
          },
        },
      ],
      addons: [],
    },
  };

  const response = await putMeta(meta.id, { data: JSON.stringify(data) });
  return response.data;
};

const updateVerse = async (type: string, verse: Verse, meta: Meta) => {
  const data = {
    type: "Verse",
    parameters: {
      uuid: uuidv4(),
    },
    children: {
      modules: [
        {
          type: "Module",
          parameters: {
            uuid: uuidv4(),
            meta_id: meta.id,
            title: type,
            transform: {
              position: { x: 0, y: 0, z: 2 },
              rotate: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            active: true,
          },
        },
      ],
    },
  };
  const response = await putVerse(verse.id, { data: JSON.stringify(data) });
  return response.data;
};

export const createVerseFromResource = (
  type: string,
  name: string,
  resource: Resource
) => {
  return new Promise<{ verse: Verse; meta: Meta }>(async (resolve, reject) => {
    try {
      const verse = await initVerse(type, name, resource);
      const meta = await initMeta(type, verse, resource);
      await postMetaResource({
        meta_id: meta.id,
        resource_id: resource.id,
      });

      const verse2 = await updateVerse(type, verse, meta);
      const meta2 = await updateMeta(type, meta, resource);
      resolve({ verse: verse2, meta: meta2 });
    } catch (e) {
      reject(e);
    }
  });
};
