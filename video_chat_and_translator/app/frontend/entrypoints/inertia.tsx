import { createInertiaApp } from '@inertiajs/react'
import { createElement } from 'react'
import AppLayout from '../layouts/AppLayout'

const pages = import.meta.glob('../pages/**/*.tsx', { eager: true }) as Record<
  string,
  { default: React.ComponentType & { layout?: (page: React.ReactNode) => React.ReactNode } }
>

void createInertiaApp({
  resolve: (name) => {
    const page = pages[`../pages/${name}.tsx`]
    if (page && page.default && !page.default.layout) {
      page.default.layout = (page: React.ReactNode) => createElement(AppLayout, null, page)
    }
    return page
  },

  strictMode: true,

  defaults: {
    form: {
      forceIndicesArrayFormatInFormData: false,
      withAllErrors: true,
    },
    visitOptions: () => {
      return { queryStringArrayFormat: "brackets" }
    },
  },
}).catch((error) => {
  // This ensures this entrypoint is only loaded on Inertia pages
  // by checking for the presence of the root element (#app by default).
  // Feel free to remove this `catch` if you don't need it.
  if (document.getElementById("app")) {
    throw error
  } else {
    console.error(
      "Missing root element.\n\n" +
      "If you see this error, it probably means you loaded Inertia.js on non-Inertia pages.\n" +
      'Consider moving <%= vite_typescript_tag "inertia.tsx" %> to the Inertia-specific layout instead.',
    )
  }
})
