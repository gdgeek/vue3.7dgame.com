import * as Blockly from 'blockly';
import DataType from './type'
import { handler } from '../helper'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator();

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  resource: {
    voxel: { name: string; uuid: string }[];
  };
}

// 定义 BlockJson 类型
interface BlockJson {
  type: string;
  message0: string;
  args0: any[];
  // inputsInline: boolean;
  colour: number;
  tooltip: string;
  helpUrl: string;
}

// 定义 Block 类型
interface Block {
  title: string;
  type: string;
  colour: number;
  getBlockJson: (parameters: Parameters) => BlockJson;
  getBlock: (parameters: Parameters) => Blockly.BlockSvg;
  getLua: (parameters: { index: any }) => (block: Blockly.BlockSvg) => [string, number];
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'voxel_entity'
}
const block: Block = {
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
    } as Blockly.BlockSvg
    return data
  },
  getLua({ index }) {
    const lua = function (block: Blockly.BlockSvg): [string, number] {
      var dropdown = block.getFieldValue('Voxel')

      return [handler(dropdown), Order.NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
