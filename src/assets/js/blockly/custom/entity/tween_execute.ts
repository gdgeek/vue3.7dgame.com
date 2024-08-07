import DataType from './type'

import * as Blockly from 'blockly';
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
  inputsInline: true,
  previousStatement: any,
  nextStatement: any,
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
  name: 'tween_execute'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ }) {
    const json: BlockJson = {
      type: data.name,
      message0: '实体 %1 经过 %2 秒移动到 %3 %4 同步 %5 独占 %6',
      args0: [
        {
          type: 'input_value',
          name: 'entity',
          check: 'Entity'
        },
        {
          type: 'field_number',
          name: 'time',
          value: 0.3,
          min: 0,
          max: 1000
        },
        {
          type: 'input_dummy'
        },
        {
          type: 'input_value',
          name: 'transform',
          check: 'Transform'
        },
        {
          type: 'field_checkbox',
          name: 'sync',
          checked: true
        },
        {
          type: 'field_checkbox',
          name: 'occupy',
          checked: true
        }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
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
    } as Blockly.BlockSvg;
    return data
  },
  getLua({ }) {
    const lua = function (block: Blockly.BlockSvg) {
      var entity = luaGeneratorInstance.valueToCode(
        block,
        'entity',
        order.ATOMIC
      )
      var time = block.getFieldValue('time')
      var transform = luaGeneratorInstance.valueToCode(
        block,
        'transform',
        order.ATOMIC
      )

      var sync = block.getFieldValue('sync') === 'TRUE'
      var occupy = block.getFieldValue('sync') === 'TRUE'

      var parameter =
        entity + ', ' + time + ', ' + transform + ', ' + JSON.stringify(occupy)
      if (sync) {
        return '_G.point.sync_tween(' + parameter + ')\n'
      } else {
        return '_G.point.tween(' + parameter + ')\n'
      }
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
