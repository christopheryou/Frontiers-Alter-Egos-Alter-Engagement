import { characterAudio, characterAudioQueue } from './avatar.js';
let typewriterRunning = false; // Global flag to control typewriter effect
var dialogueText = document.getElementById('dialogue-text');
var formContainer = document.getElementById('form-container');
var optionsContainer = document.getElementById('options-container');
var audioContainer = document.getElementById('audio-container');
var startBtn = document.getElementById('start-btn');
var lastResponseWasPlaceholder = false;
var nextNode = 1;
var nextResponse = "";
var skipButton = document.getElementById("skip-button");
var skipText = document.getElementById("skip-text");
const url = "http://localhost:8000/Interview"
document.addEventListener('DOMContentLoaded', (event) => {
    dialogueText = document.getElementById('dialogue-text');
    formContainer = document.getElementById('form-container');
    optionsContainer = document.getElementById('options-container');
    audioContainer = document.getElementById('audio-container');
    startBtn = document.getElementById('start-btn');
    skipButton = document.getElementById("skip-button");
    skipText = document.getElementById("skip-text");

    // Close Modal button
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', closeButton);
    }

    // Left arrow for carousel
    const left = document.getElementById('leftArrow');
    if (left) {
        left.addEventListener('click', window.leftArrow);
    }

    // Right arrow for carousel
    const right = document.getElementById('rightArrow');
    if (right) {
        right.addEventListener('click', window.rightArrow);
    }

    const infoBtn = document.getElementById('info-btn');
    if (infoBtn) {
        infoBtn.addEventListener('click', function () {
            document.getElementById('infoModal').style.display = 'block';
        });
    }

    const closeInfoModal = document.getElementById('closeInfoModal');
    if (closeInfoModal) {
        closeInfoModal.addEventListener('click', function () {
            document.getElementById('infoModal').style.display = 'none';
        });
    }

    startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        handleResponse(1, { alexInput: "N/A", userInput: "Start Motivational Interview" });
    });

});



document.addEventListener('DOMContentLoaded', () => {
    // Retrieve session storage values
    const condition = sessionStorage.getItem('condition');
    const formResponses = sessionStorage.getItem('formResponses');

    // Check if condition and formResponses are valid
    if (!condition || !formResponses) {
        return; // Do not display the button or other elements if either is null
    }

    // Determine the user's name based on the condition and alias
    let userName = 'You';

    // Create and display the info button
    const infoButton = document.createElement('button');
    infoButton.className = 'info-button'; // Add a class for styling
    infoButton.textContent = `Information About ${userName}`;

    document.body.appendChild(infoButton);

    // Create the modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'persona-modal';
    modalContainer.className = 'modal-container hidden'; // Hidden by default
    modalContainer.innerHTML = `
        <div class="modal-content">
            <button id="modal-top-close" class="modal-top-close">&times;</button>
            <h2 class="modal-title">Person Information</h2>
            <div class="modal-body" id="modal-body"></div>
            <button id="modal-close" class="modal-close">Close</button>
        </div>
    `;
    document.body.appendChild(modalContainer);

    // Add click event listener to the info button
    infoButton.addEventListener('click', () => {
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = ''; // Clear previous content

        // Populate modal with formResponses
        const responses = JSON.parse(formResponses);
        responses.forEach(response => {
            const item = document.createElement('div');
            item.className = 'modal-body-item'; // Style for each item

            const label = document.createElement('div');
            label.className = 'modal-body-label';
            label.textContent = response.label;

            const value = document.createElement('div');
            value.className = 'modal-body-value';
            value.textContent = response.value;

            item.appendChild(label);
            item.appendChild(value);
            modalBody.appendChild(item);
        });

        // Show the modal
        modalContainer.classList.remove('hidden');
    });

    // Add click event listener to close the modal (top right button)
    document.getElementById('modal-top-close').addEventListener('click', () => {
        modalContainer.classList.add('hidden');
    });

    // Add click event listener to close the modal (bottom button)
    document.getElementById('modal-close').addEventListener('click', () => {
        modalContainer.classList.add('hidden');
    });

    // Add the user's name tag and remember text dynamically based on "no-form" class
    const container = document.querySelector('.container'); // Target the container
    const formElement = document.getElementById('form'); // Target the form container

    // Create a wrapper for the name tag and remember text
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'header-wrapper';

    const userNameTag = document.createElement('div');
    userNameTag.className = 'alias-label'; // Add styling class
    userNameTag.textContent = `${userName}`;

    const rememberText = document.createElement('div');

    headerWrapper.appendChild(userNameTag);
    headerWrapper.appendChild(rememberText);

    // Function to toggle the alias label and remember text
    function updateAliasDisplay() {
        if (container.classList.contains('no-form')) {
            // Remove the header wrapper if "no-form" is present
            if (headerWrapper.parentNode) {
                headerWrapper.remove();
                console.log("Alias label and remember text removed due to 'no-form' class.");
            }
        } else {
            // Add the header wrapper if "no-form" is absent
            if (!headerWrapper.parentNode) {
                formElement.insertBefore(headerWrapper, formElement.firstChild);
                console.log("Alias label and remember text added.");
            }
        }
    }


    console.log("MutationObserver set up to dynamically handle alias label visibility.");
});



