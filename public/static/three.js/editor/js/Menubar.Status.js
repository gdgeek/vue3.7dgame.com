import * as THREE from 'three'

import { UIPanel, UIText, UIButton } from './libs/ui.js'
import { UIBoolean } from './libs/ui.three.js'

function MenubarStatus(editor) {
	const strings = editor.strings

	const container = new UIPanel()
	container.setClass('menu right')

	const button = new UIButton('Save')
	button.onClick(function () {
		console.log(editor)

		editor.signals.sceneGraphChanged.dispatch()
		editor.signals.upload.dispatch()
		//	editor.spaceLoader.save()
		// const scene = editor.scene

		// console.log(scene)
		// console.error(scene.children)
		/*
		options.push(buildOption(camera, false))
		options.push(buildOption(scene, false))
		;(function addObjects(objects, pad) {
			for (let i = 0, l = objects.length; i < l; i++) {
				const object = objects[i]

				if (nodeStates.has(object) === false) {
					nodeStates.set(object, false)
				}

				const option = buildOption(object, true)
				option.style.paddingLeft = pad * 18 + 'px'
				options.push(option)

				if (nodeStates.get(object) === true) {
					addObjects(object.children, pad + 1)
				}
			}
		})(scene.children, 0)*/
	})

	// container.add(button)

	const autosave = new UIBoolean(
		editor.config.getKey('autosave'),
		strings.getKey('menubar/status/autosave')
	)
	autosave.text.setColor('#888')
	autosave.onChange(function () {
		const value = this.getValue()

		editor.config.setKey('autosave', value)

		if (value === true) {
			editor.signals.sceneGraphChanged.dispatch()
		}
	})
	//container.add(autosave)

	editor.signals.savingStarted.add(function () {
		autosave.text.setTextDecoration('underline')
	})

	editor.signals.savingFinished.add(function () {
		autosave.text.setTextDecoration('none')
	})

	const version = new UIText('r' + THREE.REVISION)
	version.setClass('title')
	version.setOpacity(0.5)
	container.add(version)

	return container
}

export { MenubarStatus }
