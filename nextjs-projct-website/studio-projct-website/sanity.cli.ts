import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'onhood8r',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  typegen: {
    path: './src/**/*.{ts,tsx,js,jsx}',
    schema: './src/sanity/extract.json',
    generates: './src/sanity/types.ts'
  },
})
