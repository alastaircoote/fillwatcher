import FileCursor from './file-cursor'
import {Readable} from 'stream'
import Promise from 'bluebird'

const DEFAULT_OPTIONS = {
    chunkSize: 500000,
    numberOfChunks: 100,
    readInterval: 500
}

export default class FillWatcher extends Readable {

    constructor(opts) {
        super()
        this._opts = opts
        this.storeCursor = new FileCursor(opts)
        this.watchCursor = new FileCursor(opts)
        this._offset = -1

        this.streamTrigger = this.streamTrigger.bind(this)
    }

    getNewChunks() {
        // if (this._offset === -1) {
        //     return this.initialLoad()
        //     .then(() => {
        //         // Because we've literally just loaded our store version, there's no
        //         // point doing the check now.
        //         console.log("returning initial load array")
        //         return []
        //     })
        // }
        console.log('checking', this._offset, '-', this._offset + this.watchCursor._buffer.length)

        return this.watchCursor.loadAt(this._offset)
        .then(() => Promise.all([
            this.watchCursor.getBufferSlices(),
            this.storeCursor.getBufferSlices()
        ]))

        .spread((watchChunks, storeChunks) => {
            //console.info("Loaded at", this._offset, watchChunks.map((c) => c.toString()).join(""), storeChunks.map((c) => c.toString()).join(""), this.storeCursor.fileSize)
            let allChunkLength = watchChunks.reduce(((prev, curr) => prev + curr.length),0)
            let thisGoesToEndOfFile = this._offset + allChunkLength === this.watchCursor.fileSize

            for (let i = 0; i < storeChunks.length; i++) {

                if (thisGoesToEndOfFile && !watchChunks[i]) {
                    // Not sure why this happens. But sometimes the storeChunks array
                    // is 1 greater than the watchChunks one.
                    continue
                }


                let isMatch = watchChunks[i].equals(storeChunks[i])
                //console.log(watchChunks[i].toString(), storeChunks[i].toString(), isMatch)


                if (isMatch === false) {
                    // This block has changed. But it might not be the last changed block,
                    // and it might only be half full. So we need to do additional checks.
                    continue
                }
                /*if (i === 1) {
                    // no new data this early - no point continuing to check. Exit.
                    return []
                } else */ if (i >= watchChunks.length - 3 && !thisGoesToEndOfFile) {
                    // We need to have some more chunks to test against later.
                    throw new FillWatcher.NotEnoughDataError()
                } else if (i >= 2) {

                    // We know that the chunk before this one is different, but it might
                    // only be half full. So we can only say for sure that the chunk before
                    // THAT one is complete. So we return everything up until there.

                    return watchChunks.slice(0, i - 2)
                }
            }
            if (thisGoesToEndOfFile) {

                // Special case - normally every bit of the data having changed is a problem
                // but if we're at the end of the file then it's actually fine.

                return watchChunks
            } else {
                // If we've reached the end and all the data has changed we throw an error
                throw new FillWatcher.NotEnoughDataError()
            }


        })
        .then((chunks) => {
            this.watchCursor.shiftBy(chunks.length)
            this._offset += chunks.reduce(((prev, cur) => prev + cur.length), 0)

            // We swap them over, so that our watch becomes our store, and our
            // store becomes our watch.
            let swap = this.watchCursor
            this.watchCursor = this.storeCursor
            this.storeCursor = swap

            return chunks
        })
        // .catch((err) => {
        //     console.log("err?",err)
        //     throw err
        // })
    }

    initialLoad() {
        return this.storeCursor.loadAt(0)
        .then(() => {
            this._offset = 0
        })
        .catch((err) => console.log('initial', err))
    }

    streamTrigger() {
        this._readTimeout = null
        this.getNewChunks()

        .each((chunk) => {
            this.push(chunk)
        })
        .then((chunks) => {

            if (chunks.length === 0) {
                console.log("No new chunks")
                // If we didn't send any chunks then the stream won't retrigger _read
                // itself, so we have to do it manually this time.
                this._read()
            } else {
                console.log("Pushed", chunks.length, "chunks")
            }
        })
        .catch(FileCursor.FileCompleteError, () => {
            // File is done.
            this.push(null)
        })

    }

    _read() {
        if (this._readTimeout) return

        let setReadTimeout = () => (
            this._readTimeout = setTimeout(this.streamTrigger, this._opts.readInterval)
        )
        if (this._offset === -1) {
            this.initialLoad()
            .then(() => setReadTimeout())
        } else {
            setReadTimeout()
        }

    }

}

FillWatcher.NotEnoughDataError = class extends Error {
    get message() {
        return "Not enough data in buffer to verify next chunks. File is being written too fast!"
    }
}
