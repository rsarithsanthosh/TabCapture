chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target === "offscreen") {
    switch (message.type) {
      case "start-recording":
        startRecording(message.data);
        break;
      case "stop-recording":
        stopRecording();
        break;
      default:
        throw new Error("Unrecognized message:", message.type);
    }
  }
});

let recorder;
let data = [];

async function startRecording(streamId) {
  var startTime;
  if (recorder?.state === "recording") {
    throw new Error("Called startRecording while recording is in progress.");
  }

  const media = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Continue to play the captured audio to the user.
  const output = new AudioContext();
  const source = output.createMediaStreamSource(media);
  source.connect(output.destination);

  // Start recording.
  recorder = new MediaRecorder(media, { mimeType: "video/webm" ,codec:"H.264"});
  recorder.ondataavailable = (event) => data.push(event.data);
  recorder.onstop = () => {
    var duration = Date.now() - startTime;

    const buggyBlob = new Blob(data, { type: "video/webm" });
    // v1: callback-style
    ysFixWebmDuration(buggyBlob, duration, function (fixedBlob) {
      // window.open(URL.createObjectURL(fixedBlob), "_blank");
      var url = URL.createObjectURL(fixedBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "demo.webm";
      downloadLink.click();
      // Clear state ready for next recording
    });

    // var url = URL.createObjectURL(blob);

    // const downloadLink = document.createElement("a");
    // downloadLink.href = url;
    // downloadLink.download = "demo.mp4";
    // downloadLink.click();
    // Clear state ready for next recording
    recorder = undefined;
    data = [];
  };
  recorder.start();
  startTime = Date.now();
  window.location.hash = "recording";
}

async function stopRecording() {
  recorder.stop();

  // Stopping the tracks makes sure the recording icon in the tab is removed.
  recorder.stream.getTracks().forEach((t) => t.stop());

  // Update current state in URL
  window.location.hash = "";
}
