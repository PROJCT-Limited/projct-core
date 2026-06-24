import {defineType, defineField, defineArrayMember} from 'sanity'

export const indexPageType = defineType({
  name: 'indexPage',
  title: 'Index Page',
  type: 'document',
  fields: [
    defineField({
      name: 'shortIntro',
      title: 'Short Description',
      type: 'text',
      rows: 2,
      description: 'Brief text shown on initial reveal',
    }),
    defineField({
      name: 'expandedIntro',
      title: 'Expanded Introduction',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'featured',
      title: 'Featured Case Studies',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'caseStudy'}],
        }),
      ],
      description: 'Case studies highlighted when "Featured" filter is active',
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Index Page'}
    },
  },
})
