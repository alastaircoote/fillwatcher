import SlowStream from './slow-stream'
import FillWatcher from '../src/fill-watcher'
import fs from 'fs'

xdescribe("Streaming with a real life", (done) => {
    it.only("works", () => {
        let slowStream = new SlowStream({
            in: __dirname + '/CNN.wtv',
            out: __dirname + "/slowstream",
            chunkSize: 5000 * 100,
            interval: 100
        })

        let watcher = new FillWatcher({
            path: __dirname + "/slowstream",
            chunkSize: 5000,
            numberOfChunks: 200,
            readInterval: 10
        })

        let finalOut = fs.createWriteStream(__dirname + "/finalout")
        watcher.pipe(finalOut)
        watcher.on('end', () => {
            console.log('end?')
        })
    })
})
