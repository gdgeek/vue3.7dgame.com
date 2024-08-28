import { UIPanel, UINumber, UIBreak, UIText, UIButton, UIRow, UIInput, UIHorizontalRule } from '../../libs/ui.js';
import { RemoveComponentCommand } from '../../commands/RemoveComponentCommand.js';
import { SetComponentValueCommand } from '../../commands/SetComponentValueCommand.js';
import { SetValueCommand } from '../../commands/SetValueCommand.js';
class RotateComponent {

  constructor(editor, object, component) {

    this.editor = editor;
    this.object = object;
    this.component = component;

  }
  static Create() {
    const component = {
      type: 'Rotate',
      parameters: {
        uuid: THREE.MathUtils.generateUUID(),
        speed: { x: 0, y: 0, z: 0 }
      }
    }
    return component;
  }
  rotate(container) {

    const strings = this.editor.strings;
    this.objectRotationRow = new UIRow()
    this.objectRotationX = new UINumber()
      .setStep(10)
      .setNudge(0.1)
      .setUnit('°')
      .setWidth('50px')
      .onChange(this.update.bind(this))
    this.objectRotationY = new UINumber()
      .setStep(10)
      .setNudge(0.1)
      .setUnit('°')
      .setWidth('50px')
      .onChange(this.update.bind(this))
    this.objectRotationZ = new UINumber()
      .setStep(10)
      .setNudge(0.1)
      .setUnit('°')
      .setWidth('50px')
      .onChange(this.update.bind(this))

    this.objectRotationRow.add(
      new UIText(strings.getKey('sidebar/object/rotation')).setWidth('90px')
    )
    this.objectRotationRow.add(this.objectRotationX, this.objectRotationY, this.objectRotationZ)

    container.add(this.objectRotationRow)
  }
  update() {

    const newRotation = new THREE.Euler(
      this.objectRotationX.getValue(),
      this.objectRotationY.getValue(),
      this.objectRotationZ.getValue()
    )
    const oldRotation = new THREE.Euler(
      this.component.parameters.speed.x,
      this.component.parameters.speed.y,
      this.component.parameters.speed.z
    )
    if (
      new THREE.Vector3()
        .setFromEuler(oldRotation)
        .distanceTo(new THREE.Vector3().setFromEuler(newRotation)) >= 0.01
    ) {
      const self = this;
      const proxyHandler = {
        set(target, prop, value) {
          if (prop == 'speed') {
            target[prop] = { x: value.x, y: value.y, z: value.z }

          } else {
            target[prop] = value;
          }
          self.updateUI();

          self.editor.signals.componentChanged.dispatch(this.component);
          //self.refresh()
          return true;
        },
      };
      const proxy = new Proxy(this.component.parameters, proxyHandler)

      const command = new SetValueCommand(
        this.editor,
        proxy,
        'speed',
        newRotation
      )

      this.editor.execute(command)
      console.error(this.component.parameters)
    }

  }
  updateUI() {

    this.objectRotationX.setValue(this.component.parameters.speed.x)
    this.objectRotationY.setValue(this.component.parameters.speed.y)
    this.objectRotationZ.setValue(this.component.parameters.speed.z)

  }
  renderer(container) {

    this.rotate(container);
    this.updateUI();
  }

}
export { RotateComponent };
