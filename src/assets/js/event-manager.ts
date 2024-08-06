import { postEventInput, deleteEventInput } from '@/api/v1/event-input';
import { postEventOutput, deleteEventOutput } from '@/api/v1/event-output';
import { postEventLink, testDelEventLink } from '@/api/v1/event-link';

// 定义节点输入输出的接口
interface Node {
  id: number;
  uuid: string;
  inputs: InputOutput[];
  outputs: InputOutput[];
}

interface InputOutput {
  id: number;
  uuid: string;
  title?: string;
}

interface Link {
  id: number;
  event_input_id: number;
  event_output_id: number;
}

interface IOMap {
  iMap: Map<number, InputOutput>;
  oMap: Map<number, InputOutput>;
}

interface FilterResult {
  addList: { input: number; output: number }[];
  removeList: { id?: number; input: number; output: number }[];
}

interface Linked {
  uuid: string;
  connections: { node: string; uuid: string }[];
}

interface Verse {
  id: number;
  links: Link[];
}

// 重建节点
async function rebuild(node: Node, inputs: InputOutput[], outputs: InputOutput[]): Promise<Node> {
  const ret = { ...node };

  const inodes = inputs.filter(item => !node.inputs.some(item2 => item.uuid === item2.uuid));
  for (const inode of inodes) {
    const response = await postEventInput({
      event_node_id: node.id,
      uuid: inode.uuid,
      title: inode.title,
    });
    inode.id = response.data.id;
  }

  const dinodes = node.inputs.filter(item => !inputs.some(item2 => item.uuid === item2.uuid));
  for (const dinode of dinodes) {
    await deleteEventInput(dinode.id);
  }

  const onodes = outputs.filter(item => !node.outputs.some(item2 => item.uuid === item2.uuid));
  for (const onode of onodes) {
    const response = await postEventOutput({
      event_node_id: node.id,
      uuid: onode.uuid,
      title: onode.title,
    });
    onode.id = response.data.id;
  }

  const donodes = node.outputs.filter(item => !outputs.some(item2 => item.uuid === item2.uuid));
  for (const donode of donodes) {
    await deleteEventOutput(donode.id);
  }

  ret.inputs = inputs;
  ret.outputs = outputs;
  return ret;
}

// 过滤链接
function filter(links: Link[], map: IOMap, list: { input: InputOutput; output: InputOutput }[]): FilterResult {
  const oldValue = links.map(item => ({
    id: item.id,
    input: item.event_input_id,
    output: item.event_output_id,
  }));

  const newValue = list
    .filter(item => map.iMap.has(item.input.id) && map.oMap.has(item.output.id))
    .map(item => ({
      input: map.iMap.get(item.input.id)!.id,
      output: map.oMap.get(item.output.id)!.id,
    }));

  const addList = newValue.filter(item => !oldValue.some(item2 => item.input === item2.input && item.output === item2.output));
  const removeList = oldValue.filter(item => !newValue.some(item2 => item.input === item2.input && item.output === item2.output));

  return { addList, removeList };
}

// 获取链接信息
function getLinked(data: Linked | undefined, linked: Link, map: IOMap): Linked {
  if (!data) {
    data = {
      uuid: map.oMap.get(linked.event_output_id)!.uuid,
      connections: [],
    };
  }
  const item = map.iMap.get(linked.event_input_id)!;
  data.connections.push({
    node: item.uuid,
    uuid: item.uuid,
  });
  return data;
}

// 获取节点
function getNodes(verse: Verse): Node[] {
  const nodes: Node[] = [];
  // TODO: Uncomment and modify according to actual project structure
  /*if (verse.metas != undefined) {
    verse.metas.forEach(meta => {
      let node = { uuid: meta.uuid }
      Object.assign(node, meta.event_node)
      nodes.push(node)
    })
  }

  verse.metaKnights.forEach(metaKnight => {
    let node = { uuid: metaKnight.uuid }
    Object.assign(node, metaKnight.event_node)
    nodes.push(node)
  })*/
  return nodes;
}

// 加载链接
async function loadLinked(verse: Verse): Promise<{ node: string; linked: Linked[] }[]> {
  const nodes = getNodes(verse);
  const map = getIOMapById(nodes);
  const ret: { node: string; linked: Linked[] }[] = [];

  const lMap = new Map<number, Linked>();

  verse.links.forEach(item => {
    lMap.set(item.event_output_id, getLinked(lMap.get(item.event_output_id), item, map));
  });

  nodes.forEach(node => {
    const nd = {
      node: node.uuid,
      linked: [] as Linked[],
    };

    node.outputs.forEach(output => {
      if (lMap.has(output.id)) {
        nd.linked.push(lMap.get(output.id)!);
      }
    });

    if (nd.linked.length !== 0) {
      ret.push(nd);
    }
  });

  return ret;
}

// 通过 ID 获取 IOMap
function getIOMapById(nodes: Node[]): IOMap {
  const iMap = new Map<number, InputOutput>();
  const oMap = new Map<number, InputOutput>();

  nodes.forEach(node => {
    node.inputs.forEach(input => {
      iMap.set(input.id, input);
    });

    node.outputs.forEach(output => {
      oMap.set(output.id, output);
    });
  });

  return { iMap, oMap };
}

// 通过 UUID 获取 IOMap
function getIOMapByUuid(nodes: Node[]): IOMap {
  const iMap = new Map<number, InputOutput>(); // 修改为 number 类型
  const oMap = new Map<number, InputOutput>(); 

  nodes.forEach(node => {
    node.inputs.forEach(input => {
      iMap.set(input.id, input);
    });

    node.outputs.forEach(output => {
      oMap.set(output.id, output);
    });
  });

  return { iMap, oMap };
}

// 保存链接
async function saveLinked(verse: Verse, list: { uuid: string; linked: Linked[] }[]) {
  const nodes = getNodes(verse);

  const map = getIOMapByUuid(nodes);

  const links: { input: InputOutput; output: InputOutput }[] = [];
  for (const item of list) {
    for (const linked of item.linked) {
      for (const connection of linked.connections) {
        if (map.iMap.has(Number(connection.uuid)) && map.oMap.has(Number(linked.uuid))) {
          const input = map.iMap.get(Number(connection.uuid))!;
          const output = map.oMap.get(Number(linked.uuid))!;
          links.push({ input, output });
        }
      }
    }
  }

  const oo = filter(verse.links, map, links);

  for (const item of oo.addList) {
    const response = await postEventLink({
      verse_id: verse.id,
      event_input_id: item.input,
      event_output_id: item.output,
    });
    verse.links.push(response.data);
  }

  for (const item of oo.removeList) {
    try {
      await testDelEventLink(item.id!);
    } catch (e) {
      console.log(e);
    }
    verse.links = verse.links.filter(link => link.id !== item.id);
  }
}

export default { rebuild, saveLinked, loadLinked };
