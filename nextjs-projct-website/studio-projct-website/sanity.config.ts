import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {presentationTool} from 'sanity/presentation'
import {schemaTypes} from './schemaTypes'
import {resolve} from './presentation/resolve'

const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN || 'https://www.projct.co'

export default defineConfig({
  name: 'default',
  title: 'PROJCT Studio',

  projectId: 'onhood8r',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
    presentationTool({
      resolve,
      previewUrl: {
        origin: previewOrigin,
        preview: '/index3.html',
      },
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
