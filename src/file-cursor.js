import fs from 'fs'
import Promise from 'bluebird'

Promise.promisifyAll(fs)

const createSlicedBufferArray = (buffer, chunkSize) => {

    // So, buffers are weird, for performance reasons. When we slice a buffer we actually
    // aren't copying any underlying data, we're just making a new reference to it. SO,
    // we only need to make these arrays once, and then just copy data into the two
    // parent buffers.

    if (buffer.length % chunkSize != 0) {
        throw new Error("Buffer is not cleanly divisible by chunk size. It needs to be.")
    }

    let sliced = []
    for (let x = 0; x < buffer.length; x = x + chunkSize) {
        sliced.push(buffer.slice(x, x + chunkSize))
    }
    return sliced
}

export default class FileCursor {
    constructor(opts) {
        Object.assign(this, opts)

        this._offset = -1
        this._readOffset = 0
        this._buffer = new Buffer(this.chunkSize * this.numberOfChunks)
        this._bufferSlices = createSlicedBufferArray(this._buffer, this.chunkSize)

        this.getBufferSlices = this.getBufferSlices.bind(this)
    }

    loadAt(offset) {
        return fs.statAsync(this.path)
        .then(({size}) => {
            this._size = size
            if (offset >= this._size) {
                throw new FileCursor.FileCompleteError()
            }
            return fs.openAsync(this.path, "rs")
        })
        .then((fd) =>
            fs.readAsync(fd, this._buffer, 0, this._buffer.length, offset)
            .then(() => {
                this._offset = offset
                this._readOffset = 0
                return fs.closeAsync(fd)
            })
        )
    }

    shiftBy(i) {
        this._readOffset += i
    }

    getBufferSlices() {
        let slicesToReturn = []
        let bufferLengthSoFar = this._offset

        for (let i = this._readOffset; i < this._bufferSlices.length; i++) {
            let slice = this._bufferSlices[i]

            if (bufferLengthSoFar + slice.length > this._size) {

                // This slice actually goes beyond the end of the file. We want to
                // cut it short.
                slice = slice.slice(0, this._size - bufferLengthSoFar)
            }

            slicesToReturn.push(slice)
            bufferLengthSoFar += slice.length
            if (bufferLengthSoFar === this._size) {
                break
            }

        }

        return Promise.resolve(slicesToReturn)
    }

    get fileSize() {
        return this._size
    }

    // copy(destinationCursor) {
    //     if (destinationCursor.chunkSize !== this.chunkSize) {
    //         throw new Error("Cursors have different chunk sizes")
    //     }
    //     if (destinationCursor.numberOfChunks !== this.numberOfChunks) {
    //         throw new Error("Cursors have different chunk numbers")
    //     }
    //
    //     this._buffer.copy(destinationCursor._buffer)
    //     destinationCursor._offset = this._offset
    //     destinationCursor._size = this._size
    //     destinationCursor.path = this.path
    // }
}

FileCursor.FileCompleteError = class extends Error {
    get message() {
        return "Passed the end of the file."
    }
}
