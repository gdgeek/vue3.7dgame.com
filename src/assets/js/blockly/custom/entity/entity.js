import Blockly from 'blockly'
import DataType from './type'

import Helper from '../helper'
const data = {
  name: 'entity'
}
const block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: data.name,
      message0: '实体 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Entity',
          options: function () {
            const entity = resource.entity
            let opt = [['none', '']]
            entity.forEach(ent => {
              opt.push([ent.name, ent.uuid])
            })
            return opt
          }
        }
      ],
      output: 'Entity',
      colour: DataType.colour,
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
      var dropdown = block.getFieldValue('Entity')

      return [Helper.handler(dropdown), Blockly.Lua.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