// Function to open the modal

// Function to close the modal
function closeButton() {
    const modal = document.getElementById('trialModal');
    modal.style.display = 'none';
}


async function handleResponse(nodeId, body) {
    if (nodeId === "END") {
        window.location.href = '/END';
        return;
    }
    const response = await fetch(`/Interview/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        console.error('Failed to fetch response:', response.statusText);
        return;
    }

    const contentType = response.headers.get('Content-Type');
    lastResponseWasPlaceholder = false;
    // Handle streamed response
    if (contentType && contentType.includes('prerecorded')) {
        // Handle pre-recorded response
        console.log("Pre-recorded responses");
        const data = await response.json();
        await handlePreRecordedResponse(data);
    }
    else if (contentType && contentType.includes('application/json; charset=utf-8')) {
        console.log("Streamed Response.")
        const reader = response.body.getReader();
        await handleStreamedResponse(reader);
    }
    else {
        console.error("Unknown response type. Unable to process.");
    }
}


function appendOpenModalButton() {
    const openModalButton = document.createElement('button');
    openModalButton.id = 'openModalButton';
    openModalButton.innerText = 'View Research Studies';
    openModalButton.onclick = window.startModal; // Expose globally; // Replace with your modal start function
    openModalButton.classList.add('move-button'); // Add unique styling class

    // Style the button
    openModalButton.style.margin = '10px auto';
    openModalButton.style.display = 'block';

    // Append the button to the options-container
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.appendChild(openModalButton);
    } else {
        console.error('options-container not found.');
    }

    // Ensure smooth user experience (optional)
    optionsContainer.scrollIntoView({ behavior: 'smooth' });
}

async function handleStreamedResponse(reader) {
    const decoder = new TextDecoder();
    let partialData = '';
    let firstNonPlaceholderCalled = false; // Flag to ensure single call
    let renderLock = false; // Lock to prevent multiple simultaneous calls

    while (true) {
        const { value, done } = await reader.read();

        if (done) {
            console.log('Stream completed.');
            break;
        }

        partialData += decoder.decode(value, { stream: true });

        // Process each complete JSON chunk
        let boundaryIndex;
        while ((boundaryIndex = partialData.indexOf('\n')) !== -1) {
            const chunk = partialData.slice(0, boundaryIndex).trim();
            partialData = partialData.slice(boundaryIndex + 1);

            if (chunk) {
                const data = JSON.parse(chunk);

                console.log('Processing first chunk:', data);
                // Handle audio if present
                if (data.audio && data.audio.audioBase64) {
                    if (data.type === "PLACEHOLDER") {
                        const audioData = await parseAudio(data.audio, null);
                        characterAudio(audioData, null);
                        renderStreamedDialogue(data.dialogue, data.type);
                    } else {
                        const audioData = await parseAudio(data.audio, null);
                        characterAudioQueue(audioData, null);
                        derenderSkip()

                        // Call `renderStreamedDialogue` only if not already called
                        if (!firstNonPlaceholderCalled && !renderLock) {
                            renderLock = true; // Acquire lock
                            try {
                                await renderStreamedDialogue(data.wholeDialogue, data.type, data.url);
                                firstNonPlaceholderCalled = true; // Set flag after success
                            } catch (err) {
                                console.error("Error rendering streamed dialogue:", err);
                            } finally {
                                renderLock = false; // Release lock
                            }
                        }

                        // Update input and options
                        renderInput(data.input, data.wholeDialogue, data.url);
                        renderOptions(data.options, data.wholeDialogue, data.url);
                    }
                }
            }
        }
    }
}

function derenderSkip() {
    skipButton = document.getElementById("skip-button");
    skipText = document.getElementById("skip-text");
    skipButton.style.display = "none";
    skipText.style.display = "none";
}

function renderSkip() {
    skipButton = document.getElementById("skip-button");
    skipText = document.getElementById("skip-text");
    skipButton.style.display = "block";
    skipText.style.display = "block";
    skipButton.addEventListener('click', () => {
        const skipNode = nextNode;
        const skipResponse = "[Server System Error, Had to Skip] User Tried To Say: " + nextResponse;
        const additionalData = {
            userInput: skipResponse // Include the text of the selected option
        };
        handleResponse(skipNode, additionalData)
    });

}


async function handlePreRecordedResponse(data) {
    console.log('Received pre-recorded response:', data);
    // Handle audio if present
    if (data.audio && data.audio.audioBase64) {
        const audioData = await parseAudio(data.audio, null);
        characterAudio(audioData, null);
    }

    // Update dialogue
    renderDialogue(data.dialogue);
    renderInput(data.input, data.wholeDialogue, data.url);
    // Render options if available
    renderOptions(data.options, data.wholeDialogue, data.url);
    if (data.showTrials) {
        appendOpenModalButton();
    }
}

async function parseAudio(audio, emoji) {
    console.log("parseAudio called with audio and emoji:", { audio, emoji });

    try {
        // Get the Base64 audio string
        const base64Audio = audio.audioBase64;

        // Decode the Base64 audio string into an ArrayBuffer
        const arrayBuffer = await fetch(`data:audio/wav;base64,${base64Audio}`)
            .then(response => response.arrayBuffer());
        console.log("Audio decoded into ArrayBuffer.");

        // Create an AudioContext
        const audioContext = new AudioContext();
        console.log("AudioContext created.");

        // Decode the ArrayBuffer into an AudioBuffer
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("AudioBuffer decoded:", audioBuffer);

        // Create a new audio object with the decoded AudioBuffer
        const audioWithWav = {
            ...audio,
            audio: audioBuffer,
            sampleRate: audioBuffer.sampleRate,
        };

        // Pass the audio object to another function (characterAudio)
        // console.log("Calling characterAudio with:", audioWithWav);
        // characterAudio(audioWithWav, emoji);

        return audioWithWav;
    } catch (error) {
        console.error("Error decoding audio data:", error);
        throw error;
    }
}


// Function to render the dialogue text
function renderDialogue(dialogue) {
    dialogueText.innerText = dialogue;

    // Add animation class
    const dialogueSection = document.getElementById('dialogue-text');
    if (!dialogueSection.classList.contains('show')) {
        dialogueSection.classList.add('show');
    }
}

function renderStreamedDialogue(dialogue, type, url = null) {
    if (type === "PLACEHOLDER") {
        dialogueText.innerHTML = dialogue; // Direct assignment for placeholder
    } else {
        const dialogueSection = document.getElementById('dialogue-text');

        // Start with the current content to avoid overwriting
        let existingText = dialogueSection.innerText.trim();
        let textToAdd = dialogue; // Dialogue to type
        typewriterRunning = true;
        let i = 0; // Character index

        // Typewriter effect
        function typeWriter() {
            if (!typewriterRunning) {
                // If the effect is canceled, instantly show remaining text
                cancelTypewriterEffect(dialogueSection, dialogue, url);
                return;
            }
            if (i < textToAdd.length) {
                // Append each character
                if (i === 0 && existingText.length > 0) {
                    dialogueSection.innerHTML += ' '; // Add a space before new text
                }
                dialogueSection.innerHTML += textToAdd[i]; // Append character
                i++;
                setTimeout(typeWriter, 20); // Adjust speed (20ms per character)
            } else {
                // Ensure the class 'show' is added only once
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank'; // Opens link in a new tab
                    link.textContent = ' Read more'; // The space and link text
                    dialogueSection.appendChild(link);
                }
                if (!dialogueSection.classList.contains('show')) {
                    dialogueSection.classList.add('show');
                }
                typewriterRunning = false; // Reset the flag when done
            }
        }

        typeWriter(); // Start typing animation
    }
}


function cancelTypewriterEffect(dialogueSection, wholeDialogue, url = null) {
    typewriterRunning = false;
    dialogueSection.innerHTML = wholeDialogue; // Instantly display the complete dialogue
    
    if (url) {
        // Create the hyperlink
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank'; // Opens link in a new tab
        link.textContent = ' Read more'; // Add a space and link text
        dialogueSection.appendChild(link); // Append the hyperlink to the dialogue section
    }

    console.log("Typewriter effect canceled and completed instantly.");
}

// Function to render the input form
function renderInput(input, wholeDialogue, url = null) {
    formContainer.innerHTML = ''; // Clear any previous form
    const container = document.querySelector('.container');

    if (input) {
        container.classList.remove('no-form'); // Show the form section

        // Create a textarea input
        const inputElement = document.createElement('textarea');
        inputElement.classList.add('large-text');
        inputElement.placeholder = 'Enter your response here...';

        // Create a wrapper for the button
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'form-button-wrapper';

        // Create a submit button
        const submitButton = document.createElement('button');
        submitButton.className = 'game-button';
        submitButton.innerText = 'Send';

        // Create a loading spinner (hidden by default)
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        loadingSpinner.style.display = 'none'; // Initially hidden

        // Add event listener to send button
        submitButton.addEventListener('click', () => {
            if (inputElement.value.trim() !== "") {
                cancelTypewriterEffect(dialogueText, wholeDialogue, url);

                // Disable input and button, show loading spinner
                var inputElementValue = inputElement.value;
                inputElement.disabled = true; // Disable input
                submitButton.disabled = true; // Disable button
                submitButton.style.display = 'none'; // Hide the button
                loadingSpinner.style.display = 'inline-block'; // Show spinner
                nextNode = input.nextNode;
                nextResponse = inputElementValue;
                // Send response
                renderSkip()
                handleResponse(input.nextNode, { alexInput: wholeDialogue, userInput: inputElementValue });
            } else {
                alert("Please enter a response.");
            }
        });

        // Append the spinner to the wrapper
        buttonWrapper.appendChild(submitButton);
        buttonWrapper.appendChild(loadingSpinner);

        // Append input and button wrapper to the form container
        formContainer.appendChild(inputElement);
        formContainer.appendChild(buttonWrapper);
    } else {
        container.classList.add('no-form'); // Hide the form section when there's no input
    }
}

// Function to render the options
function renderOptions(options, wholeDialogue, url) {
    optionsContainer.innerHTML = ''; // Clear previous options

    if (options && options.length > 0) {
        const isSingleOption = options.length === 1; // Check if there's only one option

        options.forEach(option => {
            // Create a wrapper for each button
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'button-wrapper'; // Add wrapper class

            // Create the main button
            const button = document.createElement('button');
            button.className = isSingleOption || option.optionText === "I'd like to move onto the next topic of the conversation"
                ? "move-button"
                : "game-button";
            button.innerText = option.optionText;

            // Add scalable spacing around buttons
            button.style.margin = "0.5em"; // Use `em` for spacing

            // Add event listener to send response with additional data
            button.addEventListener('click', () => {
                // Disable all inputs
                const inputElement = document.querySelector('.large-text');
                const sendButton = document.querySelector('.game-button');
                if (inputElement) inputElement.disabled = true;
                if (sendButton) sendButton.disabled = true;

                // Clear options and show loading spinner
                optionsContainer.innerHTML = ''; // Remove all buttons
                cancelTypewriterEffect(dialogueText, wholeDialogue, url);

                const loadingSpinner = document.createElement('div');
                loadingSpinner.className = 'loading-spinner';
                loadingSpinner.style.display = 'inline-block'; // Show spinner
                optionsContainer.appendChild(loadingSpinner);

                const additionalData = {
                    alexInput: wholeDialogue,
                    userInput: option.optionText // Include the text of the selected option
                };
                renderSkip()
                handleResponse(option.nextNode, additionalData); // Pass additionalData to handleResponse
            });

            optionsContainer.appendChild(button);
        });
    }
}

// Function to send data to the server
function sendDataToServer(data) {
    fetch('/submitData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            formContainer.innerHTML = '<h3>Thank you for submitting your responses!</h3>';
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}


// Utility function to hide/show sections dynamically
function toggleVisibility(element, isVisible) {
    if (isVisible) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}
