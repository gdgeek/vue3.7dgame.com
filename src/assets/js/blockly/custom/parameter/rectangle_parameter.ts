import * as Blockly from 'blockly';
import EventType from './type'
// import Helper from '../helper'
import { range } from '../argument'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  resource: {
    action: { name: string; uuid: string }[];
  };
}

// 定义 BlockJson 类型
interface BlockJson {
  type: string;
  message0: string;
  args0: any[];
  inputsInline: boolean;
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
  name: 'rectangle_parameter'
}

const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '范围随机点 %1 中点 %2 半径 %3 ',
      args0: [
        {
          type: 'input_dummy'
        },
        {
          type: 'input_value',
          name: 'Anchor',
          check: 'Parameter'
        },
        {
          type: 'field_number',
          name: 'Radius',
          value: 0.2,
          precision: 0.01
        }
      ],
      inputsInline: true,
      output: 'Parameter',
      colour: 230,
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
      var value_anchor = luaGeneratorInstance.valueToCode(
        block,
        'Anchor',
        luaGeneratorInstance.ORDER_ATOMIC
      )

      // TODO: Assemble javascript into code variable.

      var number_radius = block.getFieldValue('Radius')
      var code = range(value_anchor, number_radius)
      // TODO: Change ORDER_NONE to the correct strength.

      return [code, luaGeneratorInstance.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
