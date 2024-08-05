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
  name: 'task-tween'
}
const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      "type": "block_type",
      "message0": "物体 %1 移动到 %2 用时 %3 %4 差值方式 %5",
      "args0": [
        {
          "type": "input_value",
          "name": "From",
          "check": "Entity"
        },
        {
          "type": "input_value",
          "name": "To",
          "check": "Entity"
        },
        {
          "type": "field_number",
          "name": "Time",
          "value": 0.03
        },
        {
          "type": "input_dummy"
        },
        {
          "type": "field_dropdown",
          "name": "Easy",
          "options": [
            [
              "LINEAR",
              "LINEAR"
            ],
            [
              "EASE_IN",
              "EASE_IN"
            ],
            [
              "EASE_OUT",
              "EASE_OUT"
            ],
            [
              "EASE_IN_OUT",
              "EASE_IN_OUT"
            ],
            [
              "BOUNCE_IN",
              "BOUNCE_IN"
            ],
            [
              "BOUNCE_OUT",
              "BOUNCE_OUT"
            ],
            [
              "BOUNCE_IN_OUT",
              "BOUNCE_IN_OUT"
            ]
          ]
        }
      ],
      "inputsInline": true,
      "output": "Task",
      "colour": EventType.colour,
      "tooltip": "",
      "helpUrl": "",

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
      var time = block.getFieldValue('Time')
      var easy = block.getFieldValue('Easy')

      var from = luaGeneratorInstance.valueToCode(
        block,
        'From',
        luaGeneratorInstance.ORDER_ATOMIC
      )

      var to = luaGeneratorInstance.valueToCode(
        block,
        'To',
        luaGeneratorInstance.ORDER_ATOMIC
      )
      // TODO: Assemble Lua into code variable.
      var code = '_G.task.tween(' + from + ', ' + to + ', ' + time + ', "' + easy + '")'
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
