// Importing the TalkingHead module
import { TalkingHead } from 'talkinghead';
var head; // TalkingHead instance
var audio; // Audio object
var currentStep = 0;
var steps;
var first = false;
var lastTurn = 0;
const maleUrl = "../../../avatars/male_avatar.glb";
const femaleUrl = "../../../avatars/female_avatar.glb";
var startBtn = document.getElementById('start-btn');

// Load and show the avatar
document.addEventListener('DOMContentLoaded', async function (e) {
  var character = femaleUrl;
  var body = 'F';
  startBtn = document.getElementById('start-btn');

  // Retrieve characterType from sessionStorage
  const characterType = sessionStorage.getItem('type');
  if (characterType) {
    console.log(`Character type found: ${characterType}`);
    if (characterType.toLowerCase() === 'male') {
      character = maleUrl;
      body = 'M';
    } else if (characterType.toLowerCase() === 'female') {
      character = femaleUrl;
      body = 'F';
    }
  } else {
    console.log('No characterType found in sessionStorage, using defaults.');
  }

  // steps = document.querySelectorAll('.step');

  // Instantiate the class
  // NOTE: Text-to-speech not initialized
  const nodeAvatar = document.getElementById('avatar');
  head = new TalkingHead(nodeAvatar, {
    ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize",
    lipsyncModules: ["en", "fi"],
    cameraView: "upper",
    cameraDistance: -1,
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
    avatarMood: "love"

  });

  // Load and show the avatar
  const nodeLoading = document.getElementById('loading');
  try {
    await head.showAvatar({
      url: character,
      body: body,
      avatarMood: 'happy',
      lipsyncLang: 'en',
    }, (ev) => {
      if (ev.lengthComputable) {
        let val = Math.min(100, Math.round(ev.loaded / ev.total * 100));
        nodeLoading.textContent = "Loading " + val + "%";
      }
    });
    nodeLoading.style.display = 'none';
    startBtn.style.display = 'block';

  } catch (error) {
    console.log(error);
    nodeLoading.textContent = error.toString();
  }

});


export async function characterAudio(audio, emoji) {
  try {
    // console.log("Checking speaking: ", head.isSpeaking, head.speechQueue);      
    if (!first) {
      head.playGesture('👋');



      first = true;
    }
    else if (emoji) {
      head.playGesture(emoji);
    }
    head.replaceAndSpeakNewAudio(audio);

  } catch (error) {
    console.error('Error during speech processing:', error);
  }
}

export async function characterAudioQueue(audio, emoji) {
  try {
    // console.log("Checking speaking: ", head.isSpeaking, head.speechQueue);      
    if (!first) {
      head.playGesture('👋');



      first = true;
    }
    else if (emoji) {
      head.playGesture(emoji);
    }
    head.speakAudio(audio, null, null);

  } catch (error) {
    console.error('Error during speech processing:', error);
  }
}
/*
export async function characterAudio(audioData) {
  try {
      // Stop any ongoing speech
      console.log("Checking speaking: ", head.isSpeaking, head.speechQueue);      
      head.stopSpeaking();
      head.resetLips();
      const checkCompletion = () => {
        if (head.speechQueue.length === 0) {
          head.resetLips();
          head.render();
          console.log("Done checking speaking: ", head.isSpeaking, head.speechQueue);
          wait(2000).then(console.log(head));
          
        } else {
            setTimeout(checkCompletion, 1000); // Check again after 100ms
        }
    };
    checkCompletion();

      // Start the new speech and wait for it to complete
      console.log("Checking speakAudio")
      await speakAudioWithPromise(audioData);

      console.log('Finished speaking the new audio.');
  } catch (error) {
      console.error('Error during speech processing:', error);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function myAsyncFunction() {
  console.log("Waiting for 2 seconds...");
  await wait(2000); // Wait for 2000 milliseconds (2 seconds)
  console.log("2 seconds have passed.");
}


function speakAudioWithPromise(r, opt = null, onsubtitles = null) {
  console.log("Checking speaking: ", head.isSpeaking, head.speechQueue);      
  return new Promise((resolve, reject) => {
      try {
          // Call speakAudio, which internally calls startSpeaking
          head.speakAudio(r, opt, onsubtitles);
          
          // Assuming startSpeaking is async, you need to know when it's done
          // Here we simulate it with a setTimeout as a placeholder for real detection logic
          console.log("Checking completion");
          const checkCompletion = () => {
              if (head.speechQueue.length > 0) {
                console.log("Done checking completion: ", head.isSpeaking, head.speechQueue);                       
                console.log(head);
                resolve();
              } else {
                  setTimeout(checkCompletion, 100); // Check again after 100ms
              }
          };
          checkCompletion();
      } catch (error) {
          reject(error);
      }
  });
}


const checkIfDone = () => {
  if (head.isSpeaking === false) { // Example condition
      resolve();
  } else {
      setTimeout(checkIfDone, 100);
  }
};

*/