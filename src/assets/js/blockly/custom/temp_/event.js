import * as Blockly from 'blockly';
import EventType from './type'

import Helper from '../helper'
const data = {
  name: 'event'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '调用消息 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Event',
          options: function () {
            const events = resource.events.inputs
            let opt = [['none', '']]
            events.forEach(item => {
              opt.push([item.title, item.uuid])
            })
            return opt
          }
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: EventType.colour,
      tooltip: '',
      helpUrl: ''
    }
    return json
  },
  getBlock: function (parameters) {
    const data = {
      init: function () {
        const json = block.getBlockJson(parameters)
        this.jsonInit(json)
      }
    }
    return data
  },
  getLua({ index }) {
    const lua = function (block) {
      var event = block.getFieldValue('Event')

      // TODO: Assemble Lua into code variable.
      var code = '_G.helper.exe_event(' + JSON.stringify(event) + ')\n'

      return code
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
