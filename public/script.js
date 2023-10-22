import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const demosSection = document.getElementById("demos");
let gestureRecognizer = GestureRecognizer;
let runningMode = "IMAGE";
let enableWebcamButton = HTMLButtonElement;
let webcamRunning = false;
const videoHeight = "480px";
const videoWidth = "640px";

const gestureToLetterMap = {
  "Closed_Fist": { lowercase: "e", uppercase: "E" },
  "Open_Palm": { lowercase: "f", uppercase: "F" },
  "Pointing_Up": { lowercase: "d", uppercase: "D" },
  "Thumb_Down": { lowercase: "b", uppercase: "B" },
  "Thumb_Up": { lowercase: "a", uppercase: "A" },
  "Victory": { lowercase: "c", uppercase: "C" },
  "ILoveYou": "backspace"
};
// const gestureToLetterMap = {
//   "Closed_Fist": "e",
//   "Open_Palm": "f",
//   "Pointing_Up": "d",
//   "Thumb_Down": "b",
//   "Thumb_Up": "a",
//   "Victory": "c",
//   "ILoveYou": "backspace"
// };

// const gestureToLetterMapCaps = {
//   "Closed_Fist": "E",
//   "Open_Palm": "F",
//   "Pointing_Up": "D",
//   "Thumb_Down": "B",
//   "Thumb_Up": "A",
//   "Victory": "C",
// };
const targetSequence = ["abcdef", "ABCDEF", "aAbBcC", "DfACeF", "BcEade", "fcABFb"]; 
var uniqueChars = [];

const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: runningMode
  });
  demosSection.classList.remove("invisible");
};
createGestureRecognizer();
renderTargetWords();

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

function renderTargetWords() {
  const targetWordsContainer = document.getElementById('target-words');
  targetWordsContainer.innerHTML = ''; // Clear any previous content

  targetSequence.forEach(word => {
    const wordSpan = document.createElement('span');
    wordSpan.textContent = word;
    wordSpan.style.marginRight = '10px'; // Some spacing
    targetWordsContainer.appendChild(wordSpan);
  });
}


function enableCam(event) {
  if (!gestureRecognizer) {
    alert("Please wait for gestureRecognizer to load");
    return;
  }
  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  }

  const constraints = {
    video: true
  };

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });

  let lastVideoTime = -1;
  let results = undefined;

  // Define a variable to hold the detected spoken word
  let spokenWord = "";

  // Check if SpeechRecognition is available in the browser
  if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
      const current = event.resultIndex;
      spokenWord = event.results[current][0].transcript.trim().toLowerCase();

      const spokenWordContent = document.getElementById("spoken-word-content");
      spokenWordContent.textContent = spokenWord;
    };

    recognition.onend = function () {
      recognition.start();
    };

    recognition.start();
  } else {
    console.warn("Speech recognition is not supported by your browser");
  }

  async function predictWebcam() {
    console.log(spokenWord);

    const webcamElement = document.getElementById("webcam");
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }
    let nowInMs = Date.now();
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      results = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);

    canvasElement.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    webcamElement.style.width = videoWidth;

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          GestureRecognizer.HAND_CONNECTIONS,
          {
            color: "#00FF00",
            lineWidth: 5
          }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 2
        });
      }
    }
    canvasCtx.restore();

    if (results.gestures.length > 0) {

      gestureOutput.style.display = "block";
      gestureOutput.style.width = videoWidth;
      const categoryName = results.gestures[0][0].categoryName;
      const mappedLetter = gestureToLetterMap[categoryName] || "Unknown Gesture";
      // const mappedLetterCaps = gestureToLetterMapCaps[categoryName] || "Unknown Gesture";
      const letterMapping = gestureToLetterMap[categoryName] || "Unknown Gesture";
      
      // console.log(mappedLetter, mappedLetterCaps);

      if (letterMapping === "backspace") {
        console.log("backspace");
        uniqueChars.pop(); // Remove the last detected gesture if backspace is detected.
        console.log(uniqueChars);

      } else if (typeof letterMapping === "object") {
        const mappedLetter = spokenWord === "uppercase" ? letterMapping.uppercase : letterMapping.lowercase;
        
        if (!uniqueChars.includes(mappedLetter) && mappedLetter !== "Unknown Gesture" && uniqueChars.length < 6) {
          uniqueChars.push(mappedLetter);
        }
      }

  
  
      if (uniqueChars.length === 6) {
        let word = uniqueChars.join('');
        console.log(word);
        // Check if word is in targetSequence
        const wordSpans = document.querySelectorAll('#target-words span');
        wordSpans.forEach(wordSpan => {
          if (wordSpan.textContent === word) {
            wordSpan.style.color = 'green';
          }
        });
        uniqueChars = [];
      }

      gestureOutput.innerText = `Detected Letter: ${uniqueChars.join('')}`;
    } else {
      gestureOutput.style.display = "none";
    }
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  }
};
