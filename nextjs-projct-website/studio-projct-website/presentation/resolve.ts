import {defineLocations, PresentationPluginOptions} from 'sanity/presentation'

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    caseStudy: defineLocations({
      select: {title: 'title'},
      resolve: (doc) => ({
        locations: [
          {title: doc?.title || 'Untitled', href: '/index3.html'},
        ],
      }),
    }),
  },
}
