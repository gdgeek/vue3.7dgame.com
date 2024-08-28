import { UITabbedPanel, UISpan } from './libs/ui.js'

import { SidebarScene } from './Sidebar.Scene.js'
import { SidebarProperties } from './Sidebar.Properties.js'
import { SidebarMeta } from './Sidebar.Meta.js'
import { SidebarEvents } from './Sidebar.Events.js'
import { SidebarComponent } from './Sidebar.Component.js'
import { SidebarAnimation } from './Sidebar.Animation.js'
import { SidebarProject } from './Sidebar.Project.js'
import { SidebarSettings } from './Sidebar.Settings.js'

function Sidebar(editor) {
	const strings = editor.strings

	const container = new UITabbedPanel()
	container.setId('sidebar')


	const scene = new UISpan().add(
		new SidebarScene(editor),

		new SidebarProperties(editor),
		//new SidebarAnimation(editor)
	)

	if (editor.type.toLowerCase() == 'meta') {
		scene.add(new SidebarComponent(editor))
		scene.add(new SidebarEvents(editor))
	} else if (editor.type.toLowerCase() == 'verse') {
		scene.add(new SidebarMeta(editor))
	}
	const project = new SidebarProject(editor)
	const settings = new SidebarSettings(editor)

	container.addTab('scene', strings.getKey('sidebar/scene'), scene)
	container.addTab('project', strings.getKey('sidebar/project'), project)
	container.addTab('settings', strings.getKey('sidebar/settings'), settings)
	container.select('scene')

	return container
}

export { Sidebar }
