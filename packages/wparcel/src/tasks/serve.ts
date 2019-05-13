import _ from 'lodash'
import Rx from 'rxjs/Rx'
import WebpackDevServer from 'webpack-dev-server'
import openBrowser from 'react-dev-utils/openBrowser'
import getLocalIP from '../utils/getLocalIP'
import { toErrorOutputString } from '../helpers/helpers'
import devServerConfig from '../webpackDevServer.config'
import { TASK_STATUS } from '../constants'
import { initCompiler } from '../helpers/webpack'

const localIP = getLocalIP()

// const CONFIG_FALLBACK_CHAIN = [
//   'jellyweb.config.dev.js',
//   'jellyweb.config.js',
//   'jellyweb.config.prod.js',
//   'webpack.config.dev.js',
//   'webpack.config.js',
//   'webpack.config.prod.js',
// ]

interface ServeConfig {
  port?: number
  configFilePath?: string
  openBrowser?: boolean
  entryFilePath: string
}

const defaultConfig = {
  port: 4006,
  shouldOpenBrowser: false,
}

const serve = (config: ServeConfig) => {
  const finalConfig = {
    ...defaultConfig,
    ...config,
  }
  const { port, configFilePath, shouldOpenBrowser, entryFilePath } = finalConfig

  const startDevServer = ({
    onChangeStart,
    onChangeComplete,
    onChangeError,
  }) => {
    let isFirstCompile = true
    const { compiler } = initCompiler({
      webpackEnv: 'development',
      configFilePath,
      entryFilePath,
    })

    compiler.hooks.done.tap('invalid', () => {
      onChangeStart()
    })

    compiler.hooks.done.tap('done', stats => {
      if (stats.hasErrors()) {
        onChangeError(toErrorOutputString(stats))
      } else {
        const serverAddr = `http://localhost:${port}/`
        const networkAddr =
          localIP !== 'localhost' ? `http://${localIP}:${port}/` : 'N/A'
        onChangeComplete(`
Local:     ${serverAddr}
Network:   ${networkAddr}
`)

        if (isFirstCompile) {
          isFirstCompile = false
          if (shouldOpenBrowser) {
            openBrowser(serverAddr)
          }
        }
      }
    })

    const devServerInstance = new WebpackDevServer(
      compiler,
      devServerConfig as WebpackDevServer.Configuration
    )
    // Launch WebpackDevServer
    devServerInstance.listen(port, (err /* , result */) => {
      if (err) {
        onChangeError(err)
      }
    })
  }

  return Rx.Observable.create(observer => {
    startDevServer({
      onChangeStart: () =>
        observer.next({
          type: TASK_STATUS.CHANGE_START,
        }),
      onChangeComplete: output =>
        observer.next({
          type: TASK_STATUS.CHANGE_COMPLETE,
          payload: output,
        }),
      onChangeError: error =>
        observer.next({
          type: TASK_STATUS.CHANGE_ERROR,
          payload: error,
        }),
    })
  })
}

export default serve
