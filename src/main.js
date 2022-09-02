const STREAMLIST = document.getElementById("StreamList")
document.getElementById("StartButton").onclick=async ()=>{
    await startStream();
}

function startStream() {
    el = document.createElement("li")
    el.innerHTML = "0"
    
    STREAMLIST.append(el)
    // https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams
    //fetch("https://rpm.obs.cr:4043/large", {
    fetch("", {
    method: "GET",
        headers: {
            // 'Accept-Encoding': 'identity' cannot be overridden
        }
    })
    .then((response) => {
        BytesRead = 0
        const reader = response.body.getReader();
        return new ReadableStream({
        start(controller) {
            return pump();
            function pump() {
            return reader.read().then(({ done, value }) => {
                // When no more data needs to be consumed, close the stream
                if (done) {
                controller.close();
                return;
                }
                // Enqueue the next data chunk into our target stream
                controller.enqueue(value);
                BytesRead += value.length
                el.innerHTML = BytesRead
                return pump();
            });
            }
        }
        })
    })
}


document.getElementById("StartButton").onclick=async ()=>{
    await startStream();
}

function startStream() {
    el = document.createElement("li")
    el.innerHTML = "0"
    STREAMLIST.append(el)

    // https://medium.com/techtrument/multithreading-javascript-46156179cf9a
    var worker = new Worker("worker.js")

    worker.addEventListener('message', function(e) {
        el.innerHTML = e
    })

    worker.postMessage("")
}

