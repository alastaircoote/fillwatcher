import FillWatcher from '../src/fill-watcher'
import FileCursor from '../src/file-cursor'
import fs from 'fs'

describe("Fill watcher", () => {

    let watcher = null
    let filePath = __dirname + '/test.txt'

    beforeEach(() => {
        fs.writeFileSync(filePath,"abcdefghijkl")
        watcher = new FillWatcher({
            path: filePath,
            chunkSize: 1,
            numberOfChunks: 8,
            readInterval: 10
        })
    })

    afterEach(() => {
        fs.unlinkSync(filePath)
    })


    it("should return no chunks when nothing has changed", (done) => {
        watcher.initialLoad()
        .then(() => watcher.getNewChunks())
        .then((chunks) => {
            chunks.length.should.equal(0)
            done()
        })
    })

    it("should return chunks when something has changed", (done) => {
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCdefghijkl")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            chunks.length.should.equal(2)
            chunks[0].toString().should.equal('A')
            chunks[1].toString().should.equal('B')
            done()
        })
        .catch((err) => done(err))
    })

    it("should throw an error when all available data has changed", (done) => {
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCDEFGHijkl")
            return watcher.getNewChunks()
        })
        .catch(FillWatcher.NotEnoughDataError, (err) => {
            done()
        })
        .catch((err) => done(err))
    })

    it("should throw an error when all but last two chunks have changed", (done) => {
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCDEFghijkl")
            return watcher.getNewChunks()
        })
        .catch(FillWatcher.NotEnoughDataError, (err) => {
            done()
        })
        .catch((err) => done(err))
    })



    it("should NOT throw an error when the chunks are actually the end of the file", (done) => {
        fs.writeFileSync(filePath,"abcdefgh")
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCDEFGH")
            return watcher.getNewChunks()
        })

        .then((chunks) => {
            chunks.length.should.equal(8)
            done()
        })
        .catch((err) => done(err))

    })

    it("should throw an error when trying to read after end of file", (done) => {
        fs.writeFileSync(filePath,"abcdefgh")
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCDEFGH")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            console.log(chunks.length)
            return watcher.getNewChunks()
        })
        .catch(FileCursor.FileCompleteError, (err) => done())
        .catch((err) => done(err))
    })

    it("should track offset", (done) => {
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCdefghijkl")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            chunks.length.should.equal(2)
            fs.writeFileSync(filePath,"ABCDEfghijkl")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            chunks.length.should.equal(2)
            chunks[0].toString().should.equal("C")
            done()
        })
        .catch((err) => done(err))
    })

    it("should track offset multiple times", (done) => {
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCdefghijkl")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            fs.writeFileSync(filePath,"ABCDEfghijkl")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            fs.writeFileSync(filePath,"ABCDEFGHijkl")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            chunks.length.should.equal(3)
            chunks[0].toString().should.equal("E")
            done()
        })
        .catch((err) => done(err))
    })

    it("should handle a file ending a lot smaller than it started", (done) => {
        fs.writeFileSync(filePath,"abcdefghijklmnopqrstuvwxyz")
        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCdefghijklmnopqrstuvwxyz")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            fs.writeFileSync(filePath,"ABCDEfghijklmnopqrstuvwxyz")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            fs.writeFileSync(filePath,"ABCDEFGHIJKL")
            return watcher.getNewChunks()
        })
        .then((chunks) => {
            chunks.length.should.equal(8)
            chunks[0].toString().should.equal("E")
            return watcher.getNewChunks()
        })
        .catch(FileCursor.FileCompleteError, () => {
            done()
        })
        .catch((err) => done(err))
    })

    xit("should stream", (done) => {
        let letter = ['A','B']
        let currentLetter = -1
        watcher.on('data', (buff) => {
            currentLetter++
            buff.toString().should.equal(letter[currentLetter])
            if (currentLetter === letter.length - 1) done()
        })

        fs.writeFileSync()

        watcher.initialLoad()
        .then(() => {
            fs.writeFileSync(filePath,"ABCdefghijkl")
            watcher._read()
        })
        .catch((err) => done(err))
    })

    it("should send stream end instruction", (done) => {
        let outFilePath = __dirname + "/outtest"
        let stream = fs.createWriteStream(outFilePath)

        watcher.on('end', () => {
            fs.unlinkSync(outFilePath)
            done()
        })

        watcher.pipe(stream)
        setTimeout(() => {
            fs.writeFileSync(filePath,"ABCdefghijkl")
        },20)

        setTimeout(() => {
            fs.writeFileSync(filePath,"ABCDEFghijkl")
        },40)

        setTimeout(() => {
            fs.writeFileSync(filePath,"ABCDEFGHijkl")
        },60)

        setTimeout(() => {
            fs.writeFileSync(filePath,"ABCDEFGHIJKL")
        },80)

    })
})
