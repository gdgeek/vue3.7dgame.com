import { UIPanel, UINumber, UIBreak, UIText, UIButton, UIRow, UIInput, UIHorizontalRule } from '../../libs/ui.js';
import { RemoveComponentCommand } from '../../commands/RemoveComponentCommand.js';
import { SetComponentValueCommand } from '../../commands/SetComponentValueCommand.js';
import { SetValueCommand } from '../../commands/SetValueCommand.js';
class ActionComponent {

  constructor(editor, object, component) {

    this.editor = editor;
    this.object = object;
    this.component = component;

  }
  static Create() {
    const component = {
      type: 'Action',
      parameters: {
        uuid: THREE.MathUtils.generateUUID(),
        action: '',
        parameter: ''
      }
    }
    return component;
  }
  named(container) {

    container.add(new UIBreak())
    container.add(new UIBreak())
    const strings = this.editor.strings;
    {
      const row = new UIRow()

      this.uuid = new UIInput().setWidth('150px').setFontSize('12px').setDisabled(true);
      row.add(new UIText(strings.getKey('sidebar/geometry/uuid')).setWidth('90px'));
      row.add(this.uuid);
      container.add(row)
    }

    {
      const row = new UIRow()

      this.action = new UIInput().setWidth('150px').setFontSize('12px').setDisabled(false)
        .onChange(this.update.bind(this));

      row.add(new UIText("action").setWidth('90px'));
      row.add(this.action);
      container.add(row)

    }
  }
  update() {

    const action = this.action.getValue();

    const command = new SetValueCommand(
      this.editor,
      this.component.parameters,
      'action',
      action
    )

    this.editor.execute(command)

    self.editor.signals.componentChanged.dispatch(this.component);

  }
  updateUI() {
    this.uuid.setValue(this.component.parameters.uuid);
    this.action.setValue(this.component.parameters.action);
    // this.objectRotationX.setValue(this.component.parameters.speed.x)
    //this.objectRotationY.setValue(this.component.parameters.speed.y)
    //this.objectRotationZ.setValue(this.component.parameters.speed.z)

  }
  renderer(container) {

    this.named(container);
    this.updateUI();
  }

}
export { ActionComponent };
