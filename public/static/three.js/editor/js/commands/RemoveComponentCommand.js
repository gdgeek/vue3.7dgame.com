import { Command } from '../Command.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param component object
 * @constructor
 */
class RemoveComponentCommand extends Command {

	constructor(editor, object, component) {

		super(editor);

		this.type = 'RemoveComponentCommand';
		this.name = 'Remove Component';

		this.object = object;
		this.component = component;
		if (this.object && this.component) {
			this.index = this.object.components.indexOf(this.component);
		}

	}

	execute() {

		if (this.object.components === undefined) return;

		if (this.index !== - 1) {

			this.object.components.splice(this.index, 1);

		}

		this.editor.signals.componentRemoved.dispatch(this.component);

	}

	undo() {

		if (this.object.components === undefined) {

			this.object.components = [];

		}

		this.object.components.splice(this.index, 0, this.component);

		this.editor.signals.componentAdded.dispatch(this.component);

	}

	toJSON() {

		const output = super.toJSON(this);

		output.objectUuid = this.object.uuid;
		output.component = this.component;
		output.index = this.index;

		return output;

	}

	fromJSON(json) {

		super.fromJSON(json);

		this.component = json.component;
		this.index = json.index;
		this.object = this.editor.objectByUuid(json.objectUuid);

	}

}

export { RemoveComponentCommand };
