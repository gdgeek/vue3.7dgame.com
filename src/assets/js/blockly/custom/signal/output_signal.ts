import * as Blockly from 'blockly';
import EventType from './type'
// import Helper from '../helper'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator();

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  resource: {
    events: {
      inputs: {
        title: string;
        index: any;
        uuid: string;
      }[]
    };
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
  getLua: (parameters: { index: any }) => (block: Blockly.BlockSvg) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'output_signal'
}

const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '触发信号 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Output',
          options: function () {
            const output = resource.events.inputs
            let opt = [['none', JSON.stringify({ index: "", uuid: "" })]]
            output.forEach(({ title, index, uuid }) => {
              // alert(JSON.stringify({ index, uuid }))
              opt.push([title, JSON.stringify({ index, uuid })])
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
    } as Blockly.BlockSvg
    return data
  },
  getLua({ index }) {
    const lua = function (block: Blockly.BlockSvg) {
      var output_event = block.getFieldValue('Output')
      const data = JSON.parse(output_event)
      //alert(JSON.stringify(data))
      var code = "_G.event.signal('" + data.index + "', '" + data.uuid + "')\n"
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
