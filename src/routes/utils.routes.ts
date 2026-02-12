import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import Elysia from 'elysia'

export const utilsRoutes = new Elysia({ prefix: '/utils' }).get(
  '/providers',
  async () => {
    const providersDir = join(import.meta.dir, '..', 'providers')
    const categories = await readdir(providersDir, { withFileTypes: true })

    const providers: Array<{
      providerName: string
      category: string
      providerTypes?: string[]
      url: string
    }> = []

    for (const categoryDir of categories) {
      if (
        !categoryDir.isDirectory() ||
        ['base', 'utils'].includes(categoryDir.name)
      ) {
        continue
      }

      const categoryPath = join(providersDir, categoryDir.name)
      const files = await readdir(categoryPath)

      for (const file of files) {
        if (!file.match(/\.(ts|js)$/)) {
          continue
        }

        try {
          const modulePath = join(categoryPath, file)
          const module = await import(modulePath)
          const ProviderClass = module.default

          if (ProviderClass) {
            const instance = new ProviderClass() as {
              name: string
              url: string
              providerType?: string[]
            }

            providers.push({
              providerName: instance.name,
              category: categoryDir.name,
              ...(instance.providerType && {
                providerTypes: instance.providerType || [],
              }),
              url: instance.url,
            })
          }
        } catch (error) {
          console.error(`Error loading provider from ${file}:`, error)
        }
      }
    }

    return providers
  },
)
