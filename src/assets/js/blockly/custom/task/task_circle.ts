import * as Blockly from 'blockly';
import EventType from './type'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator();

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
  getBlock: (parameters: Parameters) => Blockly.BlockSvg;
  getLua: (parameters: { index: any }) => (block: Blockly.BlockSvg) => [string, number];
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'task_circle'
}
const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '任务循环 %1 %2',
      args0: [
        {
          type: 'field_number',
          name: 'Times',
          value: '0',
          precision: 1,
          min: 0,
          max: 100
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
    } as Blockly.BlockSvg
    return data
  },
  getLua() {
    const lua = function (block: Blockly.BlockSvg): [string, number] {
      // var type = block.getFieldValue('ArrayType')
      var number_times = block.getFieldValue('Times')
      var array = luaGeneratorInstance.valueToCode(
        block,
        'TaskArray',
        Order.ATOMIC
      )

      var code = '_G.task.circle(' + number_times + ',' + array + ')\n'

      return [code, Order.NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
