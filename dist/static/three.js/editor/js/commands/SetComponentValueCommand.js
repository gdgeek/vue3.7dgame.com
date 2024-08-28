import { Command } from '../Command.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param script javascript object
 * @param attributeName string
 * @param newValue string, object
 * @constructor
 */
class SetComponentValueCommand extends Command {

	constructor(editor, object, component, attributeName, newValue) {

		super(editor);

		this.type = 'SetComponentValueCommand';
		this.name = `Set Component.${attributeName}`;
		this.updatable = true;

		this.object = object;
		this.component = component;

		this.attributeName = attributeName;
		this.oldValue = (component !== undefined) ? component[this.attributeName] : undefined;
		this.newValue = newValue;

	}

	execute() {

		this.component[this.attributeName] = this.newValue;

		this.editor.signals.componentChanged.dispatch(this.component);

	}

	undo() {

		this.component[this.attributeName] = this.oldValue;

		this.editor.signals.componentChanged.dispatch(this.component);

	}

	update(cmd) {

		this.newValue = cmd.newValue;

	}

	toJSON() {

		const output = super.toJSON(this);

		output.objectUuid = this.object.uuid;
		output.index = this.object.components.indexOf(this.component);
		output.attributeName = this.attributeName;
		output.oldValue = this.oldValue;
		output.newValue = this.newValue;

		return output;

	}

	fromJSON(json) {

		super.fromJSON(json);

		this.oldValue = json.oldValue;
		this.newValue = json.newValue;
		this.attributeName = json.attributeName;
		this.object = this.editor.objectByUuid(json.objectUuid);
		this.component = this.object.components[json.index];

	}

}

export { SetComponentValueCommand };
