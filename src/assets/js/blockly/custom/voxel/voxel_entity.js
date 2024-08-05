import * as Blockly from 'blockly';
import DataType from './type'
import { handler } from '../helper'

const data = {
  name: 'voxel_entity'
}
const block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: data.name,
      message0: '体素 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Voxel',
          options: function () {
            const voxel = resource.voxel
            let opt = [['none', '']]
            voxel.forEach(({ name, uuid }) => {
              opt.push([name, uuid])
            })
            return opt
          }
        }
      ],
      output: 'Voxel',
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
      var dropdown = block.getFieldValue('Voxel')

      return [handler(dropdown), Blockly.Lua.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
