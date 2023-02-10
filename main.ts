import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	apiKey: ''
}

const apiUrl = 'https://api.openai.com/v1/completions';

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Lexidian', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// TODO: use it later to show the loading status
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Loading | Not loading');

		this.addCommand({
			id: 'lexidian-autocomplete-text',
			name: 'Autocomplete text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// get the text from the editor right before the cursor
				const text = editor.getValue();

				const fetchOptions = {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.settings.apiKey}`,
					},
					body: JSON.stringify({
						model: 'text-davinci-003',
						//queues the model to return a summary, works fine.
						prompt: text,
						temperature: 0.7,
						max_tokens: 1000,
						presence_penalty: 0.0,
						stream: true,
						// stop: ['\n'],
					}),
				};
				fetch(apiUrl, fetchOptions).then(async (response) => {
					const r = response.body;
					if (!r) throw new Error('No response body');

					const d = new TextDecoder('utf8');
					const reader = await r.getReader();
					// TODO: try different ways to get the text from the stream like sse.js
					while (true) {
						const { value, done } = await reader.read();
						if (done) {
							console.log('done');
							break;
						} else {
							const decodedString = d.decode(value);
							console.log(decodedString);
							const lines = decodedString.split('\n').filter(line => line.trim() !== '');
							for (const line of lines) {
									const message = line.replace(/^data: /, '');
									if (message === '[DONE]') {
											return; // Stream finished
									}
									try {
											const parsed = JSON.parse(message);
											editor.replaceSelection(parsed.choices[0].text);
									} catch(error) {
											console.error('Could not JSON parse stream message', message, error);
									}
							}
						}
					}
				});
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Your OpenAI API Key')
			.setDesc('You can get it from your OpenAI dashboard.')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					console.log('API key: ' + value);
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
