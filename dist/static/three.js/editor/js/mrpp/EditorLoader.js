import * as THREE from 'three'

import { SceneCreater } from './SceneCreater.js'
function EditorLoader(editor) {
	const scope = this
	const creater = new SceneCreater(editor)

	this.load = function (input) {
		console.error(input)

		const data = JSON.parse(input.data)

		console.error(data)
		console.error(input.resources)

		editor.clear()
		creater
			.loadResources(input.resources)
			.then(resources => {
				creater.draw(data, resources)
			})
			.catch(error => {
				alert(error)
			})
	}
}
export { EditorLoader }
