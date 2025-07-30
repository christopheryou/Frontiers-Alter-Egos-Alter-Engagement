import { characterAudio, characterAudioQueue } from './avatar.js';

var dialogueText = document.getElementById('dialogue-text');
var formContainer = document.getElementById('form-container');
var optionsContainer = document.getElementById('options-container');
var audioContainer = document.getElementById('audio-container');
var startBtn = document.getElementById('start-btn');


document.addEventListener('DOMContentLoaded', (event) => {
    dialogueText = document.getElementById('dialogue-text');
    formContainer = document.getElementById('form-container');
    optionsContainer = document.getElementById('options-container');
    audioContainer = document.getElementById('audio-container');
    startBtn = document.getElementById('start-btn');

    startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        startBtn.style.display = 'none';
        handleResponse(1, { alexInput: "N/A", userInput: "Start Introduction" });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const condition = sessionStorage.getItem("condition") || "vh";
    const personIntakeItem = document.querySelector('[data-stage="2"]');
    // Get all timeline items
    const timelineItems = document.querySelectorAll('.timeline-item');
    // Check condition and update stage 2
    // Check if condition is not 'VH' or 'RP'
    if (condition.toLowerCase() === "base") {
        // Remove Person Intake (data-stage="2") and the last stage (data-stage="4")
        timelineItems.forEach(item => {
            const stage = item.getAttribute('data-stage');
            if (stage === "2") {
                item.remove();
            }
        });

    }
});


