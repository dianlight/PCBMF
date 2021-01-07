module.exports = {
    publishers: [{
        name: '@electron-forge/publisher-github',
        config: {
            repository: {
                owner: 'dianlight',
                name: 'PCBMF'
            },
            prerelease: true
        }
    }],
    plugins: [
        ['@electron-forge/plugin-auto-unpack-natives']
    ]
}