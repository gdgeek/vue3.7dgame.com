import * as Blockly from 'blockly';
import EventType from './type'
// import Helper from '../helper'
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
  name: 'task_array'
}
const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '任务数组 %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'ArrayType',
          options: [
            ['list', 'LIST'],
            ['set', 'SET']
          ]
        },
        {
          type: 'input_value',
          name: 'TaskArray',
          check: 'Array'
        }
      ],
      inputsInline: true,
      output: 'Task',
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
    } as Blockly.Block
    return data
  },
  getLua() {
    const lua = function (block: Blockly.Block): [string, number] {
      var type = block.getFieldValue('ArrayType')

      var array = luaGeneratorInstance.valueToCode(
        block,
        'TaskArray',
        luaGeneratorInstance.ORDER_ATOMIC
      )

      var code = '_G.task.array("' + type + '",' + array + ')\n'

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
