import DataType from './type'
const data = {
  name: 'function_execute'
}
const block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson(parameters) {
    const json = {
      type: data.name,
      message0: '执行 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'function',
          options: [
            ['redo', 'CS.MLua.Helper.Redo()'],
            ['undo', 'CS.MLua.Helper.Undo()'],
            ['boom_reset', 'CS.MLua.Helper.BoomReset(target)'],
            ['sample_reset', 'CS.MLua.Helpern.SampleReset(target)']
          ]
        }
      ],
      inputsInline: false,
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
    }
    return data
  },
  getLua(parameters) {
    const lua = function (block) {
      var dropdown_function = block.getFieldValue('function')
      // TODO: Assemble Lua into code variable.
      var code = dropdown_function + '\n'
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
