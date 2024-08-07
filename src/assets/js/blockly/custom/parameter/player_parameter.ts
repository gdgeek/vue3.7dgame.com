import * as Blockly from 'blockly';
import EventType from './type'
// import Helper from '../helper'
import { player } from '../argument'
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
  name: 'player_parameter'
}

const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '玩家 %1 ,参数 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PlayerType',
          options: [
            ['索引', 'index'],
            ['Id', 'id'],
            ['服务器', 'server'],
            ['随机客户', 'random_client']
          ]
        },
        {
          type: 'input_value',
          name: 'Player',
          check: 'Number'
        }
      ],
      inputsInline: true,
      output: 'Parameter',
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
      var type = block.getFieldValue('PlayerType')

      var id = luaGeneratorInstance.valueToCode(
        block,
        'Player',
        Order.ATOMIC
      )

      return [player(type, id), Order.NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
