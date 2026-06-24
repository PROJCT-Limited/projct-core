import {defineType, defineField, defineArrayMember} from 'sanity'

export const caseStudyType = defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  fields: [
    // ── Index listing / header band ──
    defineField({
      name: 'title',
      title: 'Index Title',
      type: 'string',
      description: 'Title shown in the index list, e.g. "Community Activation | Lightbox Gallery"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'headline',
      title: 'Display Headline',
      type: 'string',
      description: 'Large headline in the header band. Use \\n for line breaks, e.g. "Community\\nActivation"',
    }),
    defineField({
      name: 'category',
      title: 'Category Eyebrow',
      type: 'string',
      description: 'Client or project name shown above the headline, e.g. "Lightbox Gallery"',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'string',
      description: 'Year or date range, e.g. "2025" or "2023–2026, Hong Kong"',
    }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 3,
      description: 'Intro paragraph shown in the header band beside the hero image',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'kicker',
      title: 'Kicker',
      type: 'string',
      description: 'Type label, e.g. "Case Study", "Interview", "Research"',
    }),
    defineField({
      name: 'role',
      title: 'PROJCT Role',
      type: 'string',
      description: 'Role description, e.g. "Strategy, Brand, Campaigns, Experiential"',
    }),
    defineField({
      name: 'collaborators',
      title: 'Collaborators',
      type: 'string',
      description: 'Partner names, e.g. "PROJCT and EJAR"',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'filterCategory',
      title: 'Filter Category',
      type: 'string',
      description: 'Primary category for the index filter bar',
      options: {
        list: [
          {title: 'Featured', value: 'Featured'},
          {title: 'Case Studies', value: 'Case-studies'},
          {title: 'Articles', value: 'Articles'},
          {title: 'Research', value: 'Research'},
          {title: 'Practice', value: 'Practice'},
        ],
        layout: 'radio',
      },
    }),

    // ── Listing controls ──
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'orderRank',
      title: 'Order Rank',
      type: 'number',
      description: 'Lower numbers appear first in the index',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),

    // ── Body (Portable Text) ──
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Lead', value: 'lead'},
          ],
          lists: [{title: 'Bullet', value: 'bullet'}],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Highlighted', value: 'highlightedText'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (rule) =>
                      rule.required().uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
                  }),
                  defineField({
                    name: 'blank',
                    type: 'boolean',
                    title: 'Open in new tab',
                    initialValue: false,
                  }),
                ],
              },
              {
                name: 'internalLink',
                type: 'object',
                title: 'Internal Link',
                fields: [
                  defineField({
                    name: 'reference',
                    type: 'reference',
                    title: 'Case Study',
                    to: [{type: 'caseStudy'}],
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          name: 'figure',
          type: 'object',
          title: 'Image',
          fields: [
            defineField({
              name: 'image',
              type: 'image',
              options: {hotspot: true},
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'caption',
              type: 'string',
              title: 'Caption',
            }),
            defineField({
              name: 'layout',
              type: 'string',
              title: 'Layout',
              options: {
                list: [
                  {title: 'Full width', value: 'full'},
                  {title: 'Inset', value: 'inset'},
                ],
                layout: 'radio',
              },
              initialValue: 'full',
            }),
          ],
          preview: {
            select: {title: 'alt', media: 'image'},
          },
        }),
        defineArrayMember({
          name: 'figurePair',
          type: 'object',
          title: 'Image Pair',
          fields: [
            defineField({
              name: 'imageLeft',
              type: 'image',
              title: 'Left Image',
              options: {hotspot: true},
              fields: [
                defineField({name: 'alt', type: 'string', title: 'Alt text'}),
              ],
            }),
            defineField({
              name: 'imageRight',
              type: 'image',
              title: 'Right Image',
              options: {hotspot: true},
              fields: [
                defineField({name: 'alt', type: 'string', title: 'Alt text'}),
              ],
            }),
            defineField({
              name: 'caption',
              type: 'string',
              title: 'Caption',
            }),
          ],
          preview: {
            select: {title: 'caption', media: 'imageLeft'},
            prepare({title, media}) {
              return {title: title || 'Image pair', media}
            },
          },
        }),
        defineArrayMember({
          name: 'gallery',
          type: 'object',
          title: 'Gallery',
          fields: [
            defineField({
              name: 'items',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'image',
                  options: {hotspot: true},
                  fields: [
                    defineField({name: 'alt', type: 'string', title: 'Alt text'}),
                    defineField({name: 'caption', type: 'string', title: 'Caption'}),
                  ],
                }),
              ],
              validation: (rule) => rule.min(1),
            }),
            defineField({
              name: 'columns',
              type: 'number',
              title: 'Columns',
              initialValue: 2,
              options: {list: [2, 3, 4]},
            }),
          ],
          preview: {
            select: {media: 'items.0'},
            prepare({media}) {
              return {title: 'Gallery', media}
            },
          },
        }),
        defineArrayMember({
          name: 'pullQuote',
          type: 'object',
          title: 'Pull Quote',
          fields: [
            defineField({
              name: 'text',
              type: 'text',
              title: 'Quote',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'attribution',
              type: 'string',
              title: 'Attribution',
            }),
          ],
          preview: {
            select: {title: 'text'},
            prepare({title}) {
              return {title: title ? `"${title.slice(0, 60)}…"` : 'Pull quote'}
            },
          },
        }),
        defineArrayMember({
          name: 'embed',
          type: 'object',
          title: 'Embed',
          fields: [
            defineField({
              name: 'mode',
              type: 'string',
              title: 'Mode',
              options: {
                list: [
                  {title: 'Image (chart screenshot)', value: 'image'},
                  {title: 'Iframe (allowlisted host)', value: 'iframe'},
                ],
                layout: 'radio',
              },
              initialValue: 'image',
            }),
            defineField({
              name: 'image',
              type: 'image',
              title: 'Chart Image',
              options: {hotspot: true},
              hidden: ({parent}) => parent?.mode !== 'image',
            }),
            defineField({
              name: 'url',
              type: 'url',
              title: 'Embed URL',
              hidden: ({parent}) => parent?.mode !== 'iframe',
            }),
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
            }),
            defineField({
              name: 'caption',
              type: 'string',
              title: 'Caption',
            }),
          ],
          preview: {
            select: {title: 'caption', subtitle: 'mode', media: 'image'},
            prepare({title, subtitle, media}) {
              return {title: title || 'Embed', subtitle, media}
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
      media: 'heroImage',
    },
  },
  orderings: [
    {
      title: 'Manual order',
      name: 'orderRank',
      by: [{field: 'orderRank', direction: 'asc'}],
    },
    {
      title: 'Published date',
      name: 'publishedAt',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})
