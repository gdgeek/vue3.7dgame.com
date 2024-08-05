import * as Blockly from 'blockly';
import EventType from './type'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  resource: {
    events: {
      outputs: {
        title: string;
        uuid: string;
      }[];
    }
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
  getBlock: (parameters: Parameters) => Blockly.Block;
  getLua: (parameters: { index: any }) => (block: Blockly.Block) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}
const data: Data = {
  name: 'output_event'
}
const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '输出事件 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Output',
          options: function () {
            const output = resource.events.outputs
            let opt = [['none', '']]
            output.forEach(({ title, uuid }) => {
              opt.push([title, uuid])
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
    } as Blockly.Block
    return data
  },
  getLua({ index }) {
    const lua = function (block: Blockly.Block) {
      var output_event = block.getFieldValue('Output')

      // TODO: Assemble Lua into code variable.
      var code =
        "_G.event.trigger(index,'" + output_event + "')\n"

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
