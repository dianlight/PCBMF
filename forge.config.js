module.exports = {
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
              repository: {
                owner: 'dianlight',
                name: 'PCBMF'
              },
              prerelease: true
            }
        }
    ]
}