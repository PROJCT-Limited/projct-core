import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'onhood8r',
    dataset: 'production'
  },
  deployment: {
    appId: 'k5yn0kwyzs224yztu0g0fcy9',
    autoUpdates: true,
  },
  typegen: {
    path: './src/**/*.{ts,tsx,js,jsx}',
    schema: './src/sanity/extract.json',
    generates: './src/sanity/types.ts'
  },
})
