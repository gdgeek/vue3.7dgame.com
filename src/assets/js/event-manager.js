import { postEventInput, deleteEventInput } from '@/api/v1/event-input'
import { postEventOutput, deleteEventOutput } from '@/api/v1/event-output'
import { postEventLink, testDelEventLink } from '@/api/v1/event-link'

async function rebuild(node, inputs, outputs) {
  const ret = node
  const inodes = inputs.filter(item => {
    if (!node.inputs.find(item2 => item.uuid === item2.uuid)) {
      return true
    }
    return false
  })

  for (var i = 0; i < inodes.length; i++) {
    const response = await postEventInput({
      event_node_id: node.id,
      uuid: inodes[i].uuid,
      title: inodes[i].title
    })
    inodes[i].id = response.data.id
  }

  const dinodes = node.inputs.filter(item => {
    if (!inputs.find(item2 => item.uuid === item2.uuid)) {
      return true
    }
    return false
  })

  for (var i = 0; i < dinodes.length; i++) {
    await deleteEventInput(dinodes[i].id)
  }

  const onodes = outputs.filter(item => {
    if (!node.outputs.find(item2 => item.uuid === item2.uuid)) {
      return true
    }
    return false
  })

  for (var i = 0; i < onodes.length; i++) {
    const response = await postEventOutput({
      event_node_id: node.id,
      uuid: onodes[i].uuid,
      title: onodes[i].title
    })
    onodes[i].id = response.data.id
  }

  const donodes = node.outputs.filter(item => {
    if (!outputs.find(item2 => item.uuid === item2.uuid)) {
      return true
    }
    return false
  })

  for (var i = 0; i < donodes.length; i++) {
    await deleteEventOutput(donodes[i].id)
  }

  ret.inputs = inputs
  ret.outputs = outputs
  return ret
}

function filter(links, map, list) {
  const oldValue = []
  const newValue = []
  links.forEach(item => {
    oldValue.push({
      id: item.id,
      input: item.event_input_id,
      output: item.event_output_id
    })
  })

  list.forEach(item => {
    if (map.iMap.has(item.input.uuid) && map.oMap.has(item.output.uuid)) {
      const i = map.iMap.get(item.input.uuid)
      const o = map.oMap.get(item.output.uuid)
      newValue.push({ input: i.id, output: o.id })
    }
  })

  const ret = {
    addList: [],
    removeList: []
  }

  ret.addList = Array.from(newValue).filter(item => {
    const same = Array.from(oldValue).find(item2 => {
      if (item.input === item2.input && item.output === item2.output) {
        return true
      }
      return false
    })
    if (same) {
      return false
    }
    return true
  })

  ret.removeList = Array.from(oldValue).filter(item => {
    const same = Array.from(newValue).find(item2 => {
      if (item.input === item2.input && item.output === item2.output) {
        return true
      }
      return false
    })
    if (same) {
      return false
    }
    return true
  })
  /**/
  return ret
}
function getLinked(data, linked, map) {
  if (!data) {
    data = {
      uuid: map.oMap.get(linked.event_output_id).output.uuid,
      connections: []
    }
  }
  const item = map.iMap.get(linked.event_input_id)
  data.connections.push({
    node: item.node,
    uuid: item.input.uuid
  })
  return data
}
function getNodes(verse) {

  //console.error(verse)
  //console.error(verse.metas)
  const nodes = []

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
  return nodes
}
async function loadLinked(verse) {
  const nodes = getNodes(verse)
  const map = getIOMapById(nodes)
  const ret = []

  const lMap = new Map()

  verse.links.forEach(item => {
    lMap.set(
      item.event_output_id,
      getLinked(lMap.get(item.event_output_id), item, map)
    )
  })

  nodes.forEach(node => {
    const nd = {
      node: node.uuid,
      linked: []
    }
    if (!node) {
      return
    }

    node.outputs.forEach(output => {
      if (lMap.has(output.id)) {
        nd.linked.push(lMap.get(output.id))
      }
    })
    if (nd.linked.length !== 0) {
      ret.push(nd)
    }
  })

  return ret
}

function getIOMapById(nodes) {
  const iMap = new Map()
  const oMap = new Map()

  nodes.forEach(node => {
    if (!node) {
      return
    }
    node.inputs.forEach(input => {
      iMap.set(input.id, { node: node.uuid, input })
    })

    node.outputs.forEach(output => {
      oMap.set(output.id, { node: node.uuid, output })
    })
  })

  return { iMap, oMap }
}
function getIOMapByUuid(nodes) {
  const iMap = new Map()
  const oMap = new Map()
  nodes.forEach(node => {
    if (!node) {
      return
    }
    node.inputs.forEach(input => {
      iMap.set(input.uuid, input)
    })

    node.outputs.forEach(output => {
      oMap.set(output.uuid, output)
    })
  })

  return { iMap, oMap }
}
async function saveLinked(verse, list) {
  const nodes = getNodes(verse)

  const map = getIOMapByUuid(nodes)

  console.error(list)
  console.error(map)
  const links = []
  for (var i = 0; i < list.length; i++) {
    const item = list[i]
    for (var j = 0; j < item.linked.length; j++) {
      const item2 = item.linked[j]
      for (var k = 0; k < item2.connections.length; k++) {
        const item3 = item2.connections[k]

        if (map.iMap.has(item3.uuid) && map.oMap.has(item2.uuid)) {
          const input = map.iMap.get(item3.uuid)
          const output = map.oMap.get(item2.uuid)
          links.push({ input, output })
        }
      }
    }
  }

  console.error(links)
  const oo = filter(verse.links, map, links)

  oo.addList.forEach(async item => {
    const response = await postEventLink({
      verse_id: verse.id,
      event_input_id: item.input,
      event_output_id: item.output
    })
    verse.links.push(response.data)
  })

  oo.removeList.forEach(async item => {
    try {
      await testDelEventLink(item.id)
    } catch (e) {
      console.log(e)
    }
    verse.links = verse.links.filter(item2 => item2.id !== item.id)
  })
}
export default { rebuild, saveLinked, loadLinked }
