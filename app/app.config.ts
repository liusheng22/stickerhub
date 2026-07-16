export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      secondary: 'emerald',
      neutral: 'zinc',
    },
    icons: {
      search: 'i-lucide-search',
      menu: 'i-lucide-menu',
      close: 'i-lucide-x',
      arrowRight: 'i-lucide-arrow-right',
      arrowLeft: 'i-lucide-arrow-left',
      external: 'i-lucide-arrow-up-right',
    },
    button: {
      slots: {
        base: 'min-h-11 rounded-[6px] font-bold transition-[transform,box-shadow,background-color,border-color] duration-200',
      },
      defaultVariants: {
        size: 'md',
      },
    },
    input: {
      slots: {
        base: 'min-h-11 rounded-[6px]',
      },
    },
    card: {
      slots: {
        root: 'rounded-[8px]',
      },
    },
  },
})
