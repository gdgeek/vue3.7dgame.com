import { UIPanel, UISelect, UINumber, UIBreak, UICheckbox, UIText, UIButton, UIRow, UIInput, UIHorizontalRule } from '../../libs/ui.js';

import { SetValueCommand } from '../../commands/SetValueCommand.js';
class TriggerComponent {

  constructor(editor, object, component) {

    this.editor = editor;
    const node = editor.scene;
    const types = ['Voxel', 'Polygen']
    this.list = []
    node.traverse((child) => {
      if (types.includes(child.type) && child.uuid != object.uuid) {
        this.list.push(child)
      }

    })
    console.error(this.list)
    this.object = object;
    this.component = component;

  }
  static Create() {
    const component = {
      type: 'Trigger',
      parameters: {
        uuid: THREE.MathUtils.generateUUID(),
        target: null,
        action: '',
      }
    }
    return component;
  }


  refresh(container) {

    container.add(new UIBreak())
    container.add(new UIBreak())
    const strings = this.editor.strings;
    {
      const row = new UIRow()

      this.uuid = new UIInput().setWidth('150px').setFontSize('12px').setDisabled(true);
      this.uuid.setValue(this.component.parameters.uuid)
      row.add(new UIText(strings.getKey('sidebar/geometry/uuid')).setWidth('90px'));

      row.add(this.uuid);
      container.add(row)
    }

    {
      const row = new UIRow()

      this.action = new UIInput().setWidth('150px').setFontSize('12px').setDisabled(false)
        .onChange(this.update.bind(this));
      this.action.setValue(this.component.parameters.action);
      row.add(new UIText("action").setWidth('90px'));
      row.add(this.action);
      container.add(row)

    }
    {
      const row = new UIRow()
      // 创建下拉框
      this.select = new UISelect().setWidth('150px');

      const options = [];

      this.list.forEach(item => {
        options[item.uuid] = item.name
      })
      this.select.setOptions(options);
      this.select.setValue(this.component.parameters.target)
      this.select.onChange(this.update.bind(this));/*.onChange(function () { // 下拉框选项改变时触发的事件
      console.log('Selected option:', select.getValue());
    });*/
      row.add(new UIText("select").setWidth('90px'));
      row.add(this.select)
      container.add(row);
    }

  }
  update() {
    this.editor.execute(new SetValueCommand(this.editor, this.component.parameters, 'target', this.select.getValue()));



    this.editor.execute(new SetValueCommand(
      this.editor,
      this.component.parameters,
      'action',
      this.action.getValue()
    ))

    self.editor.signals.componentChanged.dispatch(this.component);


  }
  renderer(container) {

    this.refresh(container);
    //this.updateUI();
  }
}
export { TriggerComponent };
