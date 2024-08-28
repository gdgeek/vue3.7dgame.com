import { Command } from '../Command.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param script javascript object
 * @constructor
 */
class AddComponentCommand extends Command {

	constructor(editor, object, component) {

		super(editor);

		this.type = 'AddComponentCommand';
		this.name = 'Add Component';

		this.object = object;
		this.component = component;

	}

	execute() {

		if (this.object.components === undefined) {

			this.object.components = [];

		}

		this.object.components.push(this.component);

		this.editor.signals.componentAdded.dispatch(this.component);

	}

	undo() {

		if (this.object.components[this.object.uuid] === undefined) return;

		const index = this.object.components.indexOf(this.component);

		if (index !== - 1) {

			this.object.components.splice(index, 1);

		}

		this.editor.signals.componentRemoved.dispatch(this.component);

	}

	toJSON() {

		const output = super.toJSON(this);

		output.objectUuid = this.object.uuid;
		output.component = this.component;

		return output;

	}

	fromJSON(json) {

		super.fromJSON(json);

		this.component = json.component;
		this.object = this.editor.objectByUuid(json.objectUuid);

	}

}

export { AddComponentCommand };