async function handleResponse(nodeId, body) {
    if (nodeId === "INTERVIEW") {
        // Redirect to the INTERVIEW route
        window.location.href = '/Interview';
        return;
    } 
    const response = await fetch(`/Introduction/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        console.error('Failed to fetch response:', response.statusText);
        return;
    }

    const contentType = response.headers.get('Content-Type');

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

async function handleStreamedResponse(reader) {
    const decoder = new TextDecoder();
    let partialData = '';
    var isFirstChunk = true;

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

                // Special handling for the first chunk
                if (isFirstChunk) {
                    console.log('Processing first chunk:', data);
                    // Handle audio if present
                    if (data.audio && data.audio.audioBase64) {
                        if (data.type == "PLACEHOLDER") {
                            const audioData = await parseAudio(data.audio, null);
                            characterAudio(audioData, null);
                            renderStreamedDialogue(data.dialogue, data.type);
                        }
                        else {
                            isFirstChunk = false;
                            const audioData = await parseAudio(data.audio, null);
                            characterAudioQueue(audioData, null);
                            // Update dialogue
                            renderStreamedDialogue(data.wholeDialogue, data.type);
                            renderInput(data.input, data.wholeDialogue);
    
                            // Render options if available
                            renderOptions(data.options, data.wholeDialogue);
                        }
                    }
                } else {
                    if (data.audio && data.audio.audioBase64) {
                        const audioData = await parseAudio(data.audio, null);
                        // renderStreamedDialogue(data.dialogue, data.type);
                        characterAudioQueue(audioData, null);
                    }
                }
            }
        }
    }
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
    renderInput(data.input, data.wholeDialogue);
    // Render options if available
    renderOptions(data.options, data.wholeDialogue);
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

function renderStreamedDialogue(dialogue, type) {
    if (type === "PLACEHOLDER") {
        dialogueText.innerHTML = dialogue; // Direct assignment for placeholder
    } else {
        const dialogueSection = document.getElementById('dialogue-text');

        // Start with the current content to avoid overwriting
        let existingText = dialogueSection.innerText.trim();
        let textToAdd = dialogue; // Dialogue to type

        let i = 0; // Character index

        // Typewriter effect
        function typeWriter() {
            if (i < textToAdd.length) {
                // Append each character
                if (i === 0 && existingText.length > 0) {
                    dialogueSection.innerHTML += ' '; // Add a space before new text
                }
                dialogueSection.innerHTML += textToAdd[i]; // Append character
                i++;
                setTimeout(typeWriter, 20); // Adjust speed (50ms per character)
            } else {
                // Ensure the class 'show' is added only once
                if (!dialogueSection.classList.contains('show')) {
                    dialogueSection.classList.add('show');
                }
            }
        }

        typeWriter(); // Start typing animation
    }
}



// Function to render the input form
function renderInput(input, wholeDialogue) {
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
                // Disable input and show loading spinner
                var inputElementValue = inputElement.value;
                inputElement.disabled = true;
                inputElement.value = ""; // Clear input
                submitButton.style.display = 'none'; // Hide the button
                loadingSpinner.style.display = 'inline-block'; // Show spinner

                // Send response
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
function renderOptions(options, wholeDialogue) {
    optionsContainer.innerHTML = ''; // Clear previous options

    if (options && options.length > 0) {
        options.forEach(option => {
            const button = document.createElement('button');
            button.className = "game-button";
            button.innerText = option.optionText;

            // Add scalable spacing around buttons
            button.style.margin = "0.5em"; // Use `em` for spacing

            // Add event listener to send response with additional data
            button.addEventListener('click', () => {
                // Clear options and show loading spinner
                optionsContainer.innerHTML = ''; // Remove all buttons

                // Create a loading spinner
                const loadingSpinner = document.createElement('div');
                loadingSpinner.className = 'loading-spinner';
                loadingSpinner.style.display = 'inline-block'; // Show spinner
                optionsContainer.appendChild(loadingSpinner);

                const additionalData = {
                    alexInput: wholeDialogue,
                    userInput: option.optionText // Include the text of the selected option
                };

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


// Global object to store form responses
var formResponses = [];
function renderForm(form) {
    const container = document.querySelector('.container');
    formContainer.innerHTML = ''; // Clear previous form

    if (form) {
        container.classList.remove('no-form');

        formContainer.innerHTML = `<h3>${form.title}</h3><p>${form.description}</p>`;

        let requiredQuestions = []; // Array to track required questions

        form.questions.forEach((question) => {
            let inputElement;
            const questionWrapper = document.createElement('div');
            questionWrapper.classList.add('form-question-wrapper'); // Add a class for styling

            // Initialize responseEntry object to store full question details
            let responseEntry = {
                id: question.id,
                label: question.label,
                type: question.type,
                value: '',
                inputType: question.inputType || '',
                multiple: question.multiple || false,
                options: question.options || [],
                min: question.min || '',
                max: question.max || '',
                step: question.step || '',
                leftLabel: question.leftLabel || '',
                rightLabel: question.rightLabel || ''
            };

            const label = document.createElement('label');
            label.innerText = question.label;
            questionWrapper.appendChild(label);

            // Text and textarea input types
            if (question.type === 'text') {
                inputElement = document.createElement('textarea');
                inputElement.placeholder = question.placeholder || '';
                inputElement.required = question.required || false;
                inputElement.classList.add(question.inputType === 'short' ? 'short-text' : 'large-text');

                questionWrapper.appendChild(inputElement);

                // Add input event listener to update the responseEntry object
                inputElement.addEventListener('input', () => {
                    responseEntry.value = inputElement.value;
                });

                // Number input type
            } else if (question.type === 'number') {
                inputElement = document.createElement('input');
                inputElement.type = 'number';
                inputElement.placeholder = question.placeholder || '';
                inputElement.required = question.required || false;

                questionWrapper.appendChild(inputElement);

                inputElement.addEventListener('input', () => {
                    responseEntry.value = inputElement.value;
                });

                // Select input type with multiple options handled as toggle buttons
            } else if (question.type === 'select' && question.multiple) {
                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('button-container');

                responseEntry.value = []; // Initialize an empty array for multiple selections

                // Create buttons for each option
                question.options.forEach(option => {
                    const button = document.createElement('button');
                    button.classList.add('toggle-button');
                    button.innerText = option.text;
                    button.value = option.value;

                    button.addEventListener('click', (event) => {
                        event.preventDefault();
                        if (responseEntry.value.includes(option.value)) {
                            responseEntry.value = responseEntry.value.filter(item => item !== option.value);
                            button.classList.remove('selected');
                        } else {
                            responseEntry.value.push(option.value);
                            button.classList.add('selected');
                        }
                    });

                    buttonContainer.appendChild(button);
                });

                questionWrapper.appendChild(buttonContainer);

                // Regular single select dropdown
            } else if (question.type === 'select') {
                inputElement = document.createElement('select');
                inputElement.required = question.required || false;

                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.innerText = '---';
                inputElement.appendChild(defaultOption);

                question.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.innerText = option.text;
                    inputElement.appendChild(optionElement);
                });

                questionWrapper.appendChild(inputElement);

                inputElement.addEventListener('change', () => {
                    responseEntry.value = inputElement.value;
                });

                // Slider input type
            } else if (question.type === 'slider') {
                const sliderContainer = document.createElement('div');
                sliderContainer.classList.add('slider-container');

                const description = document.createElement('p');
                description.innerText = question.description || '';
                sliderContainer.appendChild(description);

                const leftLabel = document.createElement('span');
                leftLabel.innerText = question.leftLabel || 'Low';
                sliderContainer.appendChild(leftLabel);

                inputElement = document.createElement('input');
                inputElement.type = 'range';
                inputElement.min = question.min || 0;
                inputElement.max = question.max || 100;
                inputElement.step = question.step || 1;
                inputElement.value = question.initialValue || (question.min + question.max) / 2;
                inputElement.required = question.required || false;

                const valueDisplay = document.createElement('span'); // Create a value display
                valueDisplay.classList.add('slider-value');
                valueDisplay.innerText = inputElement.value;

                sliderContainer.appendChild(inputElement);
                sliderContainer.appendChild(valueDisplay);

                const rightLabel = document.createElement('span');
                rightLabel.innerText = question.rightLabel || 'High';
                sliderContainer.appendChild(rightLabel);
                questionWrapper.appendChild(sliderContainer);

                inputElement.addEventListener('input', () => {
                    responseEntry.value = inputElement.value;
                    valueDisplay.innerText = inputElement.value; // Update value display as slider moves
                });
            }

            // Append the question wrapper
            formContainer.appendChild(questionWrapper);

            // If the input is required, track it
            if (inputElement && question.required) {
                requiredQuestions.push(inputElement);
            }

            // Push this responseEntry into the array of formResponses
            formResponses.push(responseEntry);
        });

        // No submit button here, since it will be added in `renderOptions`
    } else {
        container.classList.add('no-form');
    }
}


// Function to validate if all required form fields are filled
function validateForm() {
    let allValid = true;
    const requiredQuestions = document.querySelectorAll('textarea[required], input[required], select[required]');

    requiredQuestions.forEach((input) => {
        if (input.tagName === 'SELECT' && input.multiple) {
            // For multiple select, check if at least one option is selected
            if (Array.from(input.selectedOptions).length === 0) {
                allValid = false;
                input.style.borderColor = 'red';
            } else {
                input.style.borderColor = '';
            }
        } else if (input.tagName === 'SELECT') {
            // For single select, ensure it's not the default option (---)
            if (input.value === '') {
                allValid = false;
                input.style.borderColor = 'red'; // Highlight empty select
            } else {
                input.style.borderColor = ''; // Reset border color if valid
            }
        } else {
            // For text, textarea, and number inputs
            if (!input.value.trim()) {
                allValid = false;
                input.style.borderColor = 'red'; // Highlight the empty field
                input.placeholder = 'This field is required'; // Set error message
            } else {
                input.style.borderColor = ''; // Reset border color if valid
            }
        }
    });

    return allValid;
}
