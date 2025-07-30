const express = require('express');
const axios = require('axios');
const OpenAI = require('openai')
const openai = new OpenAI(api_key = process.env.OPENAI_API_KEY);
const config = require('../config'); // Import the config.js file
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg'); // Import ffmpeg for audio processing
const ffmpegPath = require('ffmpeg-static'); // Path to the static binary
ffmpeg.setFfmpegPath(ffmpegPath); // Set the path explicitly
const router = express.Router()
const path = require('path');

router.use(express.static(path.join(__dirname, 'public')));
const jsonDir = path.resolve(__dirname, './json')
var sql = require("mssql");
const { v4: uuidv4 } = require('uuid');

const scriptPath = path.join(jsonDir, '/Interview/MI_Script.json');
const placeholdersPath = path.join(jsonDir, '/Placeholder/Placeholders.json');

// Preload data at the beginning
let placeholdersData;
let scriptData;

try {
    scriptData = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
    console.log("Successfully preloaded script metadata.");
} catch (err) {
    console.error("Error reading or parsing audio_metadata.json:", err);
    scriptData = []; // Fallback to empty data
}


try {
    placeholdersData = JSON.parse(fs.readFileSync(placeholdersPath, 'utf8'));
    console.log("Successfully preloaded placeholders data.");
} catch (err) {
    console.error("Error reading or parsing Placeholders.json:", err);
    placeholdersData = []; // Fallback to empty data
}


router.post('/:nodeId', async (req, res, next) => {
    // console.log(req.session.params);
    req.session.params = req.session.params || {};
    const nodeId = parseInt(req.params.nodeId);
    // Default structure for session data


    if (nodeId == 1) {
        console.log("Here");
        req.session.params.messages = [];
        req.session.params.conversationHistory = [];
        const jsonPersona = JSON.stringify(req.session.params.personaInformation);
        var systemMessage = `You are a virtual mental health assistant named Alex. The information of the user is attached below. Please facilitate this conversation by responding and empathizing based on the properties of motivational interviewing included in each individually defined prompt. 

        Strictly NEVER ask any questions back in your response; only follow the prompts exactly and nothing more. Use the information of the user that is attached to contextualize your responses and help frame the conversation while discussing mental health with the person. 

        Your speech to the user should be as if they are a peer; with more commonly used friendly language, rather than formal language. Keep empathetic responses to a maximum of 25 words.

        **PERSON INFORMATION**:
        ${jsonPersona || 'N/A'}`;

        var systemObject = {
            role: "system",
            content: systemMessage
        }
        req.session.params.messages.push(systemObject);
    }

    const gender = req.session.params.gender;
    // console.log(gender);
    const additionalData = req.body || {};
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // Find node data in preloaded metadata
        const nodeData = scriptData.find(item => item.nodeId === nodeId);

        if (!nodeData) {
            console.error(`Node with ID ${nodeId} not found.`);
            return res.status(404).json({ error: `Node with ID ${nodeId} not found` });
        }

        // console.log("Non-pre-recorded response. Generating dialogue and audio...");


        // 67% chance to send a placeholder
        if (placeholdersData.length > 0 && nodeId != 1) {
            const randomIndex = Math.floor(Math.random() * placeholdersData.length);
            const selectedPlaceholder = placeholdersData[randomIndex];
            const audio = gender == "male" ? selectedPlaceholder.audioM : selectedPlaceholder.audioF;

            const placeholderResponse = {
                userId: req.session?.params?.id || null,
                nodeId: nodeId,
                dialogue: selectedPlaceholder.dialogue,
                audio: audio,
                type: "PLACEHOLDER",
                input: null,
                options: [],
                url: null,
                progressInterview: null
            };
            // console.log("Sending placeholder response:", placeholderResponse.dialogue);
            res.write(JSON.stringify(placeholderResponse) + '\n');
        }

        // Generate dialogue
        // Create the initial message with the system role and prompt
        var responseData;
        if (nodeData.response && nodeData.response.prompt) {
            const currentConversationHistory = req.session.params.conversationHistory.join("\n")
            var constructedPrompt = `
            Current Conversation History:
            ${currentConversationHistory}\n
            `;

            if (additionalData) {
                constructedPrompt += "[USER]: " + additionalData.userInput;
                req.session.params.conversationHistory.push("[USER]: " + additionalData.userInput);

            }

            if (nodeData.response && nodeData.response.prompt) {
                constructedPrompt += "\n" + nodeData.response.prompt;
            }

            var userObject = {
                role: "user",
                content: constructedPrompt
            }
            req.session.params.messages.push(userObject);
            // console.log(currentConversationHistory);
            // console.log(req.session.params.messages)

            const generatedDialogue = await respondWithChatGPT(req.session.params.messages);
             responseData = {
                userId: req.session?.params?.id || null,
                nodeId: nodeId,
                dialogue: generatedDialogue,
                audio: null,
                input: nodeData.input || null,
                options: nodeData.options || [],
                url: nodeData.url || null,
                wholeDialogue: generatedDialogue + " " + nodeData.dialogue
            };

            var alexObject = {
                role: "assistant",
                content: generatedDialogue
            }
            req.session.params.messages.push(alexObject);
            req.session.params.conversationHistory.push("[ALEX]: " + generatedDialogue);
        }
        else {
            responseData = {
                userId: req.session?.params?.id || null,
                nodeId: nodeId,
                dialogue: nodeData.dialogue,
                audio: null,
                input: nodeData.input || null,
                options: nodeData.options || [],
                url: nodeData.url || null,
                wholeDialogue: nodeData.dialogue
            };
        } 

        const sentences = splitTextIntoSentences(responseData.wholeDialogue);
        // console.log("Split dialogue into sentences:", sentences);

        // Process first chunk immediately
        const firstChunk = await processSentence(sentences[0], responseData, req, true);
        // console.log("Sending first sentence:", firstChunk.dialogue);
        res.write(JSON.stringify(firstChunk) + '\n');

        // Process remaining chunks concurrently
        const remainingChunksPromises = sentences.slice(1).map((sentence, index) =>
            processSentence(sentence, responseData, req, false)
        );
        try {
            const remainingChunks = await Promise.all(remainingChunksPromises);

            // Stream remaining chunks as they finish
            remainingChunks.forEach(chunk => {
                // console.log("Sending remaining sentence:", chunk.dialogue);
                res.write(JSON.stringify(chunk) + '\n');
            });

            // Only execute this AFTER all remaining chunks are done
            if (nodeData.response != null && nodeData.response.alterDialogue === false) {
                // console.log("Sending pre-generated sentence:", nodeData.dialogue);
                const audio = gender == "male" ? nodeData.audioM : nodeData.audioF;
                responseData.dialogue = nodeData.dialogue;
                responseData.audio = audio;
                responseData.type = "END CHUNK";
                res.write(JSON.stringify(responseData) + '\n');
            }

            // console.log("Finished processing all sentences. Ending response stream.");
            res.end();
        } catch (err) {
            console.error('Error processing remaining chunks:', err);
            res.end();
        }
    } catch (err) {
        console.error('Error during request processing:', err);
        return res.status(500).json({ error: 'Failed to process request' });
    }
});

