import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// Draft preview (Presentation tool) is dormant until a Vercel preview
// deployment is set up at preview.projct.co. See DEPLOY.md to re-enable.

export default defineConfig({
  name: 'default',
  title: 'PROJCT Studio',

  projectId: 'onhood8r',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
