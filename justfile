# build in dev mode
dev:
  pnpm run dev

# build in production mode
build:
  @echo 'Building!'

# watch for changes and copy to Obsidian vault
watch:
  @echo 'Watching for changes...'
  watchexec --no-vcs-ignore --exts "js,json,css" cp main.js manifest.json ~/Documents/ObsidianVault/.obsidian/plugins/devam/