// Helper function to process a single sentence
async function processSentence(sentence, nodeData, req, isFirstChunk) {
    const chunkType = isFirstChunk ? "NEW AUDIO" : "CHUNK";
    const createdFiles = [];
    const tempDir = '/tmp'; // Directory for temporary files
    const gender = req.session?.params?.gender;

    try {
        // Ensure /tmp directory exists
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log(`Created directory: ${tempDir}`);
        }
        const voice = gender === "male" ? 'echo' : 'shimmer';

        // Generate audio
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: sentence,
            response_format: "wav",
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const uniqueFilename = `speech_${uuidv4()}.wav`;
        const speechFile = path.join(tempDir, uniqueFilename);
        await fs.promises.writeFile(speechFile, buffer);
        createdFiles.push(speechFile);

        // Speed up audio
        const spedUpFilename = `spedup_${uniqueFilename}`;
        const spedUpFilePath = path.join(tempDir, spedUpFilename);
        await new Promise((resolve, reject) => {
            ffmpeg(speechFile)
                .audioFilters('atempo=1.1')
                .save(spedUpFilePath)
                .on('end', resolve)
                .on('error', reject);
        });
        createdFiles.push(spedUpFilePath);

        // Convert to Base64
        const spedUpBuffer = await fs.promises.readFile(spedUpFilePath);
        const audioBase64 = spedUpBuffer.toString('base64');

        // Transcription
        const transcriptionResponse = await openai.audio.transcriptions.create({
            file: fs.createReadStream(spedUpFilePath),
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word", "segment"],
        });

        const sentenceAudio = transcriptionResponse?.words
            ? {
                audioBase64,
                words: transcriptionResponse.words.map(x => x.word),
                wtimes: transcriptionResponse.words.map(x => 1000 * x.start - 150),
                wdurations: transcriptionResponse.words.map(x => 1000 * (x.end - x.start)),
            }
            : { audioBase64 };

        return {
            userId: req.session?.params?.id || null,
            nodeId: nodeData.nodeId,
            dialogue: sentence,
            audio: sentenceAudio,
            input: nodeData.input || null,
            options: nodeData.options || [],
            url: nodeData.url || null,
            progressInterview: nodeData.progressInterview || null,
            type: chunkType,
            wholeDialogue: nodeData.wholeDialogue
        };
    } catch (error) {
        console.error("Error processing sentence:", error);
        return { error: `Failed to process sentence: ${sentence}` };
    } finally {
        // Cleanup: Delete all created audio files
        for (const filePath of createdFiles) {
            try {
                await fs.promises.unlink(filePath);
                // console.log(`Deleted file: ${filePath}`);
            } catch (cleanupError) {
                console.error(`Failed to delete file: ${filePath}`, cleanupError);
            }
        }
    }
}

async function respondWithChatGPT(messages) {
    try {
        //  console.log("MESSAGES : ")
        // console.log(messages);

        // Make the API call with the messages array
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-4o-mini",
        });

        // Return only the text content
        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error generating dialogue with ChatGPT:', error);
        throw new Error('Failed to generate dialogue.');
    }
}

function splitTextIntoSentences(text) {
    // Modern approach using Intl.Segmenter
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
        return Array.from(segmenter.segment(text), segment => segment.segment);
    }

    // Fallback for environments without Intl.Segmenter
    return text.match(/[^.!?]+[.!?]+/g) || [text];
}

module.exports = router;