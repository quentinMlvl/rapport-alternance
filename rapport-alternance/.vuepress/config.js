
const presentationItems = [
  { text: 'Présentation', link: '/presentation/' },
  { text: 'Application existante', link: '/presentation/existant' },
]

const ameliorationItems = [
  { text: 'Améliorations apportées', link: '/ameliorations/' },
  { text: 'FileAPI', link: '/ameliorations/fileAPI' },
  { text: 'Finalisations', link: '/ameliorations/finalisations' },
]

module.exports = {
    title: 'Rapport Alternance',
    description: 'Rapport Alternance SIG 2020/2021',
    configureWebpack: {
        resolve: {
          extensions: ['.jpg', '.png'],
        }
    },
    themeConfig: {
        nav: [
            { text: 'Accueil', link: '/' },
            { text: 'Présentation', items: presentationItems },
            { text: 'Améliorations', items: ameliorationItems },
            { text: 'Conclusion', link: '/conclusion/' }

        ],
        sidebar: 'auto'
    },
    plugins: [
        [
          'vuepress-plugin-clean-urls',
          {
            normalSuffix: '/',
            indexSuffix: '/',
            notFoundPath: '/404.html',
          },
        ]
      ],
  }