import * as Blockly from 'blockly';
import DataType from './type'
import { handler } from '../helper'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  resource: {
    polygen: { name: string; uuid: string }[];
  };
}

// 定义 BlockJson 类型
interface BlockJson {
  type: string;
  message0: string;
  args0: any[];
  // inputsInline: boolean;
  output: string;
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
  getBlock: (parameters: Parameters) => Blockly.Block;
  getLua: (parameters: { index: any }) => (block: Blockly.Block) => [string, number];
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'polygen_entity'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: data.name,
      message0: '模型 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Polygen',
          options: function () {
            const polygen = resource.polygen
            let opt = [['none', '']]
            polygen.forEach(poly => {
              opt.push([poly.name, poly.uuid])
            })
            return opt
          }
        }
      ],
      output: 'Polygen',
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
    } as Blockly.Block
    return data
  },
  getLua({ index }) {
    const lua = function (block: Blockly.Block): [string, number] {
      var dropdown_polygen = block.getFieldValue('Polygen')
      return [handler(dropdown_polygen), luaGeneratorInstance.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
