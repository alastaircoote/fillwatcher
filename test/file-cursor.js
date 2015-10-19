import FileCursor from '../src/file-cursor'
import 'should'

describe("File cursor", () => {

    let cursor = null
    beforeEach(() => {
        cursor = new FileCursor({
            path: __dirname + '/alphabet.txt',
            chunkSize: 1,
            numberOfChunks: 5
        })
    })
    it("returns chunks at right offset", () => {

        return cursor.loadAt(0)
        .then(cursor.getBufferSlices)
        .then((slices) => {
            slices.length.should.equal(5)
            let letters = 'abcde'
            slices.forEach((slice, i) => {
                slice.toString('utf-8').should.equal(letters[i])
            })

        })

    })

    it("should move successfully", (done) => {

        cursor.loadAt(1)
        .then(cursor.getBufferSlices)
        .then((slices) => {
            slices.length.should.equal(5)
            let letters = 'bcdef'
            slices.forEach((slice, i) => {
                slice.toString('utf-8').should.equal(letters[i])
            })
            done()
        })
        .catch((err) => done(err))
    })

    it ("should cut short when reaching end of file", (done) => {
        cursor.loadAt(23)
        .then(cursor.getBufferSlices)
        .then((slices) => {
            slices.length.should.equal(3)
            done()
        })
        .catch((err) => done(err))
    })

    it ("should shift",(done) => {
        cursor.loadAt(0)
        .then(() => {
            cursor.shiftBy(1)
            return cursor.getBufferSlices()
        })
        .then((slices) => {
            slices.length.should.equal(4)
            slices[0].toString().should.equal('b')
            done()
        })
    })

    

})

describe("File cursor with larger slices", () => {
    let cursor = null

    beforeEach(() => {
        cursor = new FileCursor({
            path: __dirname + '/alphabet.txt',
            chunkSize: 5,
            numberOfChunks: 5
        })
    })

    it("should cut chunks short at the end of the file", (done) => {
        cursor.loadAt(5)
        .then(cursor.getBufferSlices)
        .then((slices) => {
            slices.length.should.equal(5)

            slices[4].length.should.equal(1)
            done()

        })
        .catch((err) => done(err))
    })

    it("should cut array short as above", (done) => {
        cursor.loadAt(15)
        .then(cursor.getBufferSlices)
        .then((slices) => {
            slices.length.should.equal(3)
            done()
        })
        .catch((err) => done(err))
    })
})
