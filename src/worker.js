const abortcontroller = new AbortController();
const { signal } = abortcontroller;
NUMSTREAMS = 0;

const BUFFER = new Uint8Array(1024 * 1024 * 100);
for (let i = 0; i < 1024 * 1024 * 100; i++) {
    BUFFER[i] = 88; // "x"
}

var AbortList = []

// https://medium.com/techtrument/multithreading-javascript-46156179cf9a
self.addEventListener('message', (e) => {
    if (e.data.cancel) {
        abortcontroller.abort();
        for (let req of AbortList) {
            req.abort();
        }
        AbortList = [];
        return;
    }
    NUMSTREAMS++;
    if (e.data.direction == "down") {
        startDownStream(e.data.url, e.data.id);
    }
    if (e.data.direction == "up") {
        startUpStream(e.data.url, e.data.id);
    }
});



async function startUpStream(url, id) {
    // let stream = new ReadableStream({
    //     start(controller) {
    //         let time = Date.now()
    //         let length = 0
    //         setInterval(() => {
    //             controller.enqueue(BUFFER);
    //             length += BUFFER.length
    //                 if ((Date.now() - time) > 100) {
    //                     self.postMessage({
    //                         id: id,
    //                         transfered: length,
    //                         time: Date.now() - time
    //                     })
    //                     time = Date.now()
    //                     length = 0
    //                 }
    //         }, 100)
    //     }
    // })
    // let request = new Request(url, {
    //     signal: signal,
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/octet-stream",
    //         // 'Accept-Encoding': 'identity' cannot be overridden
    //     },
    //     duplex: "half",
    //     body: stream,
    // })
    // fetch(request).then((response) => {
    //     console.log(response.body)
    // });

    
    let request = new XMLHttpRequest();
    let timelast = Date.now();
    let loadedlast = 0;
    request.upload.addEventListener("progress", function progress(event) {
        if ((Date.now() - timelast) > 100) {
            self.postMessage({
                id: id, 
                transfered: event.loaded - loadedlast,
                time: Date.now() - timelast,
                direction: "up",
            });
            timelast = Date.now();
            loadedlast = event.loaded;
        }
    }, false)
    request.open("POST", url, true)
    request.setRequestHeader("Content-Type", "application/octet-stream")
    // Illegal to set request.setRequestHeader("Content-Length", 1024 * 1024 * 1024 * 4) // 4 GB 
    request.send(BUFFER);
    AbortList.push(request);
}

async function startDownStream(url, id) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams
    fetch(url, {
        signal: signal,
        method: "GET",
        headers: {
            // 'Accept-Encoding': 'identity' cannot be overridden
        }
    })
    .then((response) => {
        const reader = response.body.getReader();
        return new ReadableStream({
            start(controller) {
                let time = Date.now()
                let length = 0
                return pump();
                function pump() {
                return reader.read().then(({ done, value }) => {
                    // When no more data needs to be consumed, close the stream
                    if (done) {
                        controller.close();
                        NUMSTREAMS--;
                        return;
                    }
                    length += value.length
                    if ((Date.now() - time) > 100) {
                        self.postMessage({
                            id: id,
                            transfered: length,
                            time: Date.now() - time,
                            direction: "down",
                        })
                        time = Date.now()
                        length = 0
                    }
                    return pump();
                });
                }
            }
        })
    })
    .catch(e => {
        if (e.name == "AbortError") {
            NUMSTREAMS--;
            if (NUMSTREAMS == 0) {
                self.close()
            }
        }
    })
}