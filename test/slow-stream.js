import fs from 'fs'

export default class {
    constructor(opts) {
        this.opts = opts
        this.size = fs.statSync(opts.in).size
        //let fd = fs.openSync(opts.out,'w')
        let buffer = new Buffer(this.size).fill(0)
        fs.writeFileSync(opts.out,buffer)

        this.transferBuffer = new Buffer(this.opts.chunkSize)
        this.offset = 0
        this.doWrite()
    }

    doWrite() {
        if (this.offset >= this.size) {
            console.log("Stream complete")
            return
        }
        let writeLength = this.transferBuffer.length
        if (this.offset + writeLength > this.size) {
            writeLength = this.size - this.offset
        }
        //console.log('write at', this.offset, writeLength, this.opts.chunkSize)
        let fd = fs.openSync(this.opts.in,'r')
        fs.readSync(fd, this.transferBuffer, 0, writeLength, this.offset)
        fs.closeSync(fd)

        fd = fs.openSync(this.opts.out, 'a')
        fs.writeSync(fd, this.transferBuffer, 0, writeLength, this.offset)
        fs.closeSync(fd)

        console.log("Wrote", this.offset,'-', this.offset + writeLength)
        this.offset += writeLength
        setTimeout(this.doWrite.bind(this), this.opts.interval)
    }
}
