import Blockly from 'blockly'

import TriggerType from './type'

const data = {
  name: 'meta_action'
}
const block = {
  title: data.name,
  type: TriggerType.name,
  colour: TriggerType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: data.name,
      message0: '动作 %1 %2 %3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Action',
          options: function () {
            const action = resource.action
            let opt = [['none', '']]
            action.forEach(({ name, uuid }) => {
              opt.push([name, uuid])
            })
            return opt
          }
        },
        {
          type: 'input_dummy'
        },
        {
          type: 'input_statement',
          name: 'content'
        }
      ],
      colour: TriggerType.colour,
      tooltip: '',
      helpUrl: ''
    }
    return json
  },
  getBlock(parameters) {
    const data = {
      init: function () {
        const json = block.getBlockJson(parameters)
        this.jsonInit(json)
      }
    }
    return data
  },
  getLua(parameters) {
    const lua = function (block) {
      var dropdown_option = block.getFieldValue('Action')
      var statements_content = Blockly.Lua.statementToCode(block, 'content')


      var code =
        "meta['@" + dropdown_option + "'] = function(parameter) \n\
  is_playing = true\n\
  print('" + dropdown_option + "')\n\
" + statements_content + '\n\
  is_playing = false\n\
end\n'

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
