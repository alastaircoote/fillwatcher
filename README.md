FillWatcher
==

A stream for use with files that pre-allocate a bunch of disk space, then fill it up.

Why?
--

Node has pipes, and pipes are great. However, in the instance of a program
(in my case, Windows Media Center) pre-allocating a file, streams don't work
correctly. It pipes beyond the *actual* end of a recording, and doesn't
double-back when the content changes.

How?
--

It's gross! We maintain a buffer (size of your choosing) and cut it up into chunks (number of your choosing). Then we compare those chunks with our cached copy, and pipe through chunks that have changed.

How can it go wrong?
--

So many ways!

 - I've barely tested this.
 - If you don't set your buffer size high enough or your check interval
   small enough, the file will be written to faster than our checker can
   verify what has changed. So you might need to tweak these values
   for your personal setup.

How do I use it?
--

Example:

    import FillWatcher from 'fillwatcher'
    import filesizeParser from 'filesize-parser'
    import fs from 'fs'

    let file = process.argv[2]

    let watcher = new FillWatcher({
        path: file,
        chunkSize: filesizeParser('1MB'),
        numberOfChunks: 10,
        readInterval: 10 // in ms
    })

    let out = fs.createWriteStream(__dirname + '/tvout')
    watcher.pipe(out)
